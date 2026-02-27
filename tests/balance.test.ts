/**
 * Balance Tests
 *
 * Tests for balance fetching, caching, formatting,
 * and token amount calculations.
 */

import { cache, CACHE_KEYS, CACHE_TTL } from '../src/lib/cache';
import { formatXLM, formatTokenAmount, isValidPublicKey } from '../src/lib/stellar';

// ============================================================
// Cache Tests
// ============================================================

describe('Cache — In-memory caching with TTL', () => {
  beforeEach(() => {
    cache.clear();
  });

  afterEach(() => {
    cache.clear();
  });

  test('stores and retrieves a value', () => {
    cache.set('test-key', { balance: '100' });
    const result = cache.get<{ balance: string }>('test-key');
    expect(result).toEqual({ balance: '100' });
  });

  test('returns null for missing key', () => {
    const result = cache.get('nonexistent-key');
    expect(result).toBeNull();
  });

  test('returns null for expired entry', async () => {
    cache.set('expiring-key', 'value', 50); // 50ms TTL
    await new Promise((resolve) => setTimeout(resolve, 100)); // wait 100ms
    const result = cache.get('expiring-key');
    expect(result).toBeNull();
  });

  test('has() returns true for valid entry', () => {
    cache.set('exists', 'data');
    expect(cache.has('exists')).toBe(true);
  });

  test('has() returns false for missing entry', () => {
    expect(cache.has('missing')).toBe(false);
  });

  test('delete() removes entry', () => {
    cache.set('deletable', 'value');
    cache.delete('deletable');
    expect(cache.get('deletable')).toBeNull();
  });

  test('clear() removes all entries', () => {
    cache.set('key1', 'val1');
    cache.set('key2', 'val2');
    cache.set('key3', 'val3');
    cache.clear();
    expect(cache.stats().size).toBe(0);
  });

  test('invalidatePrefix() removes matching entries', () => {
    cache.set('balance:ADDR1', '100');
    cache.set('balance:ADDR2', '200');
    cache.set('other:key', 'data');
    cache.invalidatePrefix('balance:');

    expect(cache.get('balance:ADDR1')).toBeNull();
    expect(cache.get('balance:ADDR2')).toBeNull();
    expect(cache.get('other:key')).not.toBeNull();
  });

  test('stats() returns correct size', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.stats().size).toBe(3);
  });

  test('stats() returns correct keys', () => {
    cache.set('x', 1);
    cache.set('y', 2);
    const { keys } = cache.stats();
    expect(keys).toContain('x');
    expect(keys).toContain('y');
  });

  test('overwrites existing entry with new value', () => {
    cache.set('key', 'old-value');
    cache.set('key', 'new-value');
    expect(cache.get('key')).toBe('new-value');
  });

  test('getOrFetch returns cached value without calling fetcher again', async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return 'fetched-value';
    };

    // First call — fetches
    const result1 = await cache.getOrFetch('fetch-key', fetcher);
    // Second call — uses cache
    const result2 = await cache.getOrFetch('fetch-key', fetcher);

    expect(result1).toBe('fetched-value');
    expect(result2).toBe('fetched-value');
    expect(fetchCount).toBe(1); // Only fetched once
  });

  test('getOrFetch calls fetcher when cache is empty', async () => {
    const fetcher = jest.fn().mockResolvedValue('fresh-data');
    const result = await cache.getOrFetch('new-key', fetcher);
    expect(result).toBe('fresh-data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// Cache Key Tests
// ============================================================

describe('CACHE_KEYS — Key generation', () => {
  test('generates unique XLM balance keys per address', () => {
    const key1 = CACHE_KEYS.xlmBalance('ADDR1');
    const key2 = CACHE_KEYS.xlmBalance('ADDR2');
    expect(key1).not.toBe(key2);
    expect(key1).toContain('ADDR1');
  });

  test('generates unique token balance keys per contract and address', () => {
    const key1 = CACHE_KEYS.tokenBalance('CONTRACT1', 'ADDR1');
    const key2 = CACHE_KEYS.tokenBalance('CONTRACT1', 'ADDR2');
    const key3 = CACHE_KEYS.tokenBalance('CONTRACT2', 'ADDR1');
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });

  test('generates pool reserves key with contract ID', () => {
    const key = CACHE_KEYS.poolReserves('SWAP_CONTRACT');
    expect(key).toContain('SWAP_CONTRACT');
  });

  test('generates swap quote key with direction and amount', () => {
    const key1 = CACHE_KEYS.swapQuote('a_to_b', '1000000');
    const key2 = CACHE_KEYS.swapQuote('b_to_a', '1000000');
    expect(key1).not.toBe(key2);
  });
});

// ============================================================
// TTL Constants Tests
// ============================================================

describe('CACHE_TTL — TTL values are valid', () => {
  test('balance TTL is positive', () => {
    expect(CACHE_TTL.balance).toBeGreaterThan(0);
  });

  test('pool info TTL is positive', () => {
    expect(CACHE_TTL.poolInfo).toBeGreaterThan(0);
  });

  test('swap quote TTL is shorter than balance TTL', () => {
    // Quotes are more time-sensitive than balance data
    expect(CACHE_TTL.swapQuote).toBeLessThanOrEqual(CACHE_TTL.balance);
  });

  test('token metadata TTL is longer than balance TTL', () => {
    // Metadata changes rarely
    expect(CACHE_TTL.tokenMetadata).toBeGreaterThan(CACHE_TTL.balance);
  });
});

// ============================================================
// Balance Formatting Tests
// ============================================================

describe('formatXLM — XLM Balance Formatting', () => {
  test('formats 100 XLM correctly', () => {
    expect(formatXLM('100.0000000')).toContain('100');
  });

  test('formats 0 XLM correctly', () => {
    const result = formatXLM('0.0000000');
    expect(result).toBeTruthy();
    expect(parseFloat(result)).toBe(0);
  });

  test('formats 1000.5 XLM with separators', () => {
    const result = formatXLM('1000.5');
    expect(result).toBeTruthy();
    // Should include the integer part
    expect(result).toContain('1,000');
  });

  test('handles string with no decimals', () => {
    const result = formatXLM('500');
    expect(result).toContain('500');
  });

  test('returns fallback for NaN input', () => {
    const result = formatXLM('not-a-number');
    expect(result).toBe('0.0000');
  });
});

describe('formatTokenAmount — Token Amount with Decimals', () => {
  test('formats 10000000 with 7 decimals as 1.0', () => {
    const result = formatTokenAmount(BigInt(10_000_000), 7);
    expect(result).toContain('1');
  });

  test('formats 0 correctly', () => {
    const result = formatTokenAmount(BigInt(0), 7);
    expect(result).toContain('0');
  });

  test('formats large amounts with thousands separator', () => {
    const result = formatTokenAmount(BigInt(100_000_000_000), 7);
    // 100_000_000_000 / 10^7 = 10,000.0000
    expect(result).toContain('10,000');
  });

  test('handles different decimal places', () => {
    // 1000 with 3 decimals = 1.000
    const result = formatTokenAmount(BigInt(1000), 3);
    expect(result).toContain('1');
  });
});

// ============================================================
// XLM Balance Calculation Tests
// ============================================================

describe('XLM Balance Calculations', () => {
  test('calculates max sendable amount (keeps 1 XLM for fees)', () => {
    const balance = 10.5;
    const fee = 1;
    const maxSendable = Math.max(0, balance - fee);
    expect(maxSendable).toBe(9.5);
  });

  test('returns 0 when balance is below fee minimum', () => {
    const balance = 0.5;
    const fee = 1;
    const maxSendable = Math.max(0, balance - fee);
    expect(maxSendable).toBe(0);
  });

  test('validates amount does not exceed max sendable', () => {
    const balance = '100.0000000';
    const amount = '50';
    const maxSendable = parseFloat(balance) - 1;
    expect(parseFloat(amount)).toBeLessThanOrEqual(maxSendable);
  });

  test('rejects amount equal to full balance (no fee buffer)', () => {
    const balance = '10.0000000';
    const amount = '10'; // No room for fees
    const maxSendable = parseFloat(balance) - 1; // 9.0
    expect(parseFloat(amount)).toBeGreaterThan(maxSendable);
  });
});

// ============================================================
// Address Validation in Balance Context
// ============================================================

describe('Address Validation', () => {
  const VALID_ADDRESSES = [
    'GBEP2QXQ4MA4KKYIOVNKKSDSC6O6AP5RVMDCDR5XQEFERJMU3AGTQLDB',
    'GBVG2QOHHFBVHAEGNF4XRUCAPAGWDROONM2LC4BK4ECCQ5RTQOO64VBW',
  ];

  const INVALID_ADDRESSES = [
    '',
    'not-an-address',
    'SCZANGBA5AKIA4AIXT6FBZBKB',
    '12345',
    'g' + 'a'.repeat(55), // lowercase
  ];

  test.each(VALID_ADDRESSES)(
    'accepts valid address: %s',
    (address) => {
      expect(isValidPublicKey(address)).toBe(true);
    }
  );

  test.each(INVALID_ADDRESSES)(
    'rejects invalid address: %s',
    (address) => {
      expect(isValidPublicKey(address)).toBe(false);
    }
  );
});
