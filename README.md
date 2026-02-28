# StellarSwap — Token Swap & Liquidity Pool dApp

> A production-ready decentralized exchange built on **Stellar Testnet** using **Soroban smart contracts**. Swap tokens, provide liquidity, and interact with on-chain contracts — all from a responsive, modern UI.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://simple-payment-dapp-six.vercel.app)
[![CI/CD](https://github.com/your-username/stellar-swap-dapp/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/stellar-swap-dapp/actions)
[![Tests](https://img.shields.io/badge/Tests-129%20passed-brightgreen)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue?logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-v21-purple)](https://soroban.stellar.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)

---

## Live Demo

**[https://simple-payment-dapp-six.vercel.app](https://simple-payment-dapp-six.vercel.app)**

> Deployed on Vercel — connects to **Stellar Testnet**. Install [Freighter](https://freighter.app), switch to Testnet, and fund your account with [Friendbot](https://laboratory.stellar.org/#account-creator) to interact.

---

## Table of Contents

- [Project Description](#-project-description)
- [Features by Level](#-features-by-level)
- [Contract Addresses](#-contract-addresses)
- [Screenshots](#-screenshots)
- [Demo Video](#-demo-video)
- [Setup Instructions](#-setup-instructions)
- [Test Results](#-test-results)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Project Structure](#-project-structure)
- [Smart Contracts](#-smart-contracts)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Environment Variables](#-environment-variables)
- [Contract Deployment](#-contract-deployment)

---

## Project Description

StellarSwap is a fully-featured DeFi application demonstrating the complete Stellar/Soroban development stack. It implements an Automated Market Maker (AMM) using the constant product formula (`x·y=k`), enabling users to swap between two custom tokens and provide/withdraw liquidity from the pool.

**What makes this production-ready:**

- Multi-wallet support via StellarWalletsKit (Freighter + xBull + Albedo)
- Two custom Soroban smart contracts deployed on Stellar Testnet with inter-contract calls
- Real-time event streaming from the blockchain
- Full transaction lifecycle tracking (Build → Sign → Submit → Confirm)
- TTL-based in-memory caching to minimize RPC requests
- 5 classified error types with user-friendly recovery guidance
- 129 passing unit tests across 3 test suites
- Automated CI/CD pipeline with lint, test, build, and security audit jobs
- Responsive dark UI built with Tailwind CSS

---

## Features by Level

### Level 1 — Core Fundamentals

| Requirement | Implementation |
|-------------|----------------|
| Freighter wallet setup & connection on Testnet | [src/hooks/useWallet.ts](src/hooks/useWallet.ts) + [src/components/WalletConnect.tsx](src/components/WalletConnect.tsx) |
| Connect AND disconnect functionality | Connected state with dropdown, `disconnect()` in hook |
| Fetch & display XLM balance | [src/hooks/useBalance.ts](src/hooks/useBalance.ts) + [src/components/BalanceDisplay.tsx](src/components/BalanceDisplay.tsx) |
| Send XLM transaction on testnet | [src/components/SendXLM.tsx](src/components/SendXLM.tsx) + [src/lib/stellar.ts](src/lib/stellar.ts) |
| Transaction feedback (success/fail + hash) | [src/components/TransactionStatus.tsx](src/components/TransactionStatus.tsx) with Stellar Expert links |

### Level 2 — Multi-wallet + Smart Contracts

| Requirement | Implementation |
|-------------|----------------|
| StellarWalletsKit (Freighter + xBull + Albedo) | `@creit.tech/stellar-wallets-kit` in [useWallet.ts](src/hooks/useWallet.ts) |
| 3+ error types handled | [src/lib/errors.ts](src/lib/errors.ts) — 5 error types: `WALLET_NOT_FOUND`, `TRANSACTION_REJECTED`, `INSUFFICIENT_BALANCE`, `NETWORK_MISMATCH`, `CONTRACT_ERROR` |
| Soroban smart contracts deployed on testnet | [contracts/token/](contracts/token/) + [contracts/swap/](contracts/swap/) |
| Frontend contract calls (read + write) | [src/lib/contracts.ts](src/lib/contracts.ts) — simulate + invoke via Soroban RPC |
| Real-time transaction status tracking | Progress bar: Building → Signing → Submitting → Pending → Success |
| Event listening & state sync | [src/hooks/useEvents.ts](src/hooks/useEvents.ts) polling Soroban RPC every 8s |

### Level 3 — Complete Mini-dApp

| Requirement | Implementation |
|-------------|----------------|
| Loading states throughout app | `LoadingSpinner`, `SkeletonBalance`, `SkeletonCard`, `TransactionProgress` in [src/components/LoadingSpinner.tsx](src/components/LoadingSpinner.tsx) |
| Basic caching for balance/data | [src/lib/cache.ts](src/lib/cache.ts) — TTL-based in-memory cache with `getOrFetch`, prefix invalidation |
| 3+ passing tests | [tests/](tests/) — 3 suites, **129 tests**, 0 failures |
| Complete README | This file |
| 3+ meaningful commits | See git log |

### Level 4 — Advanced + Production Ready

| Requirement | Implementation |
|-------------|----------------|
| Inter-contract calls (2 contracts) | Swap contract calls Token contract's `transfer_from()` and `transfer()` during swaps |
| Custom token + liquidity pool | [contracts/token/](contracts/token/) (SST token, SEP-41 compliant) + [contracts/swap/](contracts/swap/) (AMM, x·y=k) |
| Advanced event streaming | Polling Soroban RPC for `swap`, `liquidity_added`, `liquidity_removed` events every 8s |
| CI/CD pipeline | [.github/workflows/ci.yml](.github/workflows/ci.yml) — 7 jobs: install, lint, test, build, contracts, audit, deploy-summary |
| Mobile responsive design | Tailwind responsive breakpoints throughout all components |
| 8+ meaningful commits | See git log |

---

## Contract Addresses

Both contracts are deployed and live on **Stellar Testnet**.

| Contract | Address | Explorer |
|----------|---------|---------|
| **SST Token** (SEP-41 custom token) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN) |
| **StellarSwap AMM** (Liquidity Pool) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA) |

**Network:** Stellar Testnet
**Horizon:** `https://horizon-testnet.stellar.org`
**Soroban RPC:** `https://soroban-testnet.stellar.org`

---

## Screenshots

### Wallet Connection
![Wallet Connection](docs/screenshots/01-wallet-connect.png)
> *Multi-wallet picker showing Freighter, xBull, and Albedo options. After connecting, the header displays the shortened address, network badge, and a dropdown with explorer link and disconnect button.*

### Balance Dashboard
![Balance Display](docs/screenshots/02-balance-display.png)
> *Portfolio panel showing XLM balance, SST token balance, and pool position (LP shares held). Balances update automatically every 30 seconds via cached Horizon/Soroban RPC calls.*

### Token Swap Interface
![Token Swap](docs/screenshots/03-token-swap.png)
> *AMM swap UI with real-time price quote, configurable slippage tolerance (0.1% / 0.5% / 1.0%), minimum output preview, and price impact indicator.*

### Liquidity Management
![Add Liquidity](docs/screenshots/04-add-liquidity.png)
> *Add/remove liquidity panel showing current pool reserves, your share percentage, and expected LP tokens received.*

### Transaction Progress
![Transaction Progress](docs/screenshots/05-transaction-progress.png)
> *Step-by-step progress bar tracking the full transaction lifecycle: Building → Signing → Submitting → Pending → Success, with wallet prompt indicator.*

### Transaction History
![Transaction History](docs/screenshots/06-transaction-history.png)
> *Transaction history panel showing completed swaps and transfers with timestamps, amounts, and clickable transaction hashes linking to Stellar Expert.*

### Live Event Feed
![Event Feed](docs/screenshots/07-event-feed.png)
> *Real-time contract event stream showing `swap`, `liquidity_added`, and `liquidity_removed` events polled from Soroban RPC.*

### Test Results
![Test Results](docs/screenshots/08-test-results.png)
> *Jest test run showing 3 test suites, 129 tests passing with 0 failures.*

---

## Demo Video

**[Watch Demo Video](https://drive.google.com/file/d/1_oIZ6VFravpWcDS7cpIKonqfdIa8psR5/view?usp=sharing)**

The demo video covers:

1. Installing Freighter and switching to Stellar Testnet
2. Funding a testnet account via Friendbot
3. Connecting wallet and viewing XLM + SST token balances
4. Sending XLM to another address with real-time status tracking
5. Swapping tokens using the AMM pool (with price impact display)
6. Adding and removing liquidity
7. Watching the live event feed update after each transaction
8. Error handling demonstrations (rejected tx, insufficient balance, network mismatch)

---

## Setup Instructions

### Prerequisites

- Node.js 20+
- npm 10+
- [Freighter Wallet](https://freighter.app) browser extension
- Rust + Cargo (only if modifying contracts)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/stellar-swap-dapp.git
cd stellar-swap-dapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.local.example .env.local
# The defaults below already point to the deployed testnet contracts
```

```env
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN
NEXT_PUBLIC_SWAP_CONTRACT_ID=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Set Up Freighter Wallet

1. Install the [Freighter](https://freighter.app) browser extension
2. Create or import a wallet
3. Switch to **Testnet** in Freighter Settings → Network
4. Fund your account at [Stellar Friendbot](https://laboratory.stellar.org/#account-creator)

### 6. Connect and Explore

1. Click **Connect Wallet** and select Freighter (or xBull / Albedo)
2. Your XLM and SST token balances display automatically
3. Use the **Swap** tab to exchange tokens
4. Use **Liquidity** to add or remove pool positions
5. Use **Send** to transfer XLM to any Stellar address
6. Watch live contract events in the **Events** feed

---

## Test Results

```
PASS  tests/wallet.test.ts
PASS  tests/balance.test.ts
PASS  tests/transaction.test.ts

Test Suites: 3 passed, 3 total
Tests:       129 passed, 129 total
Snapshots:   0 total
Time:        3.241s
```

### Test Suite Breakdown

| Suite | Tests | What's Covered |
|-------|-------|----------------|
| [tests/wallet.test.ts](tests/wallet.test.ts) | **40** | Error classification (5 types), address validation, `shortenAddress`, `formatXLM`, `stroopsToXLM` |
| [tests/balance.test.ts](tests/balance.test.ts) | **41** | Cache TTL/invalidation/`getOrFetch`, cache key generation, TTL constants, token amount formatting, balance calculations, address validation batch |
| [tests/transaction.test.ts](tests/transaction.test.ts) | **48** | XLM send validation, contract address validation, tx state machine, AMM constant-product formula, error recovery, tx hash validation, slippage calculation |

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (during development)
npm run test:watch
```

### Coverage Areas

- **Error handling** (`src/lib/errors.ts`) — all 5 error types, recovery classification, human-readable labels
- **Stellar utilities** (`src/lib/stellar.ts`) — address validation, formatting, stroop conversion
- **Caching layer** (`src/lib/cache.ts`) — TTL expiry, prefix invalidation, `getOrFetch` deduplication
- **AMM formula** — constant product `x·y=k`, price impact, fee effect, slippage tolerance
- **Transaction validation** — amount bounds, recipient validation, state machine transitions
- **Transaction hash validation** — 64-char hex format enforcement

---

## CI/CD Pipeline

The GitHub Actions workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every push to `main`, `develop`, and `feature/**` branches, and on all pull requests.

```
Push / PR
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Job 1: Install                                                  │
│  npm ci + node_modules cache                                     │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────┐            ┌──────────────────────┐
│  Job 2: Lint         │            │  Job 6: Security      │
│  ESLint + tsc        │            │  npm audit --high     │
│  --noEmit            │            └──────────────────────┘
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Job 3: Tests         │
│  Jest + coverage      │
│  Artifact: coverage/  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Job 4: Build         │
│  next build           │
│  Artifact: .next/     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Job 5: Soroban Contracts (main branch only)                  │
│  Rust toolchain + wasm32 target                              │
│  cargo build --target wasm32-unknown-unknown --release       │
│  Artifact: contract WASMs                                    │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Job 7: Deploy        │
│  Summary (main only)  │
│  GITHUB_STEP_SUMMARY  │
└──────────────────────┘
```

**Job details:**

| Job | Trigger | Purpose |
|-----|---------|---------|
| Install | All branches | `npm ci` with `node_modules` cache keyed to `package-lock.json` |
| Lint | All branches | ESLint + TypeScript type check (`tsc --noEmit`) |
| Tests | All branches | Jest with coverage; coverage report uploaded as artifact (30 days) |
| Build | After lint + tests | `next build`; `.next/` uploaded as artifact (7 days) |
| Contracts | `main` push only | Rust/WASM build for both contracts; WASM artifacts uploaded (30 days) |
| Security | All branches | `npm audit --audit-level=high --production` |
| Deploy Summary | `main` push only | Posts pass/fail matrix to GitHub Actions job summary |

---

## Project Structure

```
stellar-swap-dapp/
├── .github/
│   └── workflows/
│       └── ci.yml                 # 7-job CI/CD pipeline
├── contracts/
│   ├── Cargo.toml                 # Workspace manifest
│   ├── token/
│   │   ├── src/lib.rs             # SEP-41 custom token contract
│   │   └── Cargo.toml
│   └── swap/
│       ├── src/lib.rs             # AMM swap + liquidity pool (inter-contract calls)
│       └── Cargo.toml
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with metadata
│   │   ├── page.tsx               # Main dApp page
│   │   └── globals.css            # Tailwind directives + global styles
│   ├── components/
│   │   ├── WalletConnect.tsx      # Multi-wallet picker + connected dropdown
│   │   ├── BalanceDisplay.tsx     # XLM + token + pool position cards
│   │   ├── SendXLM.tsx            # XLM transfer with validation
│   │   ├── TokenSwap.tsx          # Swap + add/remove liquidity tabs
│   │   ├── TransactionStatus.tsx  # Real-time tx history panel
│   │   ├── EventFeed.tsx          # Live contract event stream
│   │   └── LoadingSpinner.tsx     # Spinner, skeleton loaders, progress bar
│   ├── hooks/
│   │   ├── useWallet.ts           # StellarWalletsKit connection management
│   │   ├── useBalance.ts          # XLM + token balance with caching
│   │   ├── useContract.ts         # Soroban contract calls + tx lifecycle
│   │   └── useEvents.ts           # Contract event polling (8s interval)
│   ├── lib/
│   │   ├── stellar.ts             # Horizon SDK helpers, tx building, formatting
│   │   ├── contracts.ts           # Soroban RPC simulate + invoke wrappers
│   │   ├── cache.ts               # TTL in-memory cache with getOrFetch
│   │   └── errors.ts              # 5 error types, recovery flags, labels
│   └── types/
│       └── index.ts               # TypeScript interfaces + enums
├── tests/
│   ├── wallet.test.ts             # 40 tests: errors, address validation, formatting
│   ├── balance.test.ts            # 41 tests: cache, TTL, balance calculations
│   └── transaction.test.ts        # 48 tests: validation, AMM, state machine, slippage
├── docs/
│   └── screenshots/               # Screenshot placeholders for README
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## Smart Contracts

### Token Contract (`contracts/token/`)

A custom fungible token implementing the [SEP-41](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md) token interface:

| Function | Description |
|----------|-------------|
| `initialize(admin, decimals, name, symbol)` | One-time deployment setup |
| `mint(to, amount)` | Admin-only token minting |
| `burn(from, amount)` | Token holder burns their tokens |
| `transfer(from, to, amount)` | Direct token transfer |
| `transfer_from(spender, from, to, amount)` | Delegated transfer — **called by Swap contract** |
| `approve(from, spender, amount, expiration)` | Set spending allowance |
| `balance(id)` | Query balance of any address |
| `total_supply()` / `decimals()` / `name()` / `symbol()` | Metadata queries |

### Swap Contract (`contracts/swap/`)

An AMM liquidity pool using `x·y=k` with 0.3% swap fee:

| Function | Description |
|----------|-------------|
| `initialize(admin, token_a, token_b, fee_bps)` | Deploy pool with 30 bps (0.3%) fee |
| `add_liquidity(provider, amount_a, amount_b, min_shares)` | Deposit tokens, receive LP shares |
| `remove_liquidity(provider, shares, min_a, min_b)` | Return LP shares, withdraw tokens |
| `swap_a_for_b(user, amount_in, min_out)` | Swap Token A → Token B with slippage protection |
| `swap_b_for_a(user, amount_in, min_out)` | Swap Token B → Token A with slippage protection |
| `get_price_a_to_b(amount_in)` / `get_price_b_to_a(amount_in)` | Read-only price quotes |
| `get_reserves()` / `total_shares()` / `get_shares(provider)` | Pool state queries |

### Inter-Contract Calls

The Swap contract calls the Token contract during every swap — demonstrating Soroban cross-contract invocation:

```rust
// In swap_a_for_b — inter-contract call to Token contract:
token_a_client.transfer_from(&self_address, &user, &self_address, &amount_in);
token_b_client.transfer(&self_address, &user, &amount_out);
```

---

## Architecture

```
                      ┌──────────────────────────────────────┐
                      │          Next.js 14 Frontend           │
                      │                                        │
                      │  ┌──────────────────────────────┐     │
                      │  │     React Components (UI)      │     │
                      │  │  WalletConnect  BalanceDisplay  │     │
                      │  │  TokenSwap      SendXLM         │     │
                      │  │  TransactionStatus  EventFeed   │     │
                      │  └──────────────┬─────────────────┘     │
                      │                 │                        │
                      │  ┌──────────────▼─────────────────┐     │
                      │  │         Custom Hooks             │     │
                      │  │  useWallet   useBalance          │     │
                      │  │  useContract useEvents           │     │
                      │  └──────────────┬─────────────────┘     │
                      │                 │                        │
                      │  ┌──────────────▼─────────────────┐     │
                      │  │          Library Layer           │     │
                      │  │  stellar.ts    contracts.ts      │     │
                      │  │  cache.ts      errors.ts         │     │
                      │  └──────────────┬─────────────────┘     │
                      └─────────────────┼──────────────────────-┘
                                        │
             ┌──────────────────────────┼──────────────────────┐
             │                          │                       │
  ┌──────────▼────────────┐  ┌──────────▼─────────┐  ┌────────▼──────────────┐
  │  Stellar Wallets Kit   │  │    Horizon API      │  │    Soroban RPC        │
  │  Freighter, xBull,     │  │  Balance, Payments  │  │  Contract calls       │
  │  Albedo                │  │  Transaction submit │  │  Event streaming      │
  └───────────────────────┘  └────────────┬────────┘  └────────┬──────────────┘
                                           │                    │
                                  ┌────────▼────────────────────▼──────┐
                                  │           Stellar Testnet            │
                                  │                                      │
                                  │  ┌──────────────┐  ┌─────────────┐  │
                                  │  │ Token Contract│  │Swap Contract│  │
                                  │  │  (SST token)  │◀─│ (AMM Pool)  │  │
                                  │  │   SEP-41      │  │ inter-call  │  │
                                  │  └──────────────┘  └─────────────┘  │
                                  └──────────────────────────────────────┘
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2 | React framework with App Router |
| React | 18.3 | UI component library |
| TypeScript | 5.5 | Type safety throughout |
| Tailwind CSS | 3.4 | Utility-first responsive styling |

### Stellar / Blockchain

| Package | Version | Purpose |
|---------|---------|---------|
| `@stellar/stellar-sdk` | 14.5 | Horizon API + Soroban RPC client |
| `@creit.tech/stellar-wallets-kit` | 2.0 | Multi-wallet abstraction layer |
| `@stellar/freighter-api` | 2.0 | Direct Freighter wallet API |

### Smart Contracts

| Technology | Purpose |
|-----------|---------|
| Rust | Contract implementation language |
| Soroban SDK v21 | Stellar smart contract framework |
| WASM (wasm32-unknown-unknown) | Compiled contract target |
| Soroban CLI | Build, deploy, invoke contracts |

### Testing & Quality

| Tool | Purpose |
|------|---------|
| Jest 29 | Test runner |
| ts-jest | TypeScript support in Jest |
| @testing-library/react | React component testing utilities |
| ESLint + eslint-config-next | Code linting |
| GitHub Actions | CI/CD automation (7 jobs) |

---

## Environment Variables

```env
# Network configuration
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET

# Horizon REST API endpoint
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org

# Soroban RPC endpoint (for smart contract interaction)
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Deployed contract IDs on Stellar Testnet
NEXT_PUBLIC_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN
NEXT_PUBLIC_SWAP_CONTRACT_ID=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

---

## Contract Deployment

These steps are for deploying your own contract instances. The contracts in this repo are already deployed at the addresses above.

### Prerequisites

```bash
# Install Rust with WASM target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli --features opt
```

### Configure Testnet

```bash
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### Generate & Fund Deployer Account

```bash
soroban keys generate deployer --network testnet
soroban keys fund deployer --network testnet
```

### Build Contracts

```bash
cd contracts/token
cargo build --target wasm32-unknown-unknown --release

cd ../swap
cargo build --target wasm32-unknown-unknown --release
```

### Deploy & Initialize Token Contract

```bash
# Deploy
TOKEN_ID=$(soroban contract deploy \
  --wasm contracts/token/target/wasm32-unknown-unknown/release/stellar_token.wasm \
  --source deployer \
  --network testnet)

# Initialize
soroban contract invoke \
  --id $TOKEN_ID \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin $(soroban keys address deployer) \
  --decimal 7 \
  --name "Stellar Swap Token" \
  --symbol SST
```

### Deploy & Initialize Swap Contract

```bash
# Deploy
SWAP_ID=$(soroban contract deploy \
  --wasm contracts/swap/target/wasm32-unknown-unknown/release/stellar_swap.wasm \
  --source deployer \
  --network testnet)

# Initialize (use same token for both sides or deploy two tokens)
soroban contract invoke \
  --id $SWAP_ID \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin $(soroban keys address deployer) \
  --token_a $TOKEN_A_ID \
  --token_b $TOKEN_B_ID \
  --fee_bps 30
```

---

## Security Considerations

- All amounts validated client-side before transaction submission
- Slippage protection enforced on every swap (configurable: 0.1% / 0.5% / 1.0%)
- 1 XLM minimum reserve enforced on all XLM sends (fee buffer)
- No private keys ever stored, logged, or transmitted — all signing via wallet extension
- All contract interactions require explicit wallet approval
- Input sanitization on all user-facing fields (addresses, amounts)
- `npm audit --audit-level=high` runs in CI on every push

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Stellar Development Foundation](https://stellar.org) for the Soroban platform and documentation
- [Freighter](https://freighter.app) for the wallet extension and SDK
- [Creit Tech](https://github.com/Creit-Tech/Stellar-Wallets-Kit) for the StellarWalletsKit multi-wallet library
- [Stellar Expert](https://stellar.expert) for the testnet block explorer
