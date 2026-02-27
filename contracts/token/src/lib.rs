//! Stellar Custom Token Contract (SEP-41 / SAC Compatible)
//!
//! This contract implements a custom fungible token on Stellar/Soroban.
//! It supports minting, burning, transferring, and allowance mechanisms.
//! The swap contract interacts with this contract via inter-contract calls.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token::{self, Interface as _},
    Address, Env, String, Symbol,
};

// Storage keys for contract state
#[contracttype]
pub enum DataKey {
    Admin,
    Balance(Address),
    Allowance(Address, Address),
    TotalSupply,
    Name,
    Symbol,
    Decimals,
}

// Events emitted by the contract
const MINT_EVENT: Symbol = symbol_short!("mint");
const BURN_EVENT: Symbol = symbol_short!("burn");
const TRANSFER_EVENT: Symbol = symbol_short!("transfer");
const APPROVE_EVENT: Symbol = symbol_short!("approve");

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    /// Initialize the token contract with name, symbol, decimals and initial supply
    pub fn initialize(
        env: Env,
        admin: Address,
        decimal: u32,
        name: String,
        symbol: String,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Decimals, &decimal);
        env.storage().instance().set(&DataKey::TotalSupply, &0_i128);
    }

    /// Mint new tokens to an address (admin only)
    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(balance + amount));

        let total_supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(total_supply + amount));

        env.events().publish((MINT_EVENT, &to), amount);
    }

    /// Burn tokens from the caller's balance
    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let balance = Self::balance(env.clone(), from.clone());
        if balance < amount {
            panic!("insufficient balance");
        }

        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(balance - amount));

        let total_supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(total_supply - amount));

        env.events().publish((BURN_EVENT, &from), amount);
    }

    /// Burn tokens from an allowance
    pub fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();

        let allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        if allowance < amount {
            panic!("insufficient allowance");
        }

        env.storage().persistent().set(
            &DataKey::Allowance(from.clone(), spender.clone()),
            &(allowance - amount),
        );

        let balance = Self::balance(env.clone(), from.clone());
        if balance < amount {
            panic!("insufficient balance");
        }

        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(balance - amount));

        let total_supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(total_supply - amount));

        env.events().publish((BURN_EVENT, &from), amount);
    }

    /// Transfer tokens from sender to recipient (called by swap contract)
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let from_balance = Self::balance(env.clone(), from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }

        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_balance - amount));

        let to_balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(to_balance + amount));

        env.events()
            .publish((TRANSFER_EVENT, &from, &to), amount);
    }

    /// Transfer tokens from an allowance (inter-contract call from swap)
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();

        let allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        if allowance < amount {
            panic!("insufficient allowance");
        }

        env.storage().persistent().set(
            &DataKey::Allowance(from.clone(), spender.clone()),
            &(allowance - amount),
        );

        let from_balance = Self::balance(env.clone(), from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }

        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_balance - amount));

        let to_balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(to_balance + amount));

        env.events()
            .publish((TRANSFER_EVENT, &from, &to), amount);
    }

    /// Approve a spender to use tokens on behalf of the owner
    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();

        if expiration_ledger < env.ledger().sequence() {
            panic!("expiration_ledger must be in the future");
        }

        env.storage().persistent().set(
            &DataKey::Allowance(from.clone(), spender.clone()),
            &amount,
        );
        env.storage().persistent().set_ttl(
            &DataKey::Allowance(from.clone(), spender.clone()),
            expiration_ledger - env.ledger().sequence(),
            expiration_ledger - env.ledger().sequence(),
        );

        env.events()
            .publish((APPROVE_EVENT, &from, &spender), (amount, expiration_ledger));
    }

    /// Get balance of an address
    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    /// Get allowance for spender from owner
    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(from, spender))
            .unwrap_or(0)
    }

    /// Get token decimals
    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Decimals)
            .unwrap_or(7)
    }

    /// Get token name
    pub fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .unwrap_or_else(|| String::from_str(&env, "Stellar Swap Token"))
    }

    /// Get token symbol
    pub fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .unwrap_or_else(|| String::from_str(&env, "SST"))
    }

    /// Get total supply
    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    /// Get admin address
    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Set a new admin (current admin only)
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }
}
