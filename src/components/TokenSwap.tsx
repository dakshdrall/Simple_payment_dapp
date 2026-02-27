'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { SwapDirection, Transaction, PoolBalances } from '@/types';
import { formatTokenAmount } from '@/lib/stellar';
import { LoadingSpinner, TransactionProgress } from './LoadingSpinner';

// ============================================================
// TokenSwap Component
// ============================================================

interface TokenSwapProps {
  publicKey: string;
  tokenBalance: bigint;
  xlmBalance: string;
  poolBalances: PoolBalances | null;
  isLoadingPool: boolean;
  onSwap: (
    direction: SwapDirection,
    amountIn: bigint,
    minAmountOut: bigint,
    signTx: (xdr: string) => Promise<string>
  ) => Promise<void>;
  onAddLiquidity: (
    amountA: bigint,
    amountB: bigint,
    signTx: (xdr: string) => Promise<string>
  ) => Promise<void>;
  onRemoveLiquidity: (
    shares: bigint,
    signTx: (xdr: string) => Promise<string>
  ) => Promise<void>;
  onGetQuote: (direction: SwapDirection, amountIn: bigint) => Promise<bigint>;
  signTransaction: (xdr: string) => Promise<string>;
  activeTransaction: Transaction | null;
}

type TabType = 'swap' | 'add' | 'remove';

export function TokenSwap({
  publicKey,
  tokenBalance,
  xlmBalance,
  poolBalances,
  isLoadingPool,
  onSwap,
  onAddLiquidity,
  onRemoveLiquidity,
  onGetQuote,
  signTransaction,
  activeTransaction,
}: TokenSwapProps) {
  const [activeTab, setActiveTab] = useState<TabType>('swap');
  const [direction, setDirection] = useState<SwapDirection>('a_to_b');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState(0.5); // 0.5%
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Add liquidity state
  const [liquidityAmountA, setLiquidityAmountA] = useState('');
  const [liquidityAmountB, setLiquidityAmountB] = useState('');
  const [removeLiqAmount, setRemoveLiqAmount] = useState('');

  const txStatus = activeTransaction?.status;
  const isTxPending = ['building', 'signing', 'submitting', 'pending'].includes(txStatus || '');

  // Fetch quote when amount changes
  useEffect(() => {
    if (!amountIn || !publicKey) {
      setAmountOut('');
      return;
    }

    const amount = parseFloat(amountIn);
    if (isNaN(amount) || amount <= 0) {
      setAmountOut('');
      return;
    }

    const debounce = setTimeout(async () => {
      setIsQuoting(true);
      try {
        const amountInRaw = BigInt(Math.floor(amount * 10_000_000));
        const quote = await onGetQuote(direction, amountInRaw);
        setAmountOut(formatTokenAmount(quote, 7));
      } catch {
        setAmountOut('0');
      } finally {
        setIsQuoting(false);
      }
    }, 600);

    return () => clearTimeout(debounce);
  }, [amountIn, direction, onGetQuote, publicKey]);

  const handleSwap = useCallback(async () => {
    setError('');
    const amount = parseFloat(amountIn);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    const amountInRaw = BigInt(Math.floor(amount * 10_000_000));
    const amountOutRaw = BigInt(Math.floor(parseFloat(amountOut || '0') * 10_000_000));
    const slippageFactor = 1 - slippage / 100;
    const minAmountOut = BigInt(Math.floor(Number(amountOutRaw) * slippageFactor));

    setIsSubmitting(true);
    try {
      await onSwap(direction, amountInRaw, minAmountOut, signTransaction);
      setAmountIn('');
      setAmountOut('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [amountIn, amountOut, direction, slippage, onSwap, signTransaction]);

  const handleAddLiquidity = useCallback(async () => {
    setError('');
    const a = parseFloat(liquidityAmountA);
    const b = parseFloat(liquidityAmountB);

    if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) {
      setError('Enter valid amounts for both tokens');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddLiquidity(
        BigInt(Math.floor(a * 10_000_000)),
        BigInt(Math.floor(b * 10_000_000)),
        signTransaction
      );
      setLiquidityAmountA('');
      setLiquidityAmountB('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add liquidity');
    } finally {
      setIsSubmitting(false);
    }
  }, [liquidityAmountA, liquidityAmountB, onAddLiquidity, signTransaction]);

  const handleRemoveLiquidity = useCallback(async () => {
    setError('');
    const shares = parseFloat(removeLiqAmount);

    if (isNaN(shares) || shares <= 0) {
      setError('Enter a valid share amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRemoveLiquidity(
        BigInt(Math.floor(shares * 10_000_000)),
        signTransaction
      );
      setRemoveLiqAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove liquidity');
    } finally {
      setIsSubmitting(false);
    }
  }, [removeLiqAmount, onRemoveLiquidity, signTransaction]);

  const flipDirection = () => {
    setDirection((prev) => (prev === 'a_to_b' ? 'b_to_a' : 'a_to_b'));
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  };

  const tokenSymbolA = 'SST';
  const tokenSymbolB = 'SST-B';
  const fromSymbol = direction === 'a_to_b' ? tokenSymbolA : tokenSymbolB;
  const toSymbol = direction === 'a_to_b' ? tokenSymbolB : tokenSymbolA;

  return (
    <div className="bg-stellar-card border border-stellar-border rounded-2xl overflow-hidden">
      {/* Header Tabs */}
      <div className="flex border-b border-stellar-border">
        {(['swap', 'add', 'remove'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(''); }}
            className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab
                ? 'text-white border-b-2 border-stellar-blue bg-stellar-blue/5'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'swap' && '🔄 Swap'}
            {tab === 'add' && '➕ Add Liquidity'}
            {tab === 'remove' && '➖ Remove'}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Pool Info */}
        {poolBalances && (
          <div className="bg-gray-900/50 rounded-xl p-3 mb-5 border border-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Pool Liquidity</span>
              {isLoadingPool && <LoadingSpinner size="sm" variant="muted" />}
            </div>
            <div className="flex gap-4">
              <div>
                <span className="text-xs text-gray-600">Reserve A: </span>
                <span className="text-xs font-semibold text-gray-300">{poolBalances.reserveA} SST</span>
              </div>
              <div>
                <span className="text-xs text-gray-600">Reserve B: </span>
                <span className="text-xs font-semibold text-gray-300">{poolBalances.reserveB} SST</span>
              </div>
            </div>
          </div>
        )}

        {/* ---- SWAP TAB ---- */}
        {activeTab === 'swap' && (
          <div className="space-y-3">
            {/* From Token */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">From</span>
                <span className="text-xs text-gray-500">
                  Balance: {direction === 'a_to_b'
                    ? formatTokenAmount(tokenBalance, 7)
                    : formatTokenAmount(tokenBalance, 7)} {fromSymbol}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 min-w-fit">
                  <div className="w-6 h-6 rounded-full bg-stellar-blue/30 flex items-center justify-center text-xs">🌊</div>
                  <span className="text-sm font-semibold text-white">{fromSymbol}</span>
                </div>
                <input
                  type="number"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="0.00"
                  disabled={isSubmitting || isTxPending}
                  className="flex-1 bg-transparent text-right text-xl font-bold text-white placeholder:text-gray-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Flip Button */}
            <div className="flex justify-center">
              <button
                onClick={flipDirection}
                disabled={isSubmitting || isTxPending}
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 hover:rotate-180"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* To Token */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">To (estimated)</span>
                <span className="text-xs text-gray-500">{toSymbol}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 min-w-fit">
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs">💜</div>
                  <span className="text-sm font-semibold text-white">{toSymbol}</span>
                </div>
                <div className="flex-1 flex items-center justify-end gap-2">
                  {isQuoting ? (
                    <LoadingSpinner size="sm" variant="muted" />
                  ) : (
                    <span className="text-xl font-bold text-white tabular-nums">
                      {amountOut || '0.00'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Slippage */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Slippage Tolerance</span>
              <div className="flex gap-1">
                {[0.1, 0.5, 1.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      slippage === s
                        ? 'bg-stellar-blue/20 text-stellar-blue border border-stellar-blue/30'
                        : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>

            {/* Tx Progress */}
            {isTxPending && activeTransaction && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <TransactionProgress status={activeTransaction.status} />
              </div>
            )}

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              disabled={isSubmitting || isTxPending || !amountIn}
              className="w-full flex items-center justify-center gap-2 bg-gradient-stellar hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all duration-200"
            >
              {isSubmitting || isTxPending ? (
                <>
                  <LoadingSpinner size="sm" variant="white" />
                  <span>
                    {txStatus === 'signing' ? 'Sign in wallet...' : 'Processing...'}
                  </span>
                </>
              ) : (
                'Swap Tokens'
              )}
            </button>
          </div>
        )}

        {/* ---- ADD LIQUIDITY TAB ---- */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 bg-stellar-blue/10 border border-stellar-blue/20 rounded-xl p-3">
              Add equal value of both tokens to earn trading fees from the pool.
            </p>

            <div className="space-y-3">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <label className="text-xs text-gray-500 mb-2 block">Token A (SST) Amount</label>
                <input
                  type="number"
                  value={liquidityAmountA}
                  onChange={(e) => setLiquidityAmountA(e.target.value)}
                  placeholder="0.00"
                  disabled={isSubmitting || isTxPending}
                  className="w-full bg-transparent text-xl font-bold text-white placeholder:text-gray-600 focus:outline-none"
                />
              </div>

              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <label className="text-xs text-gray-500 mb-2 block">Token B (SST-B) Amount</label>
                <input
                  type="number"
                  value={liquidityAmountB}
                  onChange={(e) => setLiquidityAmountB(e.target.value)}
                  placeholder="0.00"
                  disabled={isSubmitting || isTxPending}
                  className="w-full bg-transparent text-xl font-bold text-white placeholder:text-gray-600 focus:outline-none"
                />
              </div>
            </div>

            {isTxPending && activeTransaction && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <TransactionProgress status={activeTransaction.status} />
              </div>
            )}

            <button
              onClick={handleAddLiquidity}
              disabled={isSubmitting || isTxPending || !liquidityAmountA || !liquidityAmountB}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all"
            >
              {isSubmitting || isTxPending ? (
                <><LoadingSpinner size="sm" variant="white" /> Adding Liquidity...</>
              ) : (
                '➕ Add Liquidity'
              )}
            </button>
          </div>
        )}

        {/* ---- REMOVE LIQUIDITY TAB ---- */}
        {activeTab === 'remove' && (
          <div className="space-y-4">
            {poolBalances && (
              <div className="text-sm text-gray-400 bg-gray-900 rounded-xl p-3 border border-gray-800">
                Your Pool Shares: <span className="text-white font-bold">{poolBalances.userShares}</span>
              </div>
            )}

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <label className="text-xs text-gray-500 mb-2 block">Shares to Remove</label>
              <input
                type="number"
                value={removeLiqAmount}
                onChange={(e) => setRemoveLiqAmount(e.target.value)}
                placeholder="0.00"
                disabled={isSubmitting || isTxPending}
                className="w-full bg-transparent text-xl font-bold text-white placeholder:text-gray-600 focus:outline-none"
              />
            </div>

            {isTxPending && activeTransaction && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <TransactionProgress status={activeTransaction.status} />
              </div>
            )}

            <button
              onClick={handleRemoveLiquidity}
              disabled={isSubmitting || isTxPending || !removeLiqAmount}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all"
            >
              {isSubmitting || isTxPending ? (
                <><LoadingSpinner size="sm" variant="white" /> Removing...</>
              ) : (
                '➖ Remove Liquidity'
              )}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Success State */}
        {activeTransaction?.status === 'success' &&
          ['swap_a_to_b', 'swap_b_to_a', 'add_liquidity', 'remove_liquidity'].includes(activeTransaction.type) && (
          <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold text-green-400">Transaction Successful!</span>
            </div>
            {activeTransaction.hash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${activeTransaction.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs font-mono text-stellar-blue hover:text-blue-300 block break-all"
              >
                {activeTransaction.hash}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
