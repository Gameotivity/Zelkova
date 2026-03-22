"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TickerItem {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  prevPrice?: number;
}

const COIN_LABELS: Record<string, string> = {
  BTCUSDT: "BTC",
  ETHUSDT: "ETH",
  SOLUSDT: "SOL",
  BNBUSDT: "BNB",
  XRPUSDT: "XRP",
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function TickerSkeleton() {
  return (
    <div className="flex items-center gap-8 px-4 py-2.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-10 animate-pulse rounded bg-zelkora-elevated" />
          <div className="h-4 w-20 animate-pulse rounded bg-zelkora-elevated" />
          <div className="h-3 w-14 animate-pulse rounded bg-zelkora-elevated" />
        </div>
      ))}
    </div>
  );
}

export function LiveTicker() {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const flashRef = useRef<Map<string, "up" | "down">>(new Map());
  const [flashKey, setFlashKey] = useState(0);

  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch("/api/market/live");
      if (!res.ok) throw new Error("fetch failed");
      const data: { tickers: TickerItem[] } = await res.json();

      setTickers((prev) => {
        const prevMap = new Map(prev.map((t) => [t.symbol, t.lastPrice]));
        return (data.tickers || [])
          .filter((t) => t.symbol in COIN_LABELS)
          .map((t) => {
            const old = prevMap.get(t.symbol);
            if (old !== undefined && old !== t.lastPrice) {
              flashRef.current.set(t.symbol, t.lastPrice > old ? "up" : "down");
            }
            return { ...t, prevPrice: old };
          });
      });

      setFlashKey((k) => k + 1);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    const interval = setInterval(fetchTickers, 15_000);
    return () => clearInterval(interval);
  }, [fetchTickers]);

  useEffect(() => {
    if (flashKey === 0) return;
    const timeout = setTimeout(() => flashRef.current.clear(), 700);
    return () => clearTimeout(timeout);
  }, [flashKey]);

  if (loading) return <TickerSkeleton />;

  if (error || tickers.length === 0) {
    return (
      <div className="border-b border-zelkora-border bg-zelkora-card/50 px-4 py-2.5">
        <p className="text-xs text-text-muted">Market data unavailable</p>
      </div>
    );
  }

  const items = [...tickers, ...tickers];

  return (
    <div className="overflow-hidden border-b border-zelkora-border bg-zelkora-card/50 backdrop-blur-sm">
      <div className="animate-ticker flex items-center whitespace-nowrap">
        {items.map((t, i) => {
          const isUp = t.priceChangePercent >= 0;
          const flash = flashRef.current.get(t.symbol);
          const flashClass = flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : "";

          return (
            <div
              key={`${t.symbol}-${i}`}
              className={`flex items-center gap-2.5 px-5 py-2.5 ${flashClass}`}
            >
              <span className="text-xs font-semibold text-text-muted">
                {COIN_LABELS[t.symbol] ?? t.symbol}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                ${formatPrice(t.lastPrice)}
              </span>
              <span
                className={`font-mono text-xs font-medium tabular-nums ${
                  isUp ? "text-success" : "text-danger"
                }`}
              >
                {isUp ? "+" : ""}
                {t.priceChangePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
