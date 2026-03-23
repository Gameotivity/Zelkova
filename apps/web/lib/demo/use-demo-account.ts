"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export interface DemoPosition {
  id: string;
  coin: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  quantity: number;
  sizeUsd: number;
  currentPrice: number;
  unrealizedPnl: number;
  roePct: number;
  openedAt: string;
}

export interface DemoTrade {
  id: string;
  coin: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  sizeUsd: number;
  fee: number;
  pnl: number | null;
  status: string;
  isPaper: boolean;
  createdAt: string;
}

export interface DemoAccount {
  startingBalance: number;
  currentBalance: number;
  totalPnl: number;
  totalTrades: number;
  resetCount: number;
}

interface UseDemoReturn {
  account: DemoAccount | null;
  positions: DemoPosition[];
  trades: DemoTrade[];
  loading: boolean;
  placing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  placeTrade: (params: {
    coin: string;
    side: "buy" | "sell";
    sizeUsd: number;
    orderType: "market" | "limit";
    price?: number;
    stopLossPct?: number;
    takeProfitPct?: number;
  }) => Promise<boolean>;
  closePosition: (positionId: string, coin: string) => Promise<boolean>;
  resetAccount: () => Promise<boolean>;
}

export function useDemoAccount(): UseDemoReturn {
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [trades, setTrades] = useState<DemoTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [accountRes, positionsRes] = await Promise.all([
        fetch("/api/demo/trade"),
        fetch("/api/demo/positions"),
      ]);

      if (accountRes.ok) {
        const data = await accountRes.json();
        setAccount(data.account);
        setTrades(data.trades || []);
      }

      if (positionsRes.ok) {
        const data = await positionsRes.json();
        setPositions(data.positions || []);
      }

      setError(null);
    } catch {
      setError("Failed to load demo account");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount + auto-refresh every 10s
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refresh]);

  const placeTrade = useCallback(async (params: {
    coin: string;
    side: "buy" | "sell";
    sizeUsd: number;
    orderType: "market" | "limit";
    price?: number;
    stopLossPct?: number;
    takeProfitPct?: number;
  }): Promise<boolean> => {
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Trade failed" }));
        setError(body.error || "Trade failed");
        return false;
      }
      await refresh();
      return true;
    } catch {
      setError("Network error placing trade");
      return false;
    } finally {
      setPlacing(false);
    }
  }, [refresh]);

  const closePosition = useCallback(async (positionId: string, coin: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch("/api/demo/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId, coin }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Close failed" }));
        setError(body.error || "Close failed");
        return false;
      }
      await refresh();
      return true;
    } catch {
      setError("Network error closing position");
      return false;
    }
  }, [refresh]);

  const resetAccount = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch("/api/demo/trade", { method: "DELETE" });
      if (!res.ok) {
        setError("Reset failed");
        return false;
      }
      await refresh();
      return true;
    } catch {
      setError("Network error resetting account");
      return false;
    }
  }, [refresh]);

  return { account, positions, trades, loading, placing, error, refresh, placeTrade, closePosition, resetAccount };
}
