//! Stellar Swap & Liquidity Pool Contract
//!
//! This contract implements an AMM (Automated Market Maker) style liquidity pool
//! that interacts with the Token contract via inter-contract calls.
//! It uses the constant product formula: x * y = k
//!
//! Inter-contract calls:
//! - Calls token_a.transfer_from() to move tokens during swaps
//! - Calls token_b.transfer_from() to move tokens during swaps
//! - Calls token_a.transfer() to send tokens to liquidity providers
//! - Calls token_b.transfer() to send tokens to liquidity providers

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol,
};

// Storage keys
#[contracttype]
pub enum DataKey {
    Admin,
    TokenA,
    TokenB,
    ReserveA,
    ReserveB,
    TotalShares,
    Shares(Address),
    Fee,
}

// Pool event topics
const SWAP_EVENT: Symbol = symbol_short!("swap");
const ADD_LIQ: Symbol = symbol_short!("add_liq");
const REM_LIQ: Symbol = symbol_short!("rem_liq");

// Token contract client - used for inter-contract calls
mod token_contract {
    soroban_sdk::contractimport!(
        file = "../token/target/wasm32-unknown-unknown/release/stellar_token.wasm"
    );
}

/// Swap event data
#[contracttype]
pub struct SwapEvent {
    pub user: Address,
    pub token_in: Address,
    pub token_out: Address,
    pub amount_in: i128,
    pub amount_out: i128,
}

/// Liquidity event data
#[contracttype]
pub struct LiquidityEvent {
    pub provider: Address,
    pub amount_a: i128,
    pub amount_b: i128,
    pub shares: i128,
}

#[contract]
pub struct SwapContract;

#[contractimpl]
impl SwapContract {
    /// Initialize the swap pool with two token contracts
    pub fn initialize(
        env: Env,
        admin: Address,
        token_a: Address,
        token_b: Address,
        fee_bps: u32, // fee in basis points (e.g., 30 = 0.3%)
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenA, &token_a);
        env.storage().instance().set(&DataKey::TokenB, &token_b);
        env.storage().instance().set(&DataKey::ReserveA, &0_i128);
        env.storage().instance().set(&DataKey::ReserveB, &0_i128);
        env.storage().instance().set(&DataKey::TotalShares, &0_i128);
        env.storage().instance().set(&DataKey::Fee, &fee_bps);
    }

    /// Add liquidity to the pool - makes inter-contract calls to both token contracts
    pub fn add_liquidity(
        env: Env,
        provider: Address,
        amount_a: i128,
        amount_b: i128,
        min_shares: i128,
    ) -> i128 {
        provider.require_auth();

        if amount_a <= 0 || amount_b <= 0 {
            panic!("amounts must be positive");
        }

        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
        let total_shares: i128 = env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0);

        // Calculate shares to mint
        let shares = if total_shares == 0 {
            // Initial liquidity - use geometric mean
            Self::sqrt(amount_a * amount_b)
        } else {
            // Proportional shares
            let shares_a = amount_a * total_shares / reserve_a;
            let shares_b = amount_b * total_shares / reserve_b;
            shares_a.min(shares_b)
        };

        if shares < min_shares {
            panic!("insufficient shares minted");
        }

        // Inter-contract call: transfer token A from provider to this contract
        let token_a_client = token_contract::Client::new(&env, &token_a);
        token_a_client.transfer_from(
            &env.current_contract_address(),
            &provider,
            &env.current_contract_address(),
            &amount_a,
        );

        // Inter-contract call: transfer token B from provider to this contract
        let token_b_client = token_contract::Client::new(&env, &token_b);
        token_b_client.transfer_from(
            &env.current_contract_address(),
            &provider,
            &env.current_contract_address(),
            &amount_b,
        );

        // Update reserves
        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &(reserve_a + amount_a));
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &(reserve_b + amount_b));
        env.storage()
            .instance()
            .set(&DataKey::TotalShares, &(total_shares + shares));

        // Update provider's shares
        let provider_shares: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Shares(provider.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::Shares(provider.clone()), &(provider_shares + shares));

        // Emit liquidity event
        env.events().publish(
            (ADD_LIQ, &provider),
            LiquidityEvent {
                provider: provider.clone(),
                amount_a,
                amount_b,
                shares,
            },
        );

        shares
    }

    /// Remove liquidity from the pool
    pub fn remove_liquidity(
        env: Env,
        provider: Address,
        shares: i128,
        min_amount_a: i128,
        min_amount_b: i128,
    ) -> (i128, i128) {
        provider.require_auth();

        if shares <= 0 {
            panic!("shares must be positive");
        }

        let provider_shares: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Shares(provider.clone()))
            .unwrap_or(0);

        if provider_shares < shares {
            panic!("insufficient shares");
        }

        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
        let total_shares: i128 = env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0);

        let amount_a = shares * reserve_a / total_shares;
        let amount_b = shares * reserve_b / total_shares;

        if amount_a < min_amount_a || amount_b < min_amount_b {
            panic!("slippage exceeded");
        }

        // Update state
        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &(reserve_a - amount_a));
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &(reserve_b - amount_b));
        env.storage()
            .instance()
            .set(&DataKey::TotalShares, &(total_shares - shares));
        env.storage()
            .persistent()
            .set(&DataKey::Shares(provider.clone()), &(provider_shares - shares));

        // Inter-contract call: transfer token A back to provider
        let token_a_client = token_contract::Client::new(&env, &token_a);
        token_a_client.transfer(&env.current_contract_address(), &provider, &amount_a);

        // Inter-contract call: transfer token B back to provider
        let token_b_client = token_contract::Client::new(&env, &token_b);
        token_b_client.transfer(&env.current_contract_address(), &provider, &amount_b);

        // Emit event
        env.events().publish(
            (REM_LIQ, &provider),
            LiquidityEvent {
                provider: provider.clone(),
                amount_a,
                amount_b,
                shares,
            },
        );

        (amount_a, amount_b)
    }

    /// Swap token A for token B (inter-contract calls to token contracts)
    pub fn swap_a_for_b(
        env: Env,
        user: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> i128 {
        user.require_auth();

        if amount_in <= 0 {
            panic!("amount must be positive");
        }

        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
        let fee_bps: u32 = env.storage().instance().get(&DataKey::Fee).unwrap_or(30);

        if reserve_a == 0 || reserve_b == 0 {
            panic!("pool has no liquidity");
        }

        // Calculate amount out using constant product formula with fee
        let amount_out = Self::get_amount_out(amount_in, reserve_a, reserve_b, fee_bps);

        if amount_out < min_amount_out {
            panic!("slippage exceeded");
        }

        // Inter-contract call: transfer token A from user to pool
        let token_a_client = token_contract::Client::new(&env, &token_a);
        token_a_client.transfer_from(
            &env.current_contract_address(),
            &user,
            &env.current_contract_address(),
            &amount_in,
        );

        // Update reserves
        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &(reserve_a + amount_in));
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &(reserve_b - amount_out));

        // Inter-contract call: transfer token B to user
        let token_b_client = token_contract::Client::new(&env, &token_b);
        token_b_client.transfer(&env.current_contract_address(), &user, &amount_out);

        // Emit swap event
        env.events().publish(
            (SWAP_EVENT, &user),
            SwapEvent {
                user: user.clone(),
                token_in: token_a,
                token_out: token_b,
                amount_in,
                amount_out,
            },
        );

        amount_out
    }

    /// Swap token B for token A
    pub fn swap_b_for_a(
        env: Env,
        user: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> i128 {
        user.require_auth();

        if amount_in <= 0 {
            panic!("amount must be positive");
        }

        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
        let fee_bps: u32 = env.storage().instance().get(&DataKey::Fee).unwrap_or(30);

        if reserve_a == 0 || reserve_b == 0 {
            panic!("pool has no liquidity");
        }

        let amount_out = Self::get_amount_out(amount_in, reserve_b, reserve_a, fee_bps);

        if amount_out < min_amount_out {
            panic!("slippage exceeded");
        }

        // Inter-contract call: transfer token B from user to pool
        let token_b_client = token_contract::Client::new(&env, &token_b);
        token_b_client.transfer_from(
            &env.current_contract_address(),
            &user,
            &env.current_contract_address(),
            &amount_in,
        );

        // Update reserves
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &(reserve_b + amount_in));
        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &(reserve_a - amount_out));

        // Inter-contract call: transfer token A to user
        let token_a_client = token_contract::Client::new(&env, &token_a);
        token_a_client.transfer(&env.current_contract_address(), &user, &amount_out);

        // Emit swap event
        env.events().publish(
            (SWAP_EVENT, &user),
            SwapEvent {
                user: user.clone(),
                token_in: token_b,
                token_out: token_a,
                amount_in,
                amount_out,
            },
        );

        amount_out
    }

    /// Get price quote for swapping amount_in of token A for token B
    pub fn get_price_a_to_b(env: Env, amount_in: i128) -> i128 {
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
        let fee_bps: u32 = env.storage().instance().get(&DataKey::Fee).unwrap_or(30);

        if reserve_a == 0 || reserve_b == 0 {
            return 0;
        }

        Self::get_amount_out(amount_in, reserve_a, reserve_b, fee_bps)
    }

    /// Get price quote for swapping amount_in of token B for token A
    pub fn get_price_b_to_a(env: Env, amount_in: i128) -> i128 {
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
        let fee_bps: u32 = env.storage().instance().get(&DataKey::Fee).unwrap_or(30);

        if reserve_a == 0 || reserve_b == 0 {
            return 0;
        }

        Self::get_amount_out(amount_in, reserve_b, reserve_a, fee_bps)
    }

    /// Get pool reserves
    pub fn get_reserves(env: Env) -> (i128, i128) {
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
        (reserve_a, reserve_b)
    }

    /// Get total shares
    pub fn total_shares(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0)
    }

    /// Get shares for a provider
    pub fn get_shares(env: Env, provider: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Shares(provider))
            .unwrap_or(0)
    }

    /// Get token addresses
    pub fn get_tokens(env: Env) -> (Address, Address) {
        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();
        (token_a, token_b)
    }

    /// Get pool fee in basis points
    pub fn get_fee(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Fee).unwrap_or(30)
    }

    // ---- Private helper functions ----

    /// Constant product AMM formula with fee
    /// amount_out = (amount_in * (10000 - fee_bps) * reserve_out) /
    ///              (reserve_in * 10000 + amount_in * (10000 - fee_bps))
    fn get_amount_out(amount_in: i128, reserve_in: i128, reserve_out: i128, fee_bps: u32) -> i128 {
        let fee_factor = (10000 - fee_bps) as i128;
        let amount_in_with_fee = amount_in * fee_factor;
        let numerator = amount_in_with_fee * reserve_out;
        let denominator = reserve_in * 10000 + amount_in_with_fee;
        numerator / denominator
    }

    /// Integer square root using Newton's method
    fn sqrt(y: i128) -> i128 {
        if y < 0 {
            panic!("negative sqrt");
        }
        if y == 0 {
            return 0;
        }
        let mut x = y;
        let mut z = (y + 1) / 2;
        while z < x {
            x = z;
            z = (y / z + z) / 2;
        }
        x
    }
}
