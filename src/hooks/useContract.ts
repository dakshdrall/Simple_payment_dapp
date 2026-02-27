'use client';

import { useState, useCallback } from 'react';
import { Transaction, TransactionStatus, SwapDirection, PoolBalances } from '@/types';
import {
  invokeContract,
  getPoolReserves,
  getUserShares,
  getSwapQuote,
  CONTRACT_IDS,
} from '@/lib/contracts';
import {
  buildXLMPaymentTransaction,
  submitTransaction,
  pollTransactionStatus,
  isValidPublicKey,
  formatTokenAmount,
  DEFAULT_NETWORK,
} from '@/lib/stellar';
import { parseError } from '@/lib/errors';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { Address, nativeToScVal } from '@stellar/stellar-sdk';

// ============================================================
// Hook: useContract — contract interactions and transactions
// ============================================================

interface UseContractReturn {
  // State
  transactions: Transaction[];
  activeTransaction: Transaction | null;
  poolBalances: PoolBalances | null;
  isLoadingPool: boolean;

  // Actions
  sendXLM: (
    fromKey: string,
    toKey: string,
    amount: string,
    signTx: (xdr: string) => Promise<string>
  ) => Promise<void>;

  swapTokens: (
    direction: SwapDirection,
    amountIn: bigint,
    minAmountOut: bigint,
    publicKey: string,
    signTx: (xdr: string) => Promise<string>
  ) => Promise<void>;

  addLiquidity: (
    amountA: bigint,
    amountB: bigint,
    publicKey: string,
    signTx: (xdr: string) => Promise<string>
  ) => Promise<void>;

  removeLiquidity: (
    shares: bigint,
    publicKey: string,
    signTx: (xdr: string) => Promise<string>
  ) => Promise<void>;

  fetchPoolBalances: (publicKey: string) => Promise<void>;
  getQuote: (direction: SwapDirection, amountIn: bigint, publicKey: string) => Promise<bigint>;
  clearTransactions: () => void;
}

let txCounter = 0;
function newTxId() {
  return `tx-${Date.now()}-${++txCounter}`;
}

export function useContract(): UseContractReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
  const [poolBalances, setPoolBalances] = useState<PoolBalances | null>(null);
  const [isLoadingPool, setIsLoadingPool] = useState(false);

  const updateTx = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
    setActiveTransaction((prev) => (prev?.id === id ? { ...prev, ...updates } : prev));
  }, []);

  const addTx = useCallback((tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev.slice(0, 49)]);
    setActiveTransaction(tx);
  }, []);

  // ============================================================
  // Send XLM
  // ============================================================
  const sendXLM = useCallback(
    async (
      fromKey: string,
      toKey: string,
      amount: string,
      signTx: (xdr: string) => Promise<string>
    ) => {
      if (!isValidPublicKey(toKey)) {
        throw new Error('Invalid destination address');
      }

      const txId = newTxId();
      const tx: Transaction = {
        id: txId,
        hash: null,
        type: 'send_xlm',
        status: 'building',
        amount,
        recipient: toKey,
        timestamp: Date.now(),
      };

      addTx(tx);

      try {
        // Build
        updateTx(txId, { status: 'building' });
        const xdrString = await buildXLMPaymentTransaction(
          fromKey,
          toKey,
          amount,
          undefined,
          DEFAULT_NETWORK
        );

        // Sign
        updateTx(txId, { status: 'signing' });
        const signedXDR = await signTx(xdrString);

        // Submit
        updateTx(txId, { status: 'submitting' });
        const result = await submitTransaction(signedXDR, DEFAULT_NETWORK);

        updateTx(txId, { status: 'pending', hash: result.hash });

        // Poll
        const finalResult = await pollTransactionStatus(result.hash, DEFAULT_NETWORK);

        updateTx(txId, {
          status: finalResult.status === 'SUCCESS' ? 'success' : 'error',
          ledger: finalResult.ledger,
          error: finalResult.error,
        });

        // Invalidate balance cache
        cache.invalidatePrefix(`xlm_balance:${fromKey}`);
        cache.invalidatePrefix(`xlm_balance:${toKey}`);
      } catch (error) {
        const parsed = parseError(error);
        updateTx(txId, { status: 'error', error: parsed.message });
        throw error;
      }
    },
    [addTx, updateTx]
  );

  // ============================================================
  // Swap Tokens
  // ============================================================
  const swapTokens = useCallback(
    async (
      direction: SwapDirection,
      amountIn: bigint,
      minAmountOut: bigint,
      publicKey: string,
      signTx: (xdr: string) => Promise<string>
    ) => {
      const txId = newTxId();
      const tx: Transaction = {
        id: txId,
        hash: null,
        type: direction === 'a_to_b' ? 'swap_a_to_b' : 'swap_b_to_a',
        status: 'building',
        amountIn: amountIn.toString(),
        timestamp: Date.now(),
      };

      addTx(tx);

      try {
        const functionName = direction === 'a_to_b' ? 'swap_a_for_b' : 'swap_b_for_a';

        updateTx(txId, { status: 'signing' });
        const hash = await invokeContract({
          contractId: CONTRACT_IDS.swap,
          functionName,
          args: [
            new Address(publicKey).toScVal(),
            nativeToScVal(amountIn, { type: 'i128' }),
            nativeToScVal(minAmountOut, { type: 'i128' }),
          ],
          publicKey,
          signTransaction: signTx,
          network: DEFAULT_NETWORK,
        });

        updateTx(txId, { status: 'success', hash });

        // Invalidate pool and token caches
        cache.invalidatePrefix(`pool_`);
        cache.invalidatePrefix(`token_balance:`);
      } catch (error) {
        const parsed = parseError(error);
        updateTx(txId, { status: 'error', error: parsed.message });
        throw error;
      }
    },
    [addTx, updateTx]
  );

  // ============================================================
  // Add Liquidity
  // ============================================================
  const addLiquidity = useCallback(
    async (
      amountA: bigint,
      amountB: bigint,
      publicKey: string,
      signTx: (xdr: string) => Promise<string>
    ) => {
      const txId = newTxId();
      const tx: Transaction = {
        id: txId,
        hash: null,
        type: 'add_liquidity',
        status: 'building',
        amountIn: amountA.toString(),
        amountOut: amountB.toString(),
        timestamp: Date.now(),
      };

      addTx(tx);

      try {
        const minShares = BigInt(1); // Accept any shares

        updateTx(txId, { status: 'signing' });
        const hash = await invokeContract({
          contractId: CONTRACT_IDS.swap,
          functionName: 'add_liquidity',
          args: [
            new Address(publicKey).toScVal(),
            nativeToScVal(amountA, { type: 'i128' }),
            nativeToScVal(amountB, { type: 'i128' }),
            nativeToScVal(minShares, { type: 'i128' }),
          ],
          publicKey,
          signTransaction: signTx,
          network: DEFAULT_NETWORK,
        });

        updateTx(txId, { status: 'success', hash });
        cache.invalidatePrefix('pool_');
        cache.invalidatePrefix('token_balance:');
      } catch (error) {
        const parsed = parseError(error);
        updateTx(txId, { status: 'error', error: parsed.message });
        throw error;
      }
    },
    [addTx, updateTx]
  );

  // ============================================================
  // Remove Liquidity
  // ============================================================
  const removeLiquidity = useCallback(
    async (
      shares: bigint,
      publicKey: string,
      signTx: (xdr: string) => Promise<string>
    ) => {
      const txId = newTxId();
      const tx: Transaction = {
        id: txId,
        hash: null,
        type: 'remove_liquidity',
        status: 'building',
        timestamp: Date.now(),
      };

      addTx(tx);

      try {
        updateTx(txId, { status: 'signing' });
        const hash = await invokeContract({
          contractId: CONTRACT_IDS.swap,
          functionName: 'remove_liquidity',
          args: [
            new Address(publicKey).toScVal(),
            nativeToScVal(shares, { type: 'i128' }),
            nativeToScVal(BigInt(0), { type: 'i128' }),
            nativeToScVal(BigInt(0), { type: 'i128' }),
          ],
          publicKey,
          signTransaction: signTx,
          network: DEFAULT_NETWORK,
        });

        updateTx(txId, { status: 'success', hash });
        cache.invalidatePrefix('pool_');
        cache.invalidatePrefix('token_balance:');
      } catch (error) {
        const parsed = parseError(error);
        updateTx(txId, { status: 'error', error: parsed.message });
        throw error;
      }
    },
    [addTx, updateTx]
  );

  // ============================================================
  // Pool Info
  // ============================================================
  const fetchPoolBalances = useCallback(async (publicKey: string) => {
    setIsLoadingPool(true);

    try {
      const cacheKey = CACHE_KEYS.poolReserves(CONTRACT_IDS.swap);
      const cached = cache.get<PoolBalances>(cacheKey);

      if (cached) {
        setPoolBalances(cached);
        setIsLoadingPool(false);
        return;
      }

      const [reserves, userShares] = await Promise.all([
        getPoolReserves(CONTRACT_IDS.swap, publicKey, DEFAULT_NETWORK),
        getUserShares(CONTRACT_IDS.swap, publicKey, publicKey, DEFAULT_NETWORK),
      ]);

      const poolData: PoolBalances = {
        reserveA: formatTokenAmount(reserves.reserveA, 7),
        reserveB: formatTokenAmount(reserves.reserveB, 7),
        totalShares: '0',
        userShares: formatTokenAmount(userShares, 7),
        lastUpdated: Date.now(),
      };

      cache.set(cacheKey, poolData, CACHE_TTL.poolInfo);
      setPoolBalances(poolData);
    } catch {
      setPoolBalances(null);
    }

    setIsLoadingPool(false);
  }, []);

  const getQuote = useCallback(
    async (
      direction: SwapDirection,
      amountIn: bigint,
      publicKey: string
    ): Promise<bigint> => {
      const cacheKey = CACHE_KEYS.swapQuote(direction, amountIn.toString());
      const cached = cache.get<string>(cacheKey);
      if (cached) return BigInt(cached);

      const quote = await getSwapQuote(
        CONTRACT_IDS.swap,
        direction,
        amountIn,
        publicKey,
        DEFAULT_NETWORK
      );

      cache.set(cacheKey, quote.toString(), CACHE_TTL.swapQuote);
      return quote;
    },
    []
  );

  const clearTransactions = useCallback(() => {
    setTransactions([]);
    setActiveTransaction(null);
  }, []);

  return {
    transactions,
    activeTransaction,
    poolBalances,
    isLoadingPool,
    sendXLM,
    swapTokens,
    addLiquidity,
    removeLiquidity,
    fetchPoolBalances,
    getQuote,
    clearTransactions,
  };
}
