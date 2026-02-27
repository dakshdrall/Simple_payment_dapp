// ============================================================
// Core Wallet Types
// ============================================================

export type WalletType = 'freighter' | 'xbull' | 'albedo' | 'rabet' | 'hana';

export interface WalletInfo {
  id: WalletType;
  name: string;
  icon: string;
  description: string;
}

export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  walletType: WalletType | null;
  network: StellarNetwork;
  isLoading: boolean;
  error: WalletError | null;
}

// ============================================================
// Network Types
// ============================================================

export type StellarNetwork = 'TESTNET' | 'PUBLIC' | 'FUTURENET';

export interface NetworkConfig {
  network: StellarNetwork;
  networkPassphrase: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
}

// ============================================================
// Balance Types
// ============================================================

export interface XLMBalance {
  balance: string;
  balanceRaw: string;
  lastUpdated: number;
  isLoading: boolean;
  error: string | null;
}

export interface TokenBalance {
  contractId: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceRaw: bigint;
  lastUpdated: number;
}

export interface PoolBalances {
  reserveA: string;
  reserveB: string;
  totalShares: string;
  userShares: string;
  lastUpdated: number;
}

// ============================================================
// Transaction Types
// ============================================================

export type TransactionStatus = 'idle' | 'building' | 'signing' | 'submitting' | 'pending' | 'success' | 'error';

export interface Transaction {
  id: string;
  hash: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount?: string;
  recipient?: string;
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  timestamp: number;
  error?: string;
  ledger?: number;
  fee?: string;
}

export type TransactionType =
  | 'send_xlm'
  | 'swap_a_to_b'
  | 'swap_b_to_a'
  | 'add_liquidity'
  | 'remove_liquidity'
  | 'mint_token'
  | 'approve_token'
  | 'contract_call';

export interface TransactionResult {
  hash: string;
  status: 'SUCCESS' | 'FAILED';
  ledger?: number;
  fee?: string;
  error?: string;
}

// ============================================================
// Swap Types
// ============================================================

export type SwapDirection = 'a_to_b' | 'b_to_a';

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  fee: string;
  direction: SwapDirection;
  isLoading: boolean;
  error: string | null;
}

export interface SwapState {
  direction: SwapDirection;
  amountIn: string;
  amountOut: string;
  slippage: number;
  isLoading: boolean;
  quote: SwapQuote | null;
  error: string | null;
}

// ============================================================
// Event Types
// ============================================================

export type EventType = 'swap' | 'add_liquidity' | 'remove_liquidity' | 'transfer' | 'mint' | 'burn';

export interface ContractEvent {
  id: string;
  type: EventType;
  txHash: string;
  ledger: number;
  timestamp: number;
  data: SwapEventData | LiquidityEventData | TransferEventData;
}

export interface SwapEventData {
  user: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
}

export interface LiquidityEventData {
  provider: string;
  amountA: string;
  amountB: string;
  shares: string;
}

export interface TransferEventData {
  from: string;
  to: string;
  amount: string;
}

// ============================================================
// Error Types
// ============================================================

export enum WalletErrorCode {
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  NOT_CONNECTED = 'NOT_CONNECTED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface WalletError {
  code: WalletErrorCode;
  message: string;
  details?: string;
}

// ============================================================
// Cache Types
// ============================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================================
// Contract Types
// ============================================================

export interface ContractConfig {
  tokenContractId: string;
  swapContractId: string;
}

export interface PoolInfo {
  reserveA: bigint;
  reserveB: bigint;
  totalShares: bigint;
  tokenA: string;
  tokenB: string;
  feeBps: number;
}
