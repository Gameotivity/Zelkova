"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getWSManager } from "@/lib/hyperliquid/ws-client";

interface WSPriceState {
  prices: Record<string, string>;
  connected: boolean;
}

/**
 * React hook for real-time Hyperliquid price updates via WebSocket.
 *
 * Falls back to the existing HTTP polling if WebSocket is unavailable.
 * Updates are batched at ~100ms to avoid excessive re-renders.
 */
export function useWSPrices(): WSPriceState {
  const [state, setState] = useState<WSPriceState>({
    prices: {},
    connected: false,
  });
  const batchRef = useRef<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ws = getWSManager();

    const unsubscribe = ws.onPriceUpdate((prices) => {
      batchRef.current = prices;

      // Batch updates at 100ms
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setState({
            prices: { ...batchRef.current },
            connected: ws.isConnected(),
          });
        }, 100);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return state;
}

/**
 * Get a single coin's price from the WebSocket feed.
 */
export function useWSCoinPrice(coin: string): {
  price: string | null;
  connected: boolean;
} {
  const { prices, connected } = useWSPrices();
  return {
    price: prices[coin] ?? null,
    connected,
  };
}
