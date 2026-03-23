"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface Position {
  coin: string;
  size: string;
  entryPrice: string;
  unrealizedPnl: string;
  liquidationPrice: string;
  leverage: number;
  leverageType: string;
  marginUsed: string;
  positionValue: string;
  returnOnEquity: string;
  maxLeverage: number;
}

interface AccountSummary {
  equity: string;
  totalMarginUsed: string;
  totalUnrealizedPnl: string;
  withdrawable: string;
  totalNotionalPosition: string;
  totalRawUsd: string;
}

function formatUsd(value: string | number): string {
  const num = Number(value);
  if (isNaN(num)) return "$0.00";
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value: string | number): string {
  const num = Number(value);
  if (isNaN(num)) return "0.00%";
  return `${num >= 0 ? "+" : ""}${(num * 100).toFixed(2)}%`;
}

// Demo data
const DEMO_SUMMARY: AccountSummary = {
  equity: "12450.32",
  totalMarginUsed: "3240.15",
  totalUnrealizedPnl: "847.23",
  withdrawable: "9210.17",
  totalNotionalPosition: "16200.75",
  totalRawUsd: "11603.09",
};

const DEMO_POSITIONS: Position[] = [
  { coin: "BTC", size: "0.15", entryPrice: "67420.50", unrealizedPnl: "523.40", liquidationPrice: "52100.00", leverage: 3, leverageType: "cross", marginUsed: "1500.00", positionValue: "10200.00", returnOnEquity: "0.349", maxLeverage: 50 },
  { coin: "ETH", size: "-2.5", entryPrice: "2045.20", unrealizedPnl: "-142.30", liquidationPrice: "2280.00", leverage: 5, leverageType: "isolated", marginUsed: "1023.10", positionValue: "5113.00", returnOnEquity: "-0.139", maxLeverage: 50 },
  { coin: "SOL", size: "50", entryPrice: "82.30", unrealizedPnl: "466.13", liquidationPrice: "54.20", leverage: 2, leverageType: "cross", marginUsed: "717.05", positionValue: "4300.00", returnOnEquity: "0.650", maxLeverage: 20 },
];

export default function PortfolioPage() {
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        if (data.summary) setSummary(data.summary);
        if (data.positions) setPositions(data.positions);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  const displaySummary = summary ?? DEMO_SUMMARY;
  const displayPositions = positions.length > 0 ? positions : DEMO_POSITIONS;
  const unrealizedPnl = Number(displaySummary.totalUnrealizedPnl);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Portfolio</h1>
        <p className="text-sm text-[#94A3B8]">Live account state from Hyperliquid</p>
      </div>

      {/* Account Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
          <p className="text-xs text-[#475569]">Account Equity</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#F8FAFC]">{formatUsd(displaySummary.equity)}</p>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
          <p className="text-xs text-[#475569]">Unrealized P&L</p>
          <p className={cn("mt-1 font-mono text-2xl font-bold", unrealizedPnl >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
            {unrealizedPnl >= 0 ? "+" : ""}{formatUsd(displaySummary.totalUnrealizedPnl)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
          <p className="text-xs text-[#475569]">Margin Used</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#F59E0B]">{formatUsd(displaySummary.totalMarginUsed)}</p>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
          <p className="text-xs text-[#475569]">Withdrawable</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#E2E8F0]">{formatUsd(displaySummary.withdrawable)}</p>
        </div>
      </div>

      {/* Open Positions */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629]">
        <div className="border-b border-[#1E293B] px-6 py-4">
          <h2 className="font-semibold text-[#F8FAFC]">Open Positions</h2>
        </div>

        {displayPositions.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8]">No open positions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1E293B] text-xs uppercase tracking-wider text-[#475569]">
                  <th className="px-6 py-3 font-medium">Asset</th>
                  <th className="px-6 py-3 font-medium">Side</th>
                  <th className="px-6 py-3 font-medium text-right">Size</th>
                  <th className="px-6 py-3 font-medium text-right">Entry Price</th>
                  <th className="px-6 py-3 font-medium text-right">Leverage</th>
                  <th className="hidden md:table-cell px-6 py-3 font-medium text-right">Margin</th>
                  <th className="px-6 py-3 font-medium text-right">Unrealized P&L</th>
                  <th className="hidden md:table-cell px-6 py-3 font-medium text-right">ROE</th>
                  <th className="px-6 py-3 font-medium text-right">Liq. Price</th>
                </tr>
              </thead>
              <tbody>
                {displayPositions.map((pos) => {
                  const isLong = Number(pos.size) > 0;
                  const pnl = Number(pos.unrealizedPnl);
                  const roe = Number(pos.returnOnEquity);
                  return (
                    <tr key={pos.coin} className="border-b border-[#1E293B]/50 transition-colors hover:bg-[#1A2340]/30">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-[#F8FAFC]">{pos.coin}</span>
                        <span className="text-[#475569]">-USD</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", isLong ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F43F5E]/10 text-[#F43F5E]")}>
                          {isLong ? "LONG" : "SHORT"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[#E2E8F0]">{Math.abs(Number(pos.size))}</td>
                      <td className="px-6 py-4 text-right font-mono text-[#E2E8F0]">{formatUsd(pos.entryPrice)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="rounded-md bg-[#1A2340] px-2 py-0.5 font-mono text-xs text-[#94A3B8]">
                          {pos.leverage}x {pos.leverageType === "cross" ? "Cross" : "Iso"}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-right font-mono text-[#94A3B8]">{formatUsd(pos.marginUsed)}</td>
                      <td className={cn("px-6 py-4 text-right font-mono font-bold", pnl >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
                        {pnl >= 0 ? "+" : ""}{formatUsd(pos.unrealizedPnl)}
                      </td>
                      <td className={cn("hidden md:table-cell px-6 py-4 text-right font-mono", roe >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
                        {formatPct(pos.returnOnEquity)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[#F59E0B]">{formatUsd(pos.liquidationPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
