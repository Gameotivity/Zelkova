"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TickerData, CandleData } from "./live-prices";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseMarketDataResult {
  tickers: TickerData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseCandlesResult {
  candles: CandleData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseLivePriceResult {
  ticker: TickerData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as Record<string, unknown>).error)
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// useMarketData — all major tickers, auto-refresh every 15s
// ---------------------------------------------------------------------------

export function useMarketData(): UseMarketDataResult {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchTickers = useCallback(async () => {
    try {
      const data = await fetchApi<{ tickers: TickerData[] }>(
        "/api/market/live"
      );
      if (mountedRef.current) {
        setTickers(data.tickers);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch tickers");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchTickers();

    const interval = setInterval(fetchTickers, 15_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchTickers]);

  return { tickers, loading, error, refetch: fetchTickers };
}

// ---------------------------------------------------------------------------
// useCandles — candle data for a specific pair/interval
// ---------------------------------------------------------------------------

export function useCandles(
  pair: string,
  interval: CandleInterval = "1h",
  limit = 100
): UseCandlesResult {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchCandles = useCallback(async () => {
    if (!pair) return;
    try {
      setLoading(true);
      const url =
        `/api/market/live?action=candles` +
        `&pair=${encodeURIComponent(pair)}` +
        `&interval=${encodeURIComponent(interval)}` +
        `&limit=${limit}`;
      const data = await fetchApi<{ candles: CandleData[] }>(url);
      if (mountedRef.current) {
        setCandles(data.candles);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch candles");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [pair, interval, limit]);

  useEffect(() => {
    mountedRef.current = true;
    fetchCandles();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchCandles]);

  return { candles, loading, error, refetch: fetchCandles };
}

// ---------------------------------------------------------------------------
// useLivePrice — single pair price with auto-refresh every 15s
// ---------------------------------------------------------------------------

export function useLivePrice(pair: string): UseLivePriceResult {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchPrice = useCallback(async () => {
    if (!pair) return;
    try {
      const url = `/api/market/live?pair=${encodeURIComponent(pair)}`;
      const data = await fetchApi<{ ticker: TickerData }>(url);
      if (mountedRef.current) {
        setTicker(data.ticker);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch price");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [pair]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPrice();

    const interval = setInterval(fetchPrice, 15_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchPrice]);

  return { ticker, loading, error, refetch: fetchPrice };
}
