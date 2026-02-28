'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useBalance } from '@/hooks/useBalance';
import { useContract } from '@/hooks/useContract';
import { useEvents } from '@/hooks/useEvents';
import { WalletConnect } from '@/components/WalletConnect';
import { BalanceDisplay, BalanceBadge } from '@/components/BalanceDisplay';
import { SendXLM } from '@/components/SendXLM';
import { TokenSwap } from '@/components/TokenSwap';
import { TransactionStatusPanel } from '@/components/TransactionStatus';
import { EventFeed } from '@/components/EventFeed';
import { CONTRACT_IDS } from '@/lib/contracts';
import { SwapDirection } from '@/types';

// ============================================================
// Main Application Page
// ============================================================

export default function HomePage() {
  const wallet = useWallet();
  const { xlmBalance, tokenBalance, refreshBalance, isRefreshing } = useBalance(wallet.publicKey);
  const {
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
  } = useContract();
  const { events, isStreaming, lastLedger, startStreaming, stopStreaming, clearEvents } = useEvents(
    wallet.isConnected
  );

  const [activeSection, setActiveSection] = useState<'swap' | 'send' | 'events'>('swap');
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

  // Fetch pool info when wallet connects
  useEffect(() => {
    if (wallet.publicKey) {
      fetchPoolBalances(wallet.publicKey);
    }
  }, [wallet.publicKey, fetchPoolBalances]);

  // Refresh balances after successful transactions
  useEffect(() => {
    if (activeTransaction?.status === 'success') {
      refreshBalance();
      if (wallet.publicKey) {
        fetchPoolBalances(wallet.publicKey);
      }
    }
  }, [activeTransaction?.status, refreshBalance, wallet.publicKey, fetchPoolBalances]);

  const handleGetQuote = async (direction: SwapDirection, amountIn: bigint) => {
    if (!wallet.publicKey) return BigInt(0);
    return getQuote(direction, amountIn, wallet.publicKey);
  };

  return (
    <div className="min-h-screen bg-stellar-dark bg-mesh">
      {/* ============================================================
          Header / Navbar
          ============================================================ */}
      <header className="sticky top-0 z-40 glass border-b border-stellar-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-stellar flex items-center justify-center shadow-stellar">
                <span className="text-xl">🌊</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-white">StellarSwap</span>
                <div className="text-xs text-gray-500 -mt-0.5">Testnet · Soroban</div>
              </div>
            </div>

            {/* Center Nav (desktop) */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-900 rounded-xl p-1">
              {(['swap', 'send', 'events'] as const).map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === section
                      ? 'bg-stellar-blue text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {section === 'swap' && '🔄 Swap'}
                  {section === 'send' && '↗️ Send'}
                  {section === 'events' && '⚡ Events'}
                </button>
              ))}
            </nav>

            {/* Right: Balance + Wallet */}
            <div className="flex items-center gap-3">
              {wallet.isConnected && (
                <BalanceBadge xlmBalance={xlmBalance} isLoading={isRefreshing} />
              )}
              <WalletConnect
                walletState={wallet}
                onConnect={wallet.connect}
                onDisconnect={wallet.disconnect}
                pickerOpen={walletPickerOpen}
                onPickerOpenChange={setWalletPickerOpen}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================
          Main Content
          ============================================================ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero Banner (when not connected) */}
        {!wallet.isConnected && (
          <div className="mb-10 text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-stellar-blue/10 border border-stellar-blue/20 rounded-full px-4 py-1.5 text-sm text-stellar-blue mb-6">
              <span className="w-2 h-2 bg-stellar-blue rounded-full animate-pulse" />
              Live on Stellar Testnet
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Swap Tokens on{' '}
              <span className="text-transparent bg-clip-text bg-gradient-stellar">
                Stellar
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
              A decentralized exchange powered by Soroban smart contracts.
              Swap tokens, provide liquidity, and earn fees on Stellar Testnet.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              {[
                { icon: '🔮', label: 'Multi-wallet Support' },
                { icon: '⚡', label: 'Soroban Smart Contracts' },
                { icon: '💧', label: 'AMM Liquidity Pools' },
                { icon: '📡', label: 'Real-time Events' },
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm text-gray-300"
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>

            {/* Contract Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
              <div className="bg-stellar-card border border-stellar-border rounded-xl p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-stellar-blue/20 flex items-center justify-center">
                    <span className="text-xs">🌊</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">Token Contract</span>
                </div>
                <p className="text-xs font-mono text-gray-300 break-all">
                  {CONTRACT_IDS.token}
                </p>
              </div>
              <div className="bg-stellar-card border border-stellar-border rounded-xl p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-stellar-purple/20 flex items-center justify-center">
                    <span className="text-xs">🔄</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">Swap Contract</span>
                </div>
                <p className="text-xs font-mono text-gray-300 break-all">
                  {CONTRACT_IDS.swap}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            Main Grid (when connected)
            ============================================================ */}
        {wallet.isConnected && wallet.publicKey ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Left Column - Portfolio */}
            <div className="lg:col-span-4 space-y-6">
              <BalanceDisplay
                xlmBalance={xlmBalance}
                tokenBalance={tokenBalance}
                poolBalances={poolBalances}
                publicKey={wallet.publicKey}
                onRefresh={refreshBalance}
                isRefreshing={isRefreshing}
              />

              {/* Transaction History */}
              <TransactionStatusPanel
                transactions={transactions}
                onClear={clearTransactions}
              />
            </div>

            {/* Middle/Right Column - Main Actions */}
            <div className="lg:col-span-8 space-y-6">
              {/* Mobile Nav Tabs */}
              <div className="flex md:hidden bg-gray-900 rounded-xl p-1 gap-1">
                {(['swap', 'send', 'events'] as const).map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeSection === section
                        ? 'bg-stellar-blue text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {section === 'swap' && '🔄 Swap'}
                    {section === 'send' && '↗️ Send'}
                    {section === 'events' && '⚡ Events'}
                  </button>
                ))}
              </div>

              {/* Swap Panel */}
              <div className={activeSection === 'swap' ? 'block' : 'hidden'}>
                <TokenSwap
                  publicKey={wallet.publicKey}
                  tokenBalance={tokenBalance?.balanceRaw ?? BigInt(0)}
                  xlmBalance={xlmBalance.balance}
                  poolBalances={poolBalances}
                  isLoadingPool={isLoadingPool}
                  onSwap={(dir, amtIn, minOut, sign) =>
                    swapTokens(dir, amtIn, minOut, wallet.publicKey!, sign)
                  }
                  onAddLiquidity={(amtA, amtB, sign) =>
                    addLiquidity(amtA, amtB, wallet.publicKey!, sign)
                  }
                  onRemoveLiquidity={(shares, sign) =>
                    removeLiquidity(shares, wallet.publicKey!, sign)
                  }
                  onGetQuote={handleGetQuote}
                  signTransaction={wallet.signTransaction}
                  activeTransaction={activeTransaction}
                />
              </div>

              {/* Send XLM Panel */}
              <div className={activeSection === 'send' ? 'block' : 'hidden'}>
                <SendXLM
                  publicKey={wallet.publicKey}
                  xlmBalance={xlmBalance.balanceRaw}
                  onSend={(to, amount, sign) =>
                    sendXLM(wallet.publicKey!, to, amount, sign)
                  }
                  signTransaction={wallet.signTransaction}
                  activeTransaction={
                    activeTransaction?.type === 'send_xlm' ? activeTransaction : null
                  }
                />
              </div>

              {/* Event Feed Panel */}
              <div className={activeSection === 'events' ? 'block' : 'hidden'}>
                <EventFeed
                  events={events}
                  isStreaming={isStreaming}
                  lastLedger={lastLedger}
                  onStartStreaming={startStreaming}
                  onStopStreaming={stopStreaming}
                  onClear={clearEvents}
                />
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================
             Not Connected — Tab-aware Connect Prompts
             ============================================================ */
          <div className="max-w-md mx-auto animate-slide-up space-y-4">
            {/* Mobile Tab Nav */}
            <div className="flex md:hidden bg-gray-900 rounded-xl p-1 gap-1">
              {(['swap', 'send', 'events'] as const).map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeSection === section
                      ? 'bg-stellar-blue text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {section === 'swap' && '🔄 Swap'}
                  {section === 'send' && '↗️ Send'}
                  {section === 'events' && '⚡ Events'}
                </button>
              ))}
            </div>

            {/* Events Tab — works without a wallet */}
            {activeSection === 'events' && (
              <EventFeed
                events={events}
                isStreaming={isStreaming}
                lastLedger={lastLedger}
                onStartStreaming={startStreaming}
                onStopStreaming={stopStreaming}
                onClear={clearEvents}
              />
            )}

            {/* Swap / Send — preview + connect prompt */}
            {(activeSection === 'swap' || activeSection === 'send') && (
              <div className="bg-stellar-card border border-stellar-border rounded-2xl overflow-hidden shadow-card">
                {activeSection === 'swap' ? (
                  <div className="p-6 space-y-3">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-semibold text-white">🔄 Swap</span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">0.3% fee</span>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                          <span>🌊</span>
                          <span className="text-sm font-semibold">SST</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-600">0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                          <span>💜</span>
                          <span className="text-sm font-semibold">XLM</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-600">0.00</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-3">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-semibold text-white">↗️ Send XLM</span>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 opacity-60">
                      <div className="text-xs text-gray-500 mb-2">Recipient Address</div>
                      <div className="h-6 bg-gray-800 rounded animate-pulse" />
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 opacity-60">
                      <div className="text-xs text-gray-500 mb-2">Amount (XLM)</div>
                      <div className="h-6 bg-gray-800 rounded animate-pulse" />
                    </div>
                  </div>
                )}

                <div className="px-6 pb-6">
                  <button
                    onClick={() => setWalletPickerOpen(true)}
                    disabled={wallet.isLoading}
                    className="w-full py-4 bg-gradient-stellar text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-stellar hover:shadow-stellar-hover"
                  >
                    {wallet.isLoading
                      ? 'Connecting...'
                      : `Connect Wallet to ${activeSection === 'swap' ? 'Swap' : 'Send'}`}
                  </button>
                </div>

                <div className="px-6 py-3 bg-gray-900/50 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-600">Powered by Soroban</span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    Testnet
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            Stats Footer (always visible)
            ============================================================ */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Network', value: 'Stellar Testnet', icon: '🌐' },
            { label: 'Protocol', value: 'Soroban v21', icon: '⚡' },
            { label: 'Pool Fee', value: '0.30%', icon: '💸' },
            { label: 'Contracts', value: '2 Deployed', icon: '📜' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-stellar-card border border-stellar-border rounded-xl p-4 text-center"
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-base font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* ============================================================
          Footer
          ============================================================ */}
      <footer className="border-t border-stellar-border mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-stellar flex items-center justify-center">
                <span>🌊</span>
              </div>
              <span className="text-sm text-gray-500">
                StellarSwap — Built with Soroban Smart Contracts
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600">
              <a
                href="https://stellar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-400 transition-colors"
              >
                Stellar.org
              </a>
              <a
                href="https://soroban.stellar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-400 transition-colors"
              >
                Soroban Docs
              </a>
              <a
                href="https://stellar.expert/explorer/testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-400 transition-colors"
              >
                Explorer
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
