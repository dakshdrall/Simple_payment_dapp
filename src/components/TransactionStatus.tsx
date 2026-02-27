'use client';

import React from 'react';
import { Transaction, TransactionStatus as TxStatus, TransactionType } from '@/types';
import { shortenAddress } from '@/lib/stellar';

// ============================================================
// TransactionStatus Component — Real-time transaction tracking
// ============================================================

interface TransactionStatusProps {
  transactions: Transaction[];
  onClear: () => void;
}

export function TransactionStatusPanel({ transactions, onClear }: TransactionStatusProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-stellar-card border border-stellar-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Transaction History</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No transactions yet</p>
          <p className="text-xs mt-1">Your transaction history will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stellar-card border border-stellar-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-stellar flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Transactions</h2>
            <p className="text-xs text-gray-500">{transactions.length} total</p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Transaction List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Single Transaction Item
// ============================================================

interface TransactionItemProps {
  transaction: Transaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const { hash, type, status, amount, recipient, timestamp, error, ledger } = transaction;

  return (
    <div className={`rounded-xl p-4 border transition-all duration-300 ${getStatusBg(status)}`}>
      {/* Row 1: Type + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconBg(status)}`}>
            <span className="text-base">{getTxTypeIcon(type)}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{getTxTypeLabel(type)}</p>
            <p className="text-xs text-gray-500">{formatTime(timestamp)}</p>
          </div>
        </div>

        <StatusBadge status={status} />
      </div>

      {/* Row 2: Amount / Details */}
      {amount && (
        <div className="mt-2.5 flex items-center gap-1.5 text-sm">
          <span className="text-gray-500">Amount:</span>
          <span className="text-white font-semibold">{amount} XLM</span>
        </div>
      )}

      {recipient && (
        <div className="mt-1 flex items-center gap-1.5 text-sm">
          <span className="text-gray-500">To:</span>
          <span className="text-gray-300 font-mono text-xs">{shortenAddress(recipient)}</span>
        </div>
      )}

      {/* Transaction Hash */}
      {hash && (
        <div className="mt-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Hash:</span>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-stellar-blue hover:text-blue-300 transition-colors truncate"
              title={hash}
            >
              {hash.slice(0, 20)}...{hash.slice(-8)}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(hash)}
              className="text-gray-600 hover:text-gray-400 transition-colors"
              title="Copy hash"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Ledger */}
      {ledger && (
        <div className="mt-1 text-xs text-gray-600">
          Ledger #{ledger}
        </div>
      )}

      {/* Error */}
      {error && status === 'error' && (
        <div className="mt-2.5 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Pending Indicator */}
      {['building', 'signing', 'submitting', 'pending'].includes(status) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-blue-400">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          {status === 'building' && 'Building transaction...'}
          {status === 'signing' && 'Waiting for wallet signature...'}
          {status === 'submitting' && 'Submitting to network...'}
          {status === 'pending' && 'Waiting for confirmation...'}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Status Badge
// ============================================================

function StatusBadge({ status }: { status: TxStatus }) {
  const configs: Record<TxStatus, { label: string; className: string; dot?: string }> = {
    idle: { label: 'Idle', className: 'text-gray-500 bg-gray-800' },
    building: { label: 'Building', className: 'text-blue-400 bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-400' },
    signing: { label: 'Signing', className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-400' },
    submitting: { label: 'Submitting', className: 'text-blue-400 bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-400' },
    pending: { label: 'Pending', className: 'text-blue-400 bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-400' },
    success: { label: 'Success', className: 'text-green-400 bg-green-500/10 border border-green-500/30' },
    error: { label: 'Failed', className: 'text-red-400 bg-red-500/10 border border-red-500/30' },
  };

  const config = configs[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${config.className}`}>
      {config.dot && (
        <div className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      )}
      {status === 'success' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {status === 'error' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {config.label}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function getStatusBg(status: TxStatus): string {
  switch (status) {
    case 'success': return 'bg-green-500/5 border-green-500/20';
    case 'error': return 'bg-red-500/5 border-red-500/20';
    case 'building':
    case 'signing':
    case 'submitting':
    case 'pending': return 'bg-blue-500/5 border-blue-500/20';
    default: return 'bg-gray-900 border-gray-800';
  }
}

function getIconBg(status: TxStatus): string {
  switch (status) {
    case 'success': return 'bg-green-500/20';
    case 'error': return 'bg-red-500/20';
    case 'signing': return 'bg-yellow-500/20';
    default: return 'bg-blue-500/20';
  }
}

function getTxTypeIcon(type: TransactionType): string {
  switch (type) {
    case 'send_xlm': return '↗️';
    case 'swap_a_to_b': return '🔄';
    case 'swap_b_to_a': return '🔄';
    case 'add_liquidity': return '💧';
    case 'remove_liquidity': return '🔥';
    case 'mint_token': return '✨';
    case 'approve_token': return '✅';
    case 'contract_call': return '📜';
  }
}

function getTxTypeLabel(type: TransactionType): string {
  switch (type) {
    case 'send_xlm': return 'Send XLM';
    case 'swap_a_to_b': return 'Swap A → B';
    case 'swap_b_to_a': return 'Swap B → A';
    case 'add_liquidity': return 'Add Liquidity';
    case 'remove_liquidity': return 'Remove Liquidity';
    case 'mint_token': return 'Mint Tokens';
    case 'approve_token': return 'Token Approval';
    case 'contract_call': return 'Contract Call';
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
