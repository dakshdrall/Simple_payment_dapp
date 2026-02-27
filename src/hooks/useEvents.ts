'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ContractEvent, EventType, SwapEventData, LiquidityEventData } from '@/types';
import { fetchContractEvents, CONTRACT_IDS } from '@/lib/contracts';
import { DEFAULT_NETWORK } from '@/lib/stellar';

// ============================================================
// Hook: useEvents — Real-time event streaming from contracts
// ============================================================

interface UseEventsReturn {
  events: ContractEvent[];
  isStreaming: boolean;
  lastLedger: number | null;
  startStreaming: () => void;
  stopStreaming: () => void;
  clearEvents: () => void;
}

const POLL_INTERVAL = 8000; // 8 seconds (Stellar ~5s block time)

export function useEvents(enabled = true): UseEventsReturn {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastLedger, setLastLedger] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLedgerRef = useRef<number | null>(null);
  const eventIdsRef = useRef(new Set<string>());

  const fetchEvents = useCallback(async () => {
    try {
      const [swapEvents, tokenEvents] = await Promise.all([
        fetchContractEvents(
          {
            contractId: CONTRACT_IDS.swap,
            startLedger: lastLedgerRef.current ?? undefined,
          },
          DEFAULT_NETWORK
        ),
        fetchContractEvents(
          {
            contractId: CONTRACT_IDS.token,
            startLedger: lastLedgerRef.current ?? undefined,
          },
          DEFAULT_NETWORK
        ),
      ]);

      const allRawEvents = [...swapEvents, ...tokenEvents];

      if (allRawEvents.length === 0) return;

      // Track the highest ledger for next poll
      const maxLedger = Math.max(...allRawEvents.map((e) => Number(e.ledger)));
      if (maxLedger > (lastLedgerRef.current ?? 0)) {
        lastLedgerRef.current = maxLedger + 1;
        setLastLedger(maxLedger);
      }

      // Parse events into typed structures
      const newEvents: ContractEvent[] = [];

      for (const raw of allRawEvents) {
        const id = `${raw.txHash}-${raw.id}`;
        if (eventIdsRef.current.has(id)) continue;
        eventIdsRef.current.add(id);

        const parsed = parseRawEvent(raw);
        if (parsed) {
          newEvents.push(parsed);
        }
      }

      if (newEvents.length > 0) {
        setEvents((prev) => [...newEvents, ...prev].slice(0, 50));
      }
    } catch {
      // Silently fail event polling (non-critical)
    }
  }, []);

  const startStreaming = useCallback(() => {
    if (intervalRef.current) return;

    setIsStreaming(true);
    fetchEvents();

    intervalRef.current = setInterval(fetchEvents, POLL_INTERVAL);
  }, [fetchEvents]);

  const stopStreaming = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    eventIdsRef.current.clear();
  }, []);

  useEffect(() => {
    if (enabled) {
      startStreaming();
    }

    return () => {
      stopStreaming();
    };
  }, [enabled, startStreaming, stopStreaming]);

  return {
    events,
    isStreaming,
    lastLedger,
    startStreaming,
    stopStreaming,
    clearEvents,
  };
}

// ============================================================
// Event Parsing
// ============================================================

function parseRawEvent(raw: {
  id: string;
  type: string;
  ledger: number | string;
  ledgerClosedAt: string;
  contractId: string;
  txHash: string;
  topic: unknown[];
  value: unknown;
}): ContractEvent | null {
  try {
    const topics = raw.topic as string[];
    const firstTopic = topics[0] || '';

    // Detect event type from topic
    let eventType: EventType = 'transfer';
    let eventData: SwapEventData | LiquidityEventData | { from: string; to: string; amount: string };

    if (firstTopic.includes('swap')) {
      eventType = 'swap';
      eventData = parseSwapEventData(raw.value, topics);
    } else if (firstTopic.includes('add_liq')) {
      eventType = 'add_liquidity';
      eventData = parseLiquidityEventData(raw.value, topics);
    } else if (firstTopic.includes('rem_liq')) {
      eventType = 'remove_liquidity';
      eventData = parseLiquidityEventData(raw.value, topics);
    } else if (firstTopic.includes('transfer')) {
      eventType = 'transfer';
      eventData = parseTransferEventData(raw.value, topics);
    } else if (firstTopic.includes('mint')) {
      eventType = 'mint';
      eventData = parseTransferEventData(raw.value, topics);
    } else if (firstTopic.includes('burn')) {
      eventType = 'burn';
      eventData = parseTransferEventData(raw.value, topics);
    } else {
      return null;
    }

    return {
      id: raw.id,
      type: eventType,
      txHash: raw.txHash,
      ledger: Number(raw.ledger),
      timestamp: new Date(raw.ledgerClosedAt).getTime(),
      data: eventData,
    };
  } catch {
    return null;
  }
}

function parseSwapEventData(value: unknown, topics: string[]): SwapEventData {
  const v = value as Record<string, unknown> || {};
  return {
    user: String(topics[1] || ''),
    tokenIn: String((v.token_in as string) || ''),
    tokenOut: String((v.token_out as string) || ''),
    amountIn: String((v.amount_in as string) || '0'),
    amountOut: String((v.amount_out as string) || '0'),
  };
}

function parseLiquidityEventData(value: unknown, topics: string[]): LiquidityEventData {
  const v = value as Record<string, unknown> || {};
  return {
    provider: String(topics[1] || ''),
    amountA: String((v.amount_a as string) || '0'),
    amountB: String((v.amount_b as string) || '0'),
    shares: String((v.shares as string) || '0'),
  };
}

function parseTransferEventData(value: unknown, topics: string[]): { from: string; to: string; amount: string } {
  return {
    from: String(topics[1] || ''),
    to: String(topics[2] || ''),
    amount: String(value || '0'),
  };
}
