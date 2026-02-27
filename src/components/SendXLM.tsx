'use client';

import React, { useState, useCallback } from 'react';
import { Transaction } from '@/types';
import { isValidPublicKey } from '@/lib/stellar';
import { LoadingSpinner, TransactionProgress } from './LoadingSpinner';

// ============================================================
// SendXLM Component
// ============================================================

interface SendXLMProps {
  publicKey: string;
  xlmBalance: string;
  onSend: (toKey: string, amount: string, signTx: (xdr: string) => Promise<string>) => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
  activeTransaction: Transaction | null;
}

export function SendXLM({
  publicKey,
  xlmBalance,
  onSend,
  signTransaction,
  activeTransaction,
}: SendXLMProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<Transaction | null>(null);

  const maxAmount = Math.max(0, parseFloat(xlmBalance) - 1).toFixed(4);

  const validateForm = (): boolean => {
    let valid = true;

    // Validate recipient
    if (!recipient) {
      setRecipientError('Recipient address is required');
      valid = false;
    } else if (!isValidPublicKey(recipient)) {
      setRecipientError('Invalid Stellar address (must start with G)');
      valid = false;
    } else if (recipient === publicKey) {
      setRecipientError('Cannot send to yourself');
      valid = false;
    } else {
      setRecipientError('');
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount) {
      setAmountError('Amount is required');
      valid = false;
    } else if (isNaN(amountNum) || amountNum <= 0) {
      setAmountError('Amount must be greater than 0');
      valid = false;
    } else if (amountNum > parseFloat(xlmBalance) - 1) {
      setAmountError(`Insufficient balance (max: ${maxAmount} XLM, keeping 1 XLM for fees)`);
      valid = false;
    } else {
      setAmountError('');
    }

    return valid;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) return;

      setIsSubmitting(true);
      setSuccessTx(null);

      try {
        await onSend(recipient, amount, signTransaction);
        setSuccessTx(activeTransaction);
        setRecipient('');
        setAmount('');
      } catch {
        // Error is handled by the hook and shown via activeTransaction
      } finally {
        setIsSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipient, amount, onSend, signTransaction]
  );

  const txStatus = activeTransaction?.status;
  const isTxPending = ['building', 'signing', 'submitting', 'pending'].includes(txStatus || '');

  return (
    <div className="bg-stellar-card border border-stellar-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Send XLM</h2>
          <p className="text-xs text-gray-500">Transfer XLM on Stellar Testnet</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipient Field */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value.trim());
              if (recipientError) setRecipientError('');
            }}
            placeholder="G... (Stellar public key)"
            disabled={isSubmitting || isTxPending}
            className={`w-full bg-gray-900 border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 transition-all ${
              recipientError
                ? 'border-red-500/50 focus:ring-red-500/30'
                : 'border-gray-800 focus:ring-stellar-blue/30 focus:border-stellar-blue/50'
            }`}
          />
          {recipientError && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {recipientError}
            </p>
          )}
        </div>

        {/* Amount Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-400">Amount</label>
            <button
              type="button"
              onClick={() => setAmount(maxAmount)}
              className="text-xs text-stellar-blue hover:text-blue-300 transition-colors"
            >
              Max: {maxAmount} XLM
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (amountError) setAmountError('');
              }}
              placeholder="0.00"
              min="0.0000001"
              step="0.0000001"
              disabled={isSubmitting || isTxPending}
              className={`w-full bg-gray-900 border rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 transition-all pr-16 ${
                amountError
                  ? 'border-red-500/50 focus:ring-red-500/30'
                  : 'border-gray-800 focus:ring-stellar-blue/30 focus:border-stellar-blue/50'
              }`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-sm">⭐</span>
              <span className="text-sm font-semibold text-gray-400">XLM</span>
            </div>
          </div>
          {amountError && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {amountError}
            </p>
          )}
        </div>

        {/* Transaction Progress */}
        {isTxPending && activeTransaction && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <TransactionProgress status={activeTransaction.status} />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isTxPending || !recipient || !amount}
          className="w-full flex items-center justify-center gap-2 bg-gradient-stellar hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-stellar"
        >
          {isSubmitting || isTxPending ? (
            <>
              <LoadingSpinner size="sm" variant="white" />
              <span>
                {txStatus === 'building' && 'Building transaction...'}
                {txStatus === 'signing' && 'Sign in your wallet...'}
                {txStatus === 'submitting' && 'Submitting...'}
                {txStatus === 'pending' && 'Confirming...'}
                {(!txStatus || txStatus === 'idle') && 'Processing...'}
              </span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send XLM
            </>
          )}
        </button>
      </form>

      {/* Success State */}
      {activeTransaction?.status === 'success' && (
        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-400">Transaction Successful!</p>
              {activeTransaction.hash && (
                <div className="mt-1">
                  <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${activeTransaction.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-stellar-blue hover:text-blue-300 break-all"
                  >
                    {activeTransaction.hash}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {activeTransaction?.status === 'error' && activeTransaction.type === 'send_xlm' && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-400">Transaction Failed</p>
              <p className="text-xs text-red-300/70 mt-0.5">{activeTransaction.error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
