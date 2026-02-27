import { WalletError, WalletErrorCode } from '@/types';

// ============================================================
// Error classification and user-friendly messages
// ============================================================

/**
 * Parse raw errors into structured WalletError objects with user-friendly messages.
 * Handles 3+ distinct error types as required by Level 2.
 */
export function parseError(error: unknown): WalletError {
  if (typeof error === 'string') {
    return classifyStringError(error);
  }

  if (error instanceof Error) {
    return classifyStringError(error.message);
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // Handle Freighter API errors
    if (err.code !== undefined) {
      return classifyByCode(String(err.code), String(err.message || ''));
    }

    // Handle StellarWalletsKit errors
    if (err.type !== undefined) {
      return classifyByType(String(err.type), String(err.message || ''));
    }

    if (err.message !== undefined) {
      return classifyStringError(String(err.message));
    }
  }

  return {
    code: WalletErrorCode.UNKNOWN,
    message: 'An unexpected error occurred. Please try again.',
    details: String(error),
  };
}

// ============================================================
// Error Type 1: Wallet Not Found / Not Installed
// ============================================================
function isWalletNotFound(msg: string): boolean {
  const patterns = [
    'wallet not found',
    'freighter not found',
    'freighter is not installed',
    'extension not found',
    'not installed',
    'wallet not available',
    'xbull not found',
    'no wallet detected',
    'wallet extension',
  ];
  return patterns.some((p) => msg.toLowerCase().includes(p));
}

// ============================================================
// Error Type 2: Transaction Rejected by User
// ============================================================
function isTransactionRejected(msg: string): boolean {
  const patterns = [
    'user rejected',
    'user declined',
    'transaction rejected',
    'rejected by user',
    'user denied',
    'cancelled by user',
    'user cancelled',
    'request rejected',
    'declined',
    'user closed',
  ];
  return patterns.some((p) => msg.toLowerCase().includes(p));
}

// ============================================================
// Error Type 3: Insufficient Balance
// ============================================================
function isInsufficientBalance(msg: string): boolean {
  const patterns = [
    'insufficient balance',
    'insufficient funds',
    'not enough',
    'underfunded',
    'op_underfunded',
    'balance too low',
    'insufficient xlm',
    'below minimum',
    'tx_insufficient_balance',
  ];
  return patterns.some((p) => msg.toLowerCase().includes(p));
}

// ============================================================
// Error Type 4: Network Mismatch
// ============================================================
function isNetworkMismatch(msg: string): boolean {
  const patterns = [
    'network mismatch',
    'wrong network',
    'network does not match',
    'expected testnet',
    'expected mainnet',
    'network passphrase',
  ];
  return patterns.some((p) => msg.toLowerCase().includes(p));
}

// ============================================================
// Error Type 5: Contract / Simulation Errors
// ============================================================
function isContractError(msg: string): boolean {
  const patterns = [
    'contract error',
    'simulation failed',
    'invoke host function',
    'soroban',
    'wasm',
    'invoke_host',
    'slippage exceeded',
    'pool has no liquidity',
    'insufficient allowance',
  ];
  return patterns.some((p) => msg.toLowerCase().includes(p));
}

function classifyStringError(message: string): WalletError {
  if (isWalletNotFound(message)) {
    return {
      code: WalletErrorCode.WALLET_NOT_FOUND,
      message: 'Wallet not found. Please install a Stellar wallet extension.',
      details: message,
    };
  }

  if (isTransactionRejected(message)) {
    return {
      code: WalletErrorCode.TRANSACTION_REJECTED,
      message: 'Transaction was rejected. Please try again and approve in your wallet.',
      details: message,
    };
  }

  if (isInsufficientBalance(message)) {
    return {
      code: WalletErrorCode.INSUFFICIENT_BALANCE,
      message: 'Insufficient balance to complete this transaction.',
      details: message,
    };
  }

  if (isNetworkMismatch(message)) {
    return {
      code: WalletErrorCode.NETWORK_MISMATCH,
      message: 'Network mismatch. Please switch your wallet to Stellar Testnet.',
      details: message,
    };
  }

  if (isContractError(message)) {
    return {
      code: WalletErrorCode.CONTRACT_ERROR,
      message: getContractErrorMessage(message),
      details: message,
    };
  }

  return {
    code: WalletErrorCode.UNKNOWN,
    message: message || 'An unexpected error occurred. Please try again.',
    details: message,
  };
}

function classifyByCode(code: string, message: string): WalletError {
  // Freighter error codes
  switch (code) {
    case '-4':
    case '4':
      return {
        code: WalletErrorCode.TRANSACTION_REJECTED,
        message: 'Transaction was rejected in your wallet.',
        details: message,
      };
    case '-3':
    case '3':
      return {
        code: WalletErrorCode.NETWORK_MISMATCH,
        message: 'Network mismatch. Please switch to Stellar Testnet.',
        details: message,
      };
    default:
      return classifyStringError(message);
  }
}

function classifyByType(type: string, message: string): WalletError {
  switch (type) {
    case 'WALLET_NOT_FOUND':
      return {
        code: WalletErrorCode.WALLET_NOT_FOUND,
        message: 'Wallet not found. Please install a supported Stellar wallet.',
        details: message,
      };
    case 'TRANSACTION_REJECTED':
      return {
        code: WalletErrorCode.TRANSACTION_REJECTED,
        message: 'Transaction was rejected. Please approve in your wallet.',
        details: message,
      };
    default:
      return classifyStringError(message || type);
  }
}

function getContractErrorMessage(raw: string): string {
  if (raw.includes('slippage exceeded')) {
    return 'Slippage tolerance exceeded. Try increasing slippage or reducing the swap amount.';
  }
  if (raw.includes('pool has no liquidity')) {
    return 'The liquidity pool has no funds. Please add liquidity first.';
  }
  if (raw.includes('insufficient allowance')) {
    return 'Insufficient token allowance. Please approve the contract to spend your tokens.';
  }
  if (raw.includes('insufficient balance')) {
    return 'Insufficient token balance for this operation.';
  }
  return 'Smart contract error. The transaction could not be completed.';
}

/**
 * Get a short label for error badges/icons
 */
export function getErrorLabel(code: WalletErrorCode): string {
  switch (code) {
    case WalletErrorCode.WALLET_NOT_FOUND:
      return 'Wallet Not Found';
    case WalletErrorCode.TRANSACTION_REJECTED:
      return 'Rejected';
    case WalletErrorCode.INSUFFICIENT_BALANCE:
      return 'Insufficient Balance';
    case WalletErrorCode.NETWORK_MISMATCH:
      return 'Wrong Network';
    case WalletErrorCode.CONTRACT_ERROR:
      return 'Contract Error';
    case WalletErrorCode.NOT_CONNECTED:
      return 'Not Connected';
    default:
      return 'Error';
  }
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(code: WalletErrorCode): boolean {
  return [
    WalletErrorCode.TRANSACTION_REJECTED,
    WalletErrorCode.INSUFFICIENT_BALANCE,
    WalletErrorCode.UNKNOWN,
  ].includes(code);
}
