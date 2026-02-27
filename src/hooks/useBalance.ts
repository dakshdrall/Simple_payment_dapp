'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { XLMBalance, TokenBalance } from '@/types';
import { fetchXLMBalance, formatXLM, formatTokenAmount } from '@/lib/stellar';
import { getTokenBalance, getTokenMetadata, CONTRACT_IDS } from '@/lib/contracts';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { DEFAULT_NETWORK } from '@/lib/stellar';

// ============================================================
// Hook: useBalance — XLM + Token balance with caching
// ============================================================

interface UseBalanceReturn {
  xlmBalance: XLMBalance;
  tokenBalance: TokenBalance | null;
  refreshBalance: () => Promise<void>;
  isRefreshing: boolean;
}

export function useBalance(publicKey: string | null): UseBalanceReturn {
  const [xlmBalance, setXlmBalance] = useState<XLMBalance>({
    balance: '0',
    balanceRaw: '0',
    lastUpdated: 0,
    isLoading: false,
    error: null,
  });

  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalances = useCallback(async (forceRefresh = false) => {
    if (!publicKey) return;

    setIsRefreshing(true);

    // ---- Fetch XLM Balance ----
    const xlmCacheKey = CACHE_KEYS.xlmBalance(publicKey);

    if (!forceRefresh) {
      const cached = cache.get<string>(xlmCacheKey);
      if (cached) {
        setXlmBalance({
          balance: formatXLM(cached),
          balanceRaw: cached,
          lastUpdated: Date.now(),
          isLoading: false,
          error: null,
        });
      }
    }

    try {
      setXlmBalance((prev) => ({ ...prev, isLoading: true, error: null }));
      const rawBalance = await fetchXLMBalance(publicKey, DEFAULT_NETWORK);

      cache.set(xlmCacheKey, rawBalance, CACHE_TTL.balance);

      setXlmBalance({
        balance: formatXLM(rawBalance),
        balanceRaw: rawBalance,
        lastUpdated: Date.now(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setXlmBalance((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balance',
      }));
    }

    // ---- Fetch Token Balance ----
    const tokenCacheKey = CACHE_KEYS.tokenBalance(CONTRACT_IDS.token, publicKey);
    const metaCacheKey = CACHE_KEYS.tokenMetadata(CONTRACT_IDS.token);

    try {
      // Get metadata (cached for 5 minutes)
      let meta = cache.get<{ name: string; symbol: string; decimals: number }>(metaCacheKey);
      if (!meta) {
        meta = await getTokenMetadata(CONTRACT_IDS.token, publicKey, DEFAULT_NETWORK);
        cache.set(metaCacheKey, meta, CACHE_TTL.tokenMetadata);
      }

      // Get balance
      let rawTokenBalance: bigint;
      if (!forceRefresh) {
        const cached = cache.get<string>(tokenCacheKey);
        if (cached) {
          rawTokenBalance = BigInt(cached);
        } else {
          rawTokenBalance = await getTokenBalance(CONTRACT_IDS.token, publicKey, publicKey, DEFAULT_NETWORK);
          cache.set(tokenCacheKey, rawTokenBalance.toString(), CACHE_TTL.balance);
        }
      } else {
        rawTokenBalance = await getTokenBalance(CONTRACT_IDS.token, publicKey, publicKey, DEFAULT_NETWORK);
        cache.set(tokenCacheKey, rawTokenBalance.toString(), CACHE_TTL.balance);
      }

      setTokenBalance({
        contractId: CONTRACT_IDS.token,
        symbol: meta.symbol,
        name: meta.name,
        decimals: meta.decimals,
        balance: formatTokenAmount(rawTokenBalance, meta.decimals),
        balanceRaw: rawTokenBalance,
        lastUpdated: Date.now(),
      });
    } catch {
      setTokenBalance({
        contractId: CONTRACT_IDS.token,
        symbol: 'SST',
        name: 'Stellar Swap Token',
        decimals: 7,
        balance: '0.0000',
        balanceRaw: BigInt(0),
        lastUpdated: Date.now(),
      });
    }

    setIsRefreshing(false);
  }, [publicKey]);

  const refreshBalance = useCallback(async () => {
    // Invalidate cache entries
    if (publicKey) {
      cache.invalidatePrefix(`xlm_balance:${publicKey}`);
      cache.invalidatePrefix(`token_balance:${CONTRACT_IDS.token}:${publicKey}`);
    }
    await fetchBalances(true);
  }, [fetchBalances, publicKey]);

  // Initial load
  useEffect(() => {
    if (publicKey) {
      fetchBalances();
    } else {
      setXlmBalance({
        balance: '0',
        balanceRaw: '0',
        lastUpdated: 0,
        isLoading: false,
        error: null,
      });
      setTokenBalance(null);
    }
  }, [publicKey, fetchBalances]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!publicKey) return;

    intervalRef.current = setInterval(() => {
      fetchBalances();
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [publicKey, fetchBalances]);

  return {
    xlmBalance,
    tokenBalance,
    refreshBalance,
    isRefreshing,
  };
}
