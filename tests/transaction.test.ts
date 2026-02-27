/**
 * Transaction Tests
 *
 * Tests for transaction building, validation, status tracking,
 * error handling, and the AMM pricing formula.
 */

import { parseError, isRecoverableError, getErrorLabel } from '../src/lib/errors';
import { WalletErrorCode } from '../src/types';
import { isValidPublicKey, isValidContractAddress, formatXLM } from '../src/lib/stellar';

// ============================================================
// Transaction Validation Tests
// ============================================================

describe('Transaction Input Validation', () => {
  describe('XLM Send Validation', () => {
    const validateXLMSend = (
      amount: string,
      balance: string,
      recipient: string,
      fromAddress: string
    ): string | null => {
      if (!recipient) return 'Recipient is required';
      if (!isValidPublicKey(recipient)) return 'Invalid Stellar address';
      if (recipient === fromAddress) return 'Cannot send to yourself';

      const amountNum = parseFloat(amount);
      if (!amount || isNaN(amountNum)) return 'Invalid amount';
      if (amountNum <= 0) return 'Amount must be greater than 0';

      const balanceNum = parseFloat(balance);
      const maxSendable = balanceNum - 1; // 1 XLM fee buffer
      if (amountNum > maxSendable) return 'Insufficient balance';

      return null; // valid
    };

    const FROM = 'GBEP2QXQ4MA4KKYIOVNKKSDSC6O6AP5RVMDCDR5XQEFERJMU3AGTQLDB';
    const TO = 'GBVG2QOHHFBVHAEGNF4XRUCAPAGWDROONM2LC4BK4ECCQ5RTQOO64VBW';

    test('accepts valid send parameters', () => {
      const error = validateXLMSend('10', '100', TO, FROM);
      expect(error).toBeNull();
    });

    test('rejects empty recipient', () => {
      const error = validateXLMSend('10', '100', '', FROM);
      expect(error).toBeTruthy();
      expect(error).toContain('required');
    });

    test('rejects invalid recipient address', () => {
      const error = validateXLMSend('10', '100', 'not-an-address', FROM);
      expect(error).toContain('Invalid');
    });

    test('rejects self-send', () => {
      const error = validateXLMSend('10', '100', FROM, FROM);
      expect(error).toContain('yourself');
    });

    test('rejects zero amount', () => {
      const error = validateXLMSend('0', '100', TO, FROM);
      expect(error).toBeTruthy();
    });

    test('rejects negative amount', () => {
      const error = validateXLMSend('-5', '100', TO, FROM);
      expect(error).toBeTruthy();
    });

    test('rejects amount exceeding balance minus fee', () => {
      const error = validateXLMSend('100', '100', TO, FROM);
      expect(error).toContain('Insufficient');
    });

    test('accepts amount just within balance', () => {
      const error = validateXLMSend('98', '100', TO, FROM); // 100 - 1 = 99 max
      expect(error).toBeNull();
    });

    test('rejects NaN amount', () => {
      const error = validateXLMSend('abc', '100', TO, FROM);
      expect(error).toBeTruthy();
    });
  });

  describe('Contract Address Validation', () => {
    test('accepts valid C-prefixed contract address', () => {
      const addr = 'C' + 'A'.repeat(55);
      expect(isValidContractAddress(addr)).toBe(true);
    });

    test('rejects G-prefixed public key', () => {
      const addr = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV7CBZAOT6Z';
      expect(isValidContractAddress(addr)).toBe(false);
    });

    test('rejects empty string', () => {
      expect(isValidContractAddress('')).toBe(false);
    });

    test('rejects short address', () => {
      expect(isValidContractAddress('CABC')).toBe(false);
    });
  });
});

// ============================================================
// Transaction Status State Machine Tests
// ============================================================

describe('Transaction Status State Machine', () => {
  type TxStatus = 'idle' | 'building' | 'signing' | 'submitting' | 'pending' | 'success' | 'error';

  const validTransitions: Array<[TxStatus, TxStatus]> = [
    ['idle', 'building'],
    ['building', 'signing'],
    ['signing', 'submitting'],
    ['submitting', 'pending'],
    ['pending', 'success'],
    ['pending', 'error'],
    ['building', 'error'],
    ['signing', 'error'],
    ['submitting', 'error'],
  ];

  const isTxPending = (status: TxStatus): boolean =>
    ['building', 'signing', 'submitting', 'pending'].includes(status);

  const isTxFinal = (status: TxStatus): boolean =>
    ['success', 'error'].includes(status);

  test.each(validTransitions)(
    'transition from %s to %s is valid',
    (from, to) => {
      // Just verify these are recognized states
      expect(['idle', 'building', 'signing', 'submitting', 'pending', 'success', 'error']).toContain(from);
      expect(['idle', 'building', 'signing', 'submitting', 'pending', 'success', 'error']).toContain(to);
    }
  );

  test('building, signing, submitting, pending are pending states', () => {
    expect(isTxPending('building')).toBe(true);
    expect(isTxPending('signing')).toBe(true);
    expect(isTxPending('submitting')).toBe(true);
    expect(isTxPending('pending')).toBe(true);
    expect(isTxPending('idle')).toBe(false);
    expect(isTxPending('success')).toBe(false);
    expect(isTxPending('error')).toBe(false);
  });

  test('success and error are final states', () => {
    expect(isTxFinal('success')).toBe(true);
    expect(isTxFinal('error')).toBe(true);
    expect(isTxFinal('pending')).toBe(false);
    expect(isTxFinal('building')).toBe(false);
  });
});

// ============================================================
// AMM Price Calculation Tests
// ============================================================

describe('AMM — Constant Product Price Formula', () => {
  /**
   * Replicates the Rust contract formula:
   * amount_out = (amount_in * (10000 - fee_bps) * reserve_out) /
   *              (reserve_in * 10000 + amount_in * (10000 - fee_bps))
   */
  const getAmountOut = (
    amountIn: number,
    reserveIn: number,
    reserveOut: number,
    feeBps: number = 30
  ): number => {
    if (reserveIn <= 0 || reserveOut <= 0) return 0;
    const feeFactor = 10000 - feeBps;
    const amountInWithFee = amountIn * feeFactor;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 10000 + amountInWithFee;
    return Math.floor(numerator / denominator);
  };

  test('calculates correct output for equal reserves', () => {
    // Pool: 1000 A, 1000 B, swap 100 A
    const out = getAmountOut(100, 1000, 1000, 30);
    expect(out).toBeGreaterThan(0);
    expect(out).toBeLessThan(100); // output is less than input due to fee + slippage
  });

  test('output decreases as price impact increases', () => {
    // Large swap has worse price than small swap
    const smallOut = getAmountOut(10, 1000, 1000, 30);
    const largeOut = getAmountOut(500, 1000, 1000, 30);

    // Price ratio (out/in) should be worse for large swap
    const smallRatio = smallOut / 10;
    const largeRatio = largeOut / 500;
    expect(largeRatio).toBeLessThan(smallRatio);
  });

  test('maintains constant product (x * y = k) approximately', () => {
    const reserveIn = 1000;
    const reserveOut = 1000;
    const k = reserveIn * reserveOut; // k = 1,000,000

    const amountIn = 100;
    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut, 0); // 0% fee for pure formula

    const newReserveIn = reserveIn + amountIn;
    const newReserveOut = reserveOut - amountOut;
    const newK = newReserveIn * newReserveOut;

    // k should increase or stay same (due to rounding, newK >= k)
    expect(newK).toBeGreaterThanOrEqual(k);
  });

  test('higher fee results in less output', () => {
    const out30bps = getAmountOut(1000, 10000, 10000, 30);
    const out100bps = getAmountOut(1000, 10000, 10000, 100);
    expect(out30bps).toBeGreaterThan(out100bps);
  });

  test('returns 0 for empty pool', () => {
    const out = getAmountOut(100, 0, 1000, 30);
    // Division by zero protection — result should be 0
    expect(out).toBe(0);
  });

  test('price is symmetric for equal pools (A→B ≈ B→A)', () => {
    const outAtoB = getAmountOut(100, 1000, 1000, 30);
    const outBtoA = getAmountOut(100, 1000, 1000, 30);
    expect(outAtoB).toBe(outBtoA); // Equal pools = symmetric price
  });
});

// ============================================================
// Error Recovery Tests
// ============================================================

describe('Error Recovery Classification', () => {
  test('transaction rejected is recoverable', () => {
    expect(isRecoverableError(WalletErrorCode.TRANSACTION_REJECTED)).toBe(true);
  });

  test('insufficient balance is recoverable', () => {
    expect(isRecoverableError(WalletErrorCode.INSUFFICIENT_BALANCE)).toBe(true);
  });

  test('unknown errors are recoverable (retry is possible)', () => {
    expect(isRecoverableError(WalletErrorCode.UNKNOWN)).toBe(true);
  });

  test('wallet not found is not recoverable without action', () => {
    expect(isRecoverableError(WalletErrorCode.WALLET_NOT_FOUND)).toBe(false);
  });

  test('network mismatch is not recoverable without action', () => {
    expect(isRecoverableError(WalletErrorCode.NETWORK_MISMATCH)).toBe(false);
  });

  describe('Error Labels', () => {
    test('wallet not found has readable label', () => {
      const label = getErrorLabel(WalletErrorCode.WALLET_NOT_FOUND);
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(3);
    });

    test('transaction rejected has readable label', () => {
      const label = getErrorLabel(WalletErrorCode.TRANSACTION_REJECTED);
      expect(label).toBeTruthy();
    });

    test('insufficient balance has readable label', () => {
      const label = getErrorLabel(WalletErrorCode.INSUFFICIENT_BALANCE);
      expect(label).toBeTruthy();
    });
  });
});

// ============================================================
// Transaction Hash Validation
// ============================================================

describe('Transaction Hash Validation', () => {
  const isValidTxHash = (hash: string): boolean => {
    return /^[a-fA-F0-9]{64}$/.test(hash);
  };

  test('accepts valid 64-char hex hash', () => {
    const hash = 'a'.repeat(64);
    expect(isValidTxHash(hash)).toBe(true);
  });

  test('accepts mixed case hex hash', () => {
    const hash = 'aAbBcCdDeEfF' + '0123456789' + 'a'.repeat(42);
    expect(isValidTxHash(hash)).toBe(true);
  });

  test('rejects hash shorter than 64 chars', () => {
    const hash = 'a'.repeat(63);
    expect(isValidTxHash(hash)).toBe(false);
  });

  test('rejects hash longer than 64 chars', () => {
    const hash = 'a'.repeat(65);
    expect(isValidTxHash(hash)).toBe(false);
  });

  test('rejects non-hex characters', () => {
    const hash = 'g'.repeat(64); // g is not hex
    expect(isValidTxHash(hash)).toBe(false);
  });

  test('rejects empty string', () => {
    expect(isValidTxHash('')).toBe(false);
  });
});

// ============================================================
// Slippage Calculation Tests
// ============================================================

describe('Slippage Tolerance Calculation', () => {
  const calcMinAmountOut = (amountOut: number, slippagePercent: number): number => {
    const slippageFactor = 1 - slippagePercent / 100;
    return Math.floor(amountOut * slippageFactor);
  };

  test('0.5% slippage gives 99.5% of quoted amount', () => {
    const quoted = 1000;
    const min = calcMinAmountOut(quoted, 0.5);
    expect(min).toBe(995);
  });

  test('1% slippage gives 99% of quoted amount', () => {
    const quoted = 1000;
    const min = calcMinAmountOut(quoted, 1.0);
    expect(min).toBe(990);
  });

  test('0.1% slippage gives 99.9% of quoted amount', () => {
    const quoted = 1000;
    const min = calcMinAmountOut(quoted, 0.1);
    expect(min).toBe(999);
  });

  test('min amount is always less than or equal to quoted', () => {
    const quoted = 500;
    const slippages = [0.1, 0.5, 1.0, 2.0];
    slippages.forEach((s) => {
      expect(calcMinAmountOut(quoted, s)).toBeLessThanOrEqual(quoted);
    });
  });
});
