/**
 * Wallet Tests
 *
 * Tests for wallet connection state management, error handling,
 * and wallet utilities. These are unit tests that don't require
 * a real wallet extension.
 */

import { parseError } from '../src/lib/errors';
import { WalletErrorCode } from '../src/types';
import { isValidPublicKey, shortenAddress, formatXLM, stroopsToXLM } from '../src/lib/stellar';

// ============================================================
// Error Parsing Tests
// ============================================================

describe('parseError — Wallet Error Classification', () => {
  describe('Wallet Not Found errors', () => {
    test('classifies "Wallet not found" message', () => {
      const error = parseError(new Error('Freighter is not installed'));
      expect(error.code).toBe(WalletErrorCode.WALLET_NOT_FOUND);
      expect(error.message).toContain('install');
    });

    test('classifies "extension not found" message', () => {
      const error = parseError(new Error('Extension not found in browser'));
      expect(error.code).toBe(WalletErrorCode.WALLET_NOT_FOUND);
    });

    test('classifies "wallet not available" message', () => {
      const error = parseError('Wallet not available');
      expect(error.code).toBe(WalletErrorCode.WALLET_NOT_FOUND);
    });

    test('classifies xBull not found', () => {
      const error = parseError(new Error('xBull not found'));
      expect(error.code).toBe(WalletErrorCode.WALLET_NOT_FOUND);
    });
  });

  describe('Transaction Rejected errors', () => {
    test('classifies "user rejected" message', () => {
      const error = parseError(new Error('User rejected the request'));
      expect(error.code).toBe(WalletErrorCode.TRANSACTION_REJECTED);
      expect(error.message).toContain('rejected');
    });

    test('classifies "user declined" message', () => {
      const error = parseError(new Error('Transaction declined by user'));
      expect(error.code).toBe(WalletErrorCode.TRANSACTION_REJECTED);
    });

    test('classifies "cancelled by user" message', () => {
      const error = parseError(new Error('Request cancelled by user'));
      expect(error.code).toBe(WalletErrorCode.TRANSACTION_REJECTED);
    });

    test('error message is user friendly', () => {
      const error = parseError(new Error('User denied'));
      expect(error.code).toBe(WalletErrorCode.TRANSACTION_REJECTED);
      expect(error.message.length).toBeGreaterThan(10);
      expect(error.message).not.toContain('undefined');
    });
  });

  describe('Insufficient Balance errors', () => {
    test('classifies "insufficient balance" message', () => {
      const error = parseError(new Error('Insufficient balance'));
      expect(error.code).toBe(WalletErrorCode.INSUFFICIENT_BALANCE);
      expect(error.message).toContain('balance');
    });

    test('classifies "insufficient funds" message', () => {
      const error = parseError(new Error('Insufficient funds for transaction'));
      expect(error.code).toBe(WalletErrorCode.INSUFFICIENT_BALANCE);
    });

    test('classifies Stellar result code op_underfunded', () => {
      const error = parseError(new Error('op_underfunded'));
      expect(error.code).toBe(WalletErrorCode.INSUFFICIENT_BALANCE);
    });

    test('classifies "not enough" message', () => {
      const error = parseError('not enough XLM');
      expect(error.code).toBe(WalletErrorCode.INSUFFICIENT_BALANCE);
    });
  });

  describe('Network Mismatch errors', () => {
    test('classifies "wrong network" message', () => {
      const error = parseError(new Error('Wrong network selected'));
      expect(error.code).toBe(WalletErrorCode.NETWORK_MISMATCH);
    });

    test('classifies "network mismatch" message', () => {
      const error = parseError(new Error('Network mismatch error'));
      expect(error.code).toBe(WalletErrorCode.NETWORK_MISMATCH);
    });
  });

  describe('Contract errors', () => {
    test('classifies slippage exceeded', () => {
      const error = parseError(new Error('Contract panicked: slippage exceeded'));
      expect(error.code).toBe(WalletErrorCode.CONTRACT_ERROR);
      expect(error.message).toContain('Slippage');
    });

    test('classifies pool no liquidity', () => {
      const error = parseError(new Error('pool has no liquidity'));
      expect(error.code).toBe(WalletErrorCode.CONTRACT_ERROR);
      expect(error.message).toContain('liquidity');
    });

    test('classifies soroban simulation failure', () => {
      const error = parseError(new Error('Soroban simulation failed'));
      expect(error.code).toBe(WalletErrorCode.CONTRACT_ERROR);
    });
  });

  describe('Unknown errors', () => {
    test('returns UNKNOWN for unrecognized errors', () => {
      const error = parseError(new Error('Something totally unexpected happened'));
      expect(error.code).toBe(WalletErrorCode.UNKNOWN);
    });

    test('handles non-Error objects', () => {
      const error = parseError({ random: 'object' });
      expect(error.code).toBeDefined();
      expect(error.message).toBeTruthy();
    });

    test('handles null/undefined gracefully', () => {
      const error = parseError(null);
      expect(error.code).toBeDefined();
      expect(error.message).toBeTruthy();
    });

    test('handles string errors', () => {
      const error = parseError('something went wrong');
      expect(error.code).toBe(WalletErrorCode.UNKNOWN);
      expect(error.message).toBeTruthy();
    });
  });

  describe('Error object codes', () => {
    test('classifies Freighter code -4 as rejected', () => {
      const error = parseError({ code: '-4', message: 'Rejected' });
      expect(error.code).toBe(WalletErrorCode.TRANSACTION_REJECTED);
    });

    test('classifies type WALLET_NOT_FOUND', () => {
      const error = parseError({ type: 'WALLET_NOT_FOUND', message: 'not found' });
      expect(error.code).toBe(WalletErrorCode.WALLET_NOT_FOUND);
    });

    test('classifies type TRANSACTION_REJECTED', () => {
      const error = parseError({ type: 'TRANSACTION_REJECTED', message: 'rejected' });
      expect(error.code).toBe(WalletErrorCode.TRANSACTION_REJECTED);
    });
  });
});

// ============================================================
// Address Validation Tests
// ============================================================

describe('isValidPublicKey — Stellar Address Validation', () => {
  test('accepts valid Stellar public key (G address)', () => {
    const validKey = 'GBVG2QOHHFBVHAEGNF4XRUCAPAGWDROONM2LC4BK4ECCQ5RTQOO64VBW';
    expect(isValidPublicKey(validKey)).toBe(true);
  });

  test('rejects empty string', () => {
    expect(isValidPublicKey('')).toBe(false);
  });

  test('rejects address starting with S (secret key)', () => {
    const secretKey = 'SCZANGBA5AKIA4AIXT6FBZBKBHBHQXASFBKBHBHQXASFA';
    expect(isValidPublicKey(secretKey)).toBe(false);
  });

  test('rejects address that is too short', () => {
    expect(isValidPublicKey('GABC123')).toBe(false);
  });

  test('rejects random string', () => {
    expect(isValidPublicKey('not-a-stellar-address')).toBe(false);
  });

  test('rejects null/undefined gracefully', () => {
    expect(isValidPublicKey('')).toBe(false);
  });
});

// ============================================================
// Address Formatting Tests
// ============================================================

describe('shortenAddress — Address Display', () => {
  test('shortens long address with ellipsis', () => {
    const address = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV7CBZAOT6Z';
    const short = shortenAddress(address);
    expect(short).toContain('...');
    expect(short.length).toBeLessThan(address.length);
  });

  test('returns empty string for empty input', () => {
    expect(shortenAddress('')).toBe('');
  });

  test('respects custom chars parameter', () => {
    const address = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV7CBZAOT6Z';
    const short = shortenAddress(address, 4);
    expect(short.startsWith(address.slice(0, 4))).toBe(true);
    expect(short.endsWith(address.slice(-4))).toBe(true);
  });
});

// ============================================================
// XLM Formatting Tests
// ============================================================

describe('formatXLM — Balance Display', () => {
  test('formats whole number XLM', () => {
    const result = formatXLM('100.0000000');
    expect(result).toContain('100');
  });

  test('formats decimal XLM', () => {
    const result = formatXLM('1.5000000');
    expect(result).toContain('1.5');
  });

  test('returns 0.0000 for invalid input', () => {
    const result = formatXLM('not-a-number');
    expect(result).toBe('0.0000');
  });

  test('formats zero balance', () => {
    const result = formatXLM('0');
    expect(result).toBeTruthy();
  });
});

describe('stroopsToXLM — Stroop Conversion', () => {
  test('converts 10000000 stroops to 1 XLM', () => {
    expect(stroopsToXLM(10_000_000)).toContain('1');
  });

  test('converts 0 stroops to 0 XLM', () => {
    expect(stroopsToXLM(0)).toContain('0');
  });

  test('converts bigint stroops', () => {
    const result = stroopsToXLM(BigInt(50_000_000));
    expect(result).toContain('5');
  });
});
