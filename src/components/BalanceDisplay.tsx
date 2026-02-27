'use client';

import React from 'react';
import { XLMBalance, TokenBalance, PoolBalances } from '@/types';
import { SkeletonBalance } from './LoadingSpinner';

// ============================================================
// BalanceDisplay Component
// ============================================================

interface BalanceDisplayProps {
  xlmBalance: XLMBalance;
  tokenBalance: TokenBalance | null;
  poolBalances: PoolBalances | null;
  publicKey: string | null;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function BalanceDisplay({
  xlmBalance,
  tokenBalance,
  poolBalances,
  publicKey,
  onRefresh,
  isRefreshing,
}: BalanceDisplayProps) {
  if (!publicKey) {
    return (
      <div className="bg-stellar-card border border-stellar-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Portfolio</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>Connect your wallet to view balances</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stellar-card border border-stellar-border rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-stellar flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Portfolio</h2>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-white disabled:opacity-50"
          title="Refresh balances"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* XLM Balance */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <span className="text-lg">⭐</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stellar Lumens</p>
              <p className="text-xs text-gray-600 font-mono">XLM</p>
            </div>
          </div>

          <div className="text-right">
            {xlmBalance.isLoading ? (
              <SkeletonBalance />
            ) : xlmBalance.error ? (
              <div className="text-sm text-red-400">Error loading</div>
            ) : (
              <>
                <p className="text-xl font-bold text-white tabular-nums">
                  {xlmBalance.balance}
                </p>
                <p className="text-xs text-gray-500">XLM</p>
              </>
            )}
          </div>
        </div>

        {xlmBalance.lastUpdated > 0 && !xlmBalance.isLoading && (
          <p className="text-xs text-gray-600 mt-2">
            Updated {formatTimeAgo(xlmBalance.lastUpdated)}
          </p>
        )}
      </div>

      {/* Token Balance */}
      {tokenBalance && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stellar-blue/20 border border-stellar-blue/30 flex items-center justify-center">
                <span className="text-lg">🌊</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">{tokenBalance.name}</p>
                <p className="text-xs text-gray-600 font-mono">{tokenBalance.symbol}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xl font-bold text-white tabular-nums">
                {tokenBalance.balance}
              </p>
              <p className="text-xs text-gray-500">{tokenBalance.symbol}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pool Position */}
      {poolBalances && parseFloat(poolBalances.userShares) > 0 && (
        <div className="bg-gradient-to-r from-stellar-blue/10 to-stellar-purple/10 rounded-xl p-4 border border-stellar-blue/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">💧</span>
            <p className="text-sm font-semibold text-gray-300">Pool Position</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Your Shares</p>
              <p className="text-sm font-bold text-white">{poolBalances.userShares}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Reserve A</p>
              <p className="text-sm font-bold text-white">{poolBalances.reserveA}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Reserve B</p>
              <p className="text-sm font-bold text-white">{poolBalances.reserveB}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {xlmBalance.error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{xlmBalance.error}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Compact Balance Badge (for header)
// ============================================================

interface BalanceBadgeProps {
  xlmBalance: XLMBalance;
  isLoading: boolean;
}

export function BalanceBadge({ xlmBalance, isLoading }: BalanceBadgeProps) {
  if (isLoading || xlmBalance.isLoading) {
    return (
      <div className="hidden sm:flex items-center gap-1 bg-stellar-card border border-stellar-border rounded-lg px-3 py-1.5">
        <div className="w-16 h-4 bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="hidden sm:flex items-center gap-2 bg-stellar-card border border-stellar-border rounded-lg px-3 py-1.5">
      <span className="text-sm">⭐</span>
      <span className="text-sm font-semibold text-white tabular-nums">
        {xlmBalance.balance} XLM
      </span>
    </div>
  );
}

// ============================================================
// Utility
// ============================================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
