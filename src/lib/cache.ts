import { CacheEntry } from '@/types';

// ============================================================
// In-memory cache with TTL support
// ============================================================

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Get a cached value. Returns null if expired or missing.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in cache with optional TTL (ms). Default: 30s
   */
  set<T>(key: string, data: T, ttl = 30_000): void {
    // Clear existing timer
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);

    this.store.set(key, { data, timestamp: Date.now(), ttl });

    // Auto-evict after TTL
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    this.timers.set(key, timer);
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): void {
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * Invalidate all entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    }
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    for (const timer of Array.from(this.timers.values())) {
      clearTimeout(timer);
    }
    this.store.clear();
    this.timers.clear();
  }

  /**
   * Get remaining TTL in ms for a key (0 if expired/missing)
   */
  ttl(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    const remaining = entry.timestamp + entry.ttl - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get or fetch with automatic caching
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 30_000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

// Singleton cache instance
export const cache = new Cache();

// ============================================================
// Cache key constants
// ============================================================
export const CACHE_KEYS = {
  xlmBalance: (address: string) => `xlm_balance:${address}`,
  tokenBalance: (contractId: string, address: string) =>
    `token_balance:${contractId}:${address}`,
  poolInfo: (swapContractId: string) => `pool_info:${swapContractId}`,
  poolReserves: (swapContractId: string) => `pool_reserves:${swapContractId}`,
  swapQuote: (direction: string, amount: string) =>
    `swap_quote:${direction}:${amount}`,
  tokenMetadata: (contractId: string) => `token_meta:${contractId}`,
} as const;

// ============================================================
// TTL constants (milliseconds)
// ============================================================
export const CACHE_TTL = {
  balance: 15_000,      // 15 seconds for balances
  poolInfo: 10_000,     // 10 seconds for pool reserves
  swapQuote: 5_000,     // 5 seconds for price quotes
  tokenMetadata: 300_000, // 5 minutes for token metadata (rarely changes)
} as const;
