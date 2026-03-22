"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const HL_API = process.env.NEXT_PUBLIC_HL_TESTNET === "true"
  ? "https://api.hyperliquid-testnet.xyz"
  : "https://api.hyperliquid.xyz";

export interface HLAccountData {
  connected: boolean;
  equity: string;
  totalMarginUsed: string;
  withdrawable: string;
  unrealizedPnl: string;
  positionCount: number;
}

const DEFAULT_STATE: HLAccountData = {
  connected: false,
  equity: "0",
  totalMarginUsed: "0",
  withdrawable: "0",
  unrealizedPnl: "0",
  positionCount: 0,
};

/**
 * Hook that fetches Hyperliquid account data directly from the HL API.
 * No database needed — just the wallet address.
 */
export function useHLAccount(walletAddress: string | undefined) {
  const [data, setData] = useState<HLAccountData>(DEFAULT_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchAccount = useCallback(async () => {
    if (!walletAddress) {
      setData(DEFAULT_STATE);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(HL_API + "/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "clearinghouseState",
          user: walletAddress,
        }),
      });

      if (!res.ok) throw new Error(`HL API error: ${res.status}`);

      const state = await res.json();

      if (!mountedRef.current) return;

      const margin = state.marginSummary;
      const positions = state.assetPositions?.filter(
        (p: { position: { szi: string } }) => Number(p.position.szi) !== 0
      ) ?? [];

      const equity = Number(margin?.accountValue ?? 0);
      const rawUsd = Number(margin?.totalRawUsd ?? 0);

      setData({
        connected: true,
        equity: margin?.accountValue ?? "0",
        totalMarginUsed: margin?.totalMarginUsed ?? "0",
        withdrawable: state.withdrawable ?? "0",
        unrealizedPnl: (equity - rawUsd).toFixed(2),
        positionCount: positions.length,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to connect to Hyperliquid");
      setData({ ...DEFAULT_STATE, connected: false });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAccount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAccount, 30_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAccount]);

  return { ...data, loading, error, refetch: fetchAccount };
}
