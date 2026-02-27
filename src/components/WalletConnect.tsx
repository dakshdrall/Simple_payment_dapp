'use client';

import React, { useState } from 'react';
import { WalletState, WalletType, WalletInfo, WalletErrorCode } from '@/types';
import { shortenAddress } from '@/lib/stellar';
import { getErrorLabel } from '@/lib/errors';
import { LoadingSpinner } from './LoadingSpinner';

// ============================================================
// Supported Wallets Config
// ============================================================

const SUPPORTED_WALLETS: WalletInfo[] = [
  {
    id: 'freighter',
    name: 'Freighter',
    icon: '🔮',
    description: 'Official Stellar wallet by SDF',
  },
  {
    id: 'xbull',
    name: 'xBull',
    icon: '🐂',
    description: 'Feature-rich Stellar wallet',
  },
  {
    id: 'albedo',
    name: 'Albedo',
    icon: '🌟',
    description: 'Web-based Stellar signer',
  },
];

// ============================================================
// WalletConnect Component
// ============================================================

interface WalletConnectProps {
  walletState: WalletState;
  onConnect: (walletType?: WalletType) => Promise<void>;
  onDisconnect: () => void;
  onOpenModal?: () => void;
}

export function WalletConnect({
  walletState,
  onConnect,
  onDisconnect,
  onOpenModal,
}: WalletConnectProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  const { isConnected, publicKey, walletType, isLoading, error, network } = walletState;

  const handleConnectWallet = async (id: WalletType) => {
    setShowWalletPicker(false);
    await onConnect(id);
  };

  if (isConnected && publicKey) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 bg-stellar-card border border-stellar-border hover:border-stellar-blue/50 rounded-xl px-4 py-2.5 transition-all duration-200 group"
        >
          {/* Status indicator */}
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-stellar flex items-center justify-center text-sm font-bold text-white">
              {publicKey.slice(0, 2)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-stellar-dark" />
          </div>

          {/* Address */}
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs text-gray-500">
              {walletType?.charAt(0).toUpperCase()}{walletType?.slice(1)}
            </span>
            <span className="text-sm font-mono text-gray-200 group-hover:text-white transition-colors">
              {shortenAddress(publicKey)}
            </span>
          </div>

          {/* Network badge */}
          <span className="hidden md:block text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-2 py-0.5">
            {network}
          </span>

          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-stellar-card border border-stellar-border rounded-xl shadow-2xl z-50 animate-fade-in">
            <div className="p-4 border-b border-stellar-border">
              <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
              <p className="text-sm font-mono text-gray-200 break-all">{publicKey}</p>
            </div>

            <div className="p-2">
              <button
                onClick={() => {
                  const url = `https://stellar.expert/explorer/testnet/account/${publicKey}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Explorer
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicKey);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Address
              </button>

              <div className="border-t border-stellar-border my-2" />

              <button
                onClick={() => {
                  onDisconnect();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Connect Button */}
      <button
        onClick={() => setShowWalletPicker(true)}
        disabled={isLoading}
        className="flex items-center gap-2 bg-gradient-stellar hover:opacity-90 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-stellar hover:shadow-stellar-hover"
      >
        {isLoading ? (
          <LoadingSpinner size="sm" variant="white" />
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
          </svg>
        )}
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 max-w-xs text-right">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <span className="font-semibold">{getErrorLabel(error.code)}:</span> {error.message}
          </span>
        </div>
      )}

      {/* Wallet Picker Modal */}
      {showWalletPicker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-stellar-card border border-stellar-border rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stellar-border">
              <div>
                <h2 className="text-lg font-bold text-white">Connect Wallet</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose your Stellar wallet</p>
              </div>
              <button
                onClick={() => setShowWalletPicker(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Wallet Options */}
            <div className="p-4 space-y-2">
              {SUPPORTED_WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnectWallet(wallet.id)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-4 p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-stellar-blue/50 rounded-xl transition-all duration-200 group disabled:opacity-50"
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white group-hover:text-stellar-blue transition-colors">
                      {wallet.name}
                    </p>
                    <p className="text-xs text-gray-500">{wallet.description}</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-600 group-hover:text-stellar-blue transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 pt-0">
              <p className="text-xs text-center text-gray-600">
                By connecting, you agree to the{' '}
                <span className="text-stellar-blue">Terms of Service</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
