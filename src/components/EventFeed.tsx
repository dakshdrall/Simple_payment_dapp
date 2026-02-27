'use client';

import React from 'react';
import { ContractEvent, EventType, SwapEventData, LiquidityEventData } from '@/types';
import { shortenAddress } from '@/lib/stellar';

// ============================================================
// EventFeed Component — Live Contract Event Stream
// ============================================================

interface EventFeedProps {
  events: ContractEvent[];
  isStreaming: boolean;
  lastLedger: number | null;
  onStartStreaming: () => void;
  onStopStreaming: () => void;
  onClear: () => void;
}

export function EventFeed({
  events,
  isStreaming,
  lastLedger,
  onStartStreaming,
  onStopStreaming,
  onClear,
}: EventFeedProps) {
  return (
    <div className="bg-stellar-card border border-stellar-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-stellar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stellar-blue to-stellar-purple flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {isStreaming && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-stellar-dark animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Live Events</h2>
            <p className="text-xs text-gray-500">
              {isStreaming ? (
                <span className="text-green-400">
                  ● Streaming{lastLedger ? ` · Ledger #${lastLedger}` : ''}
                </span>
              ) : (
                <span>Event feed paused</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-500 hover:text-gray-300 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={isStreaming ? onStopStreaming : onStartStreaming}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              isStreaming
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
            }`}
          >
            {isStreaming ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Stream
              </>
            )}
          </button>
        </div>
      </div>

      {/* Event List */}
      <div className="max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm">No events yet</p>
            <p className="text-xs mt-1 text-gray-600">
              {isStreaming ? 'Waiting for contract events...' : 'Start streaming to see events'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stellar-border">
            {events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Single Event Item
// ============================================================

function EventItem({ event }: { event: ContractEvent }) {
  const { type, txHash, ledger, timestamp, data } = event;

  return (
    <div className="px-5 py-3.5 hover:bg-gray-900/50 transition-colors animate-fade-in">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${getEventBg(type)}`}>
          <span className="text-sm">{getEventIcon(type)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold ${getEventColor(type)}`}>
              {getEventLabel(type)}
            </span>
            <span className="text-xs text-gray-600 flex-shrink-0">
              {formatEventTime(timestamp)}
            </span>
          </div>

          {/* Event-specific data */}
          <EventDetails type={type} data={data} />

          {/* Links */}
          <div className="flex items-center gap-3 mt-1.5">
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-600 hover:text-stellar-blue transition-colors font-mono"
            >
              {txHash.slice(0, 10)}...
            </a>
            <span className="text-xs text-gray-700">Ledger #{ledger}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Event Details
// ============================================================

function EventDetails({ type, data }: { type: EventType; data: ContractEvent['data'] }) {
  if (type === 'swap') {
    const d = data as SwapEventData;
    return (
      <div className="mt-1 text-xs text-gray-400">
        <span className="text-white font-semibold">{formatAmount(d.amountIn)}</span>
        <span className="text-gray-600"> → </span>
        <span className="text-white font-semibold">{formatAmount(d.amountOut)}</span>
        {d.user && (
          <span className="text-gray-600 ml-2">by {shortenAddress(d.user, 4)}</span>
        )}
      </div>
    );
  }

  if (type === 'add_liquidity' || type === 'remove_liquidity') {
    const d = data as LiquidityEventData;
    return (
      <div className="mt-1 text-xs text-gray-400">
        <span>{formatAmount(d.amountA)} + {formatAmount(d.amountB)}</span>
        {d.shares && (
          <span className="text-gray-600 ml-2">→ {formatAmount(d.shares)} shares</span>
        )}
      </div>
    );
  }

  if (type === 'transfer' || type === 'mint' || type === 'burn') {
    const d = data as { from: string; to: string; amount: string };
    return (
      <div className="mt-1 text-xs text-gray-400">
        <span className="text-white font-semibold">{formatAmount(d.amount)}</span>
        {d.from && d.to && (
          <span className="text-gray-600">
            {' '}from {shortenAddress(d.from, 4)} → {shortenAddress(d.to, 4)}
          </span>
        )}
      </div>
    );
  }

  return null;
}

// ============================================================
// Helpers
// ============================================================

function getEventIcon(type: EventType): string {
  switch (type) {
    case 'swap': return '🔄';
    case 'add_liquidity': return '💧';
    case 'remove_liquidity': return '🔥';
    case 'transfer': return '↗️';
    case 'mint': return '✨';
    case 'burn': return '💨';
  }
}

function getEventLabel(type: EventType): string {
  switch (type) {
    case 'swap': return 'Token Swap';
    case 'add_liquidity': return 'Liquidity Added';
    case 'remove_liquidity': return 'Liquidity Removed';
    case 'transfer': return 'Token Transfer';
    case 'mint': return 'Tokens Minted';
    case 'burn': return 'Tokens Burned';
  }
}

function getEventColor(type: EventType): string {
  switch (type) {
    case 'swap': return 'text-stellar-blue';
    case 'add_liquidity': return 'text-green-400';
    case 'remove_liquidity': return 'text-orange-400';
    case 'transfer': return 'text-purple-400';
    case 'mint': return 'text-yellow-400';
    case 'burn': return 'text-red-400';
  }
}

function getEventBg(type: EventType): string {
  switch (type) {
    case 'swap': return 'bg-stellar-blue/20';
    case 'add_liquidity': return 'bg-green-500/20';
    case 'remove_liquidity': return 'bg-orange-500/20';
    case 'transfer': return 'bg-purple-500/20';
    case 'mint': return 'bg-yellow-500/20';
    case 'burn': return 'bg-red-500/20';
  }
}

function formatAmount(raw: string): string {
  const num = parseInt(raw, 10);
  if (isNaN(num)) return raw;
  return (num / 10_000_000).toFixed(4);
}

function formatEventTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const delta = now - timestamp;

  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}
