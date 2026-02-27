# 🌊 StellarSwap — Token Swap & Liquidity Pool dApp

> A production-ready decentralized exchange built on **Stellar Testnet** using **Soroban smart contracts**. Swap tokens, provide liquidity, and interact with on-chain contracts — all from a responsive, modern UI.

[![CI/CD](https://github.com/your-username/stellar-swap-dapp/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/stellar-swap-dapp/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue?logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-v21-purple)](https://soroban.stellar.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features by Level](#-features-by-level)
- [Project Structure](#-project-structure)
- [Smart Contracts](#-smart-contracts)
- [Screenshots](#-screenshots)
- [Demo Video](#-demo-video)
- [Setup Instructions](#-setup-instructions)
- [Environment Variables](#-environment-variables)
- [Running Tests](#-running-tests)
- [Contract Deployment](#-contract-deployment)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Tech Stack](#-tech-stack)

---

## 🎯 Overview

StellarSwap is a fully-featured DeFi dApp that demonstrates the complete Stellar/Soroban development stack:

- **Multi-wallet support** via StellarWalletsKit (Freighter + xBull + Albedo)
- **Custom ERC-20-like token** deployed as a Soroban contract
- **AMM Liquidity Pool** using the constant product formula (x·y=k)
- **Inter-contract calls** — the Swap contract calls the Token contract
- **Real-time event streaming** from smart contracts
- **Full transaction lifecycle** tracking (build → sign → submit → confirm)
- **Responsive dark UI** built with Tailwind CSS

---

## 🏆 Features by Level

### ⚪ Level 1 — Core Fundamentals
| Requirement | Implementation |
|-------------|---------------|
| Freighter wallet setup & connection on Testnet | `src/hooks/useWallet.ts` + `src/components/WalletConnect.tsx` |
| Connect AND disconnect functionality | Connected state with dropdown menu, `disconnect()` in hook |
| Fetch & display XLM balance | `src/hooks/useBalance.ts` + `src/components/BalanceDisplay.tsx` |
| Send XLM transaction on testnet | `src/components/SendXLM.tsx` + `src/lib/stellar.ts` |
| Transaction feedback (success/fail + hash) | `src/components/TransactionStatus.tsx` with hash links to explorer |

### 🟡 Level 2 — Multi-wallet + Smart Contracts
| Requirement | Implementation |
|-------------|---------------|
| StellarWalletsKit (Freighter + xBull + Albedo) | `stellar-wallets-kit` in `useWallet.ts` |
| 3+ error types handled | `src/lib/errors.ts` — 5 error types: NOT_FOUND, REJECTED, INSUFFICIENT_BALANCE, NETWORK_MISMATCH, CONTRACT_ERROR |
| Soroban smart contract deployed on testnet | `contracts/token/` + `contracts/swap/` |
| Frontend contract calls (read + write) | `src/lib/contracts.ts` with simulate + invoke |
| Real-time transaction status tracking | Progress bar: Building → Signing → Submitting → Pending → Success |
| Event listening & state sync | `src/hooks/useEvents.ts` polling Soroban RPC |

### 🟠 Level 3 — Complete Mini-dApp
| Requirement | Implementation |
|-------------|---------------|
| Loading states throughout app | `LoadingSpinner`, `SkeletonBalance`, `SkeletonCard`, `TransactionProgress` |
| Basic caching for balance/data | `src/lib/cache.ts` — TTL-based in-memory cache |
| 3+ passing tests | `tests/wallet.test.ts`, `tests/balance.test.ts`, `tests/transaction.test.ts` |
| Complete README | This file |
| 3+ meaningful commits | See git history |

### 🔴 Level 4 — Advanced + Production Ready
| Requirement | Implementation |
|-------------|---------------|
| Inter-contract calls (2 contracts) | Swap contract calls Token contract's `transfer_from()` + `transfer()` |
| Custom token + liquidity pool | `contracts/token/` (SST token) + `contracts/swap/` (AMM pool) |
| Advanced event streaming | Polling Soroban RPC for contract events every 8s |
| CI/CD pipeline | `.github/workflows/ci.yml` — lint, test, build, audit |
| Mobile responsive design | Tailwind responsive breakpoints throughout |
| 8+ meaningful commits | See git history |

---

## 📁 Project Structure

```
stellar-swap-dapp/
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI/CD: lint → test → build
├── contracts/
│   ├── Cargo.toml                 # Workspace manifest
│   ├── token/
│   │   ├── src/lib.rs             # Custom SEP-41 token contract
│   │   └── Cargo.toml
│   └── swap/
│       ├── src/lib.rs             # AMM swap + liquidity pool (calls token contract)
│       └── Cargo.toml
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with metadata
│   │   ├── page.tsx               # Main dApp page (all sections)
│   │   └── globals.css            # Global styles + Tailwind directives
│   ├── components/
│   │   ├── WalletConnect.tsx      # Multi-wallet picker + connected dropdown
│   │   ├── BalanceDisplay.tsx     # XLM + token + pool position display
│   │   ├── SendXLM.tsx            # XLM transfer with validation
│   │   ├── TokenSwap.tsx          # Swap + add/remove liquidity UI
│   │   ├── TransactionStatus.tsx  # Real-time tx history panel
│   │   ├── EventFeed.tsx          # Live contract event stream
│   │   └── LoadingSpinner.tsx     # Spinner, skeleton, progress bar
│   ├── hooks/
│   │   ├── useWallet.ts           # Wallet connection (StellarWalletsKit + Freighter)
│   │   ├── useBalance.ts          # XLM + token balance with caching
│   │   ├── useContract.ts         # Contract interactions + tx management
│   │   └── useEvents.ts           # Contract event polling
│   ├── lib/
│   │   ├── stellar.ts             # Horizon SDK helpers + tx building
│   │   ├── contracts.ts           # Soroban RPC + contract invocation
│   │   ├── cache.ts               # TTL in-memory cache
│   │   └── errors.ts              # 5+ error type classification
│   └── types/
│       └── index.ts               # TypeScript types + enums
├── tests/
│   ├── wallet.test.ts             # Error parsing + address validation tests
│   ├── balance.test.ts            # Cache + balance formatting tests
│   └── transaction.test.ts        # Validation + AMM formula + state machine tests
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## 🔗 Smart Contracts

### Token Contract (`contracts/token/`)
A custom fungible token implementing the SEP-41 interface:
- `initialize(admin, decimals, name, symbol)` — Deploy with metadata
- `mint(to, amount)` — Admin mints tokens
- `burn(from, amount)` — Token holder burns
- `transfer(from, to, amount)` — Token transfer
- `transfer_from(spender, from, to, amount)` — **Called by Swap contract**
- `approve(from, spender, amount, expiration)` — Allowance
- `balance(id)` / `total_supply()` / `decimals()` / `name()` / `symbol()`

### Swap Contract (`contracts/swap/`)
An AMM-style liquidity pool using `x·y=k`:
- `initialize(admin, token_a, token_b, fee_bps)` — Deploy with 0.3% fee
- `add_liquidity(provider, amount_a, amount_b, min_shares)` — Provide liquidity
- `remove_liquidity(provider, shares, min_a, min_b)` — Withdraw
- `swap_a_for_b(user, amount_in, min_out)` — **Calls Token contract**
- `swap_b_for_a(user, amount_in, min_out)` — **Calls Token contract**
- `get_price_a_to_b(amount_in)` / `get_price_b_to_a(amount_in)` — Price quotes
- `get_reserves()` / `total_shares()` / `get_shares(provider)`

#### Inter-Contract Calls
The Swap contract calls the Token contract during swaps:
```rust
// In swap_a_for_b — inter-contract call:
token_a_client.transfer_from(&self_address, &user, &self_address, &amount_in);
token_b_client.transfer(&self_address, &user, &amount_out);
```

---

## 📸 Screenshots

### Wallet Connected
![Wallet Connected](docs/screenshots/01-wallet-connected.png)
> *Connected state showing wallet address, network badge, and dropdown menu with explorer link and disconnect option.*

### Balance Displayed
![Balance Display](docs/screenshots/02-balance-display.png)
> *Portfolio panel showing XLM balance, SST token balance, and pool position (if any liquidity provided).*

### Successful Transaction
![Successful Transaction](docs/screenshots/03-successful-transaction.png)
> *Transaction history panel showing completed swap with transaction hash linked to Stellar Expert explorer.*

### Test Output
![Test Output](docs/screenshots/04-test-output.png)
> *Jest test run showing 3 test suites, all tests passing with 0 failures.*

---

## 🎬 Demo Video

> **[📹 Watch Demo Video — PLACEHOLDER](https://your-demo-video-link.com)**
>
> The demo video covers:
> 1. Installing Freighter wallet and connecting to Testnet
> 2. Viewing XLM and SST token balances
> 3. Sending XLM to another address
> 4. Swapping tokens using the AMM pool
> 5. Adding and removing liquidity
> 6. Real-time event streaming from contracts
> 7. Error handling (wallet not found, rejected, insufficient balance)

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 20+
- npm 10+
- [Freighter Wallet](https://freighter.app) browser extension (for testing)
- Rust + Cargo (for contract development only)

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
cp .env.local .env.local.example
# Edit .env.local with your contract IDs (or use defaults for testnet)
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Set Up Freighter Wallet
1. Install the [Freighter](https://freighter.app) browser extension
2. Create or import a wallet
3. Switch to **Testnet** in Freighter settings
4. Get testnet XLM from [Stellar Friendbot](https://laboratory.stellar.org/#account-creator)

### 6. Connect and Use
1. Click "Connect Wallet" → choose your wallet
2. Your XLM balance will display automatically
3. Use the **Swap** tab to swap tokens
4. Use **Send** to transfer XLM
5. Watch live events in the **Events** tab

---

## 🔑 Environment Variables

```env
# Network (TESTNET | PUBLIC | FUTURENET)
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET

# Horizon REST API
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org

# Soroban RPC (for smart contract interaction)
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Deployed contract IDs (update after deploying your own contracts)
NEXT_PUBLIC_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN
NEXT_PUBLIC_SWAP_CONTRACT_ID=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

---

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Coverage
| Test File | Tests | Coverage |
|-----------|-------|----------|
| `wallet.test.ts` | Error classification, address validation, XLM formatting | Errors lib, Stellar utils |
| `balance.test.ts` | Cache TTL, cache invalidation, balance calculations | Cache lib, Stellar utils |
| `transaction.test.ts` | TX validation, AMM formula, state machine, slippage | Errors lib, Stellar utils |

### Example Test Run
```
PASS tests/wallet.test.ts
PASS tests/balance.test.ts
PASS tests/transaction.test.ts

Test Suites: 3 passed, 3 total
Tests:       52 passed, 52 total
Snapshots:   0 total
Time:        2.847s
```

---

## 🦀 Contract Deployment

### Install Soroban CLI
```bash
cargo install --locked soroban-cli --features opt
```

### Configure Network
```bash
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### Generate Keypair and Fund
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

### Deploy Token Contract
```bash
soroban contract deploy \
  --wasm contracts/token/target/wasm32-unknown-unknown/release/stellar_token.wasm \
  --source deployer \
  --network testnet
```

### Initialize Token Contract
```bash
soroban contract invoke \
  --id <TOKEN_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_PUBLIC_KEY> \
  --decimal 7 \
  --name "Stellar Swap Token" \
  --symbol SST
```

### Deploy Swap Contract
```bash
soroban contract deploy \
  --wasm contracts/swap/target/wasm32-unknown-unknown/release/stellar_swap.wasm \
  --source deployer \
  --network testnet
```

### Initialize Swap Contract
```bash
soroban contract invoke \
  --id <SWAP_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_PUBLIC_KEY> \
  --token_a <TOKEN_A_CONTRACT_ID> \
  --token_b <TOKEN_B_CONTRACT_ID> \
  --fee_bps 30
```

---

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and PR:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Install   │────▶│    Lint     │────▶│    Test     │────▶│    Build    │
│  npm ci     │     │  ESLint     │     │   Jest      │     │  Next.js    │
│             │     │  TypeScript │     │   Coverage  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │   Security  │
                    │  npm audit  │
                    └─────────────┘
```

**Jobs:**
1. **Install** — `npm ci` with caching
2. **Lint** — ESLint + TypeScript type checking
3. **Test** — Jest unit tests with coverage report
4. **Build** — Next.js production build
5. **Contracts** — Rust/Soroban contract build (on main branch)
6. **Audit** — npm security audit

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2 | React framework with App Router |
| React | 18.3 | UI library |
| TypeScript | 5.5 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |

### Stellar / Blockchain
| Package | Purpose |
|---------|---------|
| `@stellar/stellar-sdk` | Horizon + Soroban SDK |
| `@stellar/freighter-api` | Freighter wallet direct API |
| `stellar-wallets-kit` | Multi-wallet abstraction (Freighter, xBull, Albedo) |

### Smart Contracts
| Technology | Purpose |
|-----------|---------|
| Rust | Contract language |
| Soroban SDK v21 | Smart contract framework |
| WASM | Contract compilation target |

### Testing & Quality
| Tool | Purpose |
|------|---------|
| Jest | Test runner |
| ts-jest | TypeScript support for Jest |
| @testing-library/react | React component testing |
| ESLint | Code linting |
| GitHub Actions | CI/CD automation |

---

## 🏗️ Architecture

```
                        ┌─────────────────────────────────┐
                        │         Next.js Frontend          │
                        │  ┌──────────────────────────┐   │
                        │  │  React Components (UI)    │   │
                        │  │  WalletConnect, Swap,      │   │
                        │  │  BalanceDisplay, Events   │   │
                        │  └──────────┬───────────────┘   │
                        │             │                    │
                        │  ┌──────────▼───────────────┐   │
                        │  │  Custom Hooks             │   │
                        │  │  useWallet, useBalance,   │   │
                        │  │  useContract, useEvents   │   │
                        │  └──────────┬───────────────┘   │
                        │             │                    │
                        │  ┌──────────▼───────────────┐   │
                        │  │  Library Layer            │   │
                        │  │  stellar.ts, contracts.ts │   │
                        │  │  cache.ts, errors.ts      │   │
                        │  └──────────┬───────────────┘   │
                        └────────────┬────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
   ┌──────────▼──────────┐ ┌────────▼────────┐ ┌──────────▼──────────┐
   │  Stellar Wallets Kit │ │   Horizon API   │ │   Soroban RPC        │
   │  Freighter, xBull    │ │  Balance, Tx    │ │  Contract Calls      │
   └─────────────────────┘ └────────┬────────┘ └──────────┬───────────┘
                                    │                      │
                           ┌────────▼──────────────────────▼────────┐
                           │            Stellar Testnet               │
                           │  ┌──────────────┐  ┌──────────────┐    │
                           │  │ Token Contract│  │ Swap Contract │    │
                           │  │  (SST token)  │◀─│  (AMM Pool)  │    │
                           │  │              │  │  inter-call  │    │
                           │  └──────────────┘  └──────────────┘    │
                           └──────────────────────────────────────────┘
```

---

## 🔒 Security Considerations

- All amounts validated before submission
- Slippage protection on swaps (configurable: 0.1%, 0.5%, 1.0%)
- 1 XLM fee buffer enforced on XLM sends
- No private keys ever stored or transmitted
- All contract interactions via user's wallet signing
- Input sanitization throughout (addresses, amounts)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Stellar Development Foundation](https://stellar.org) for the Soroban platform
- [Freighter](https://freighter.app) for the wallet SDK
- [StellarWalletsKit](https://github.com/Creit-Tech/Stellar-Wallets-Kit) by Creit Tech
- [Stellar Expert](https://stellar.expert) for the block explorer