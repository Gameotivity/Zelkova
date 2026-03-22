"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { BacktestChart } from "@/components/strategy/backtest-chart";
import { MetricsGrid } from "@/components/strategy/metrics-grid";
import { cn } from "@/lib/utils/cn";
import type { BacktestResult, TradeRecord } from "@/components/strategy/strategy-types";

export default function BacktestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-[#94A3B8]">
          Loading backtest results...
        </div>
      }
    >
      <BacktestContent />
    </Suspense>
  );
}

function generateMockBacktest(): BacktestResult {
  const startDate = new Date("2025-01-01");
  const days = 180;
  let equity = 10000;
  const equityCurve = [];
  const drawdownCurve = [];
  const trades: TradeRecord[] = [];
  let peak = equity;
  let tradeId = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    const change = (Math.random() - 0.45) * 200;
    equity = Math.max(equity + change, 1000);
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;

    equityCurve.push({ date: dateStr, equity: Math.round(equity * 100) / 100 });
    drawdownCurve.push({ date: dateStr, drawdown: Math.round(dd * 100) / 100 });

    if (Math.random() > 0.92) {
      tradeId++;
      const pnl = change;
      const side = Math.random() > 0.5 ? "LONG" : "SHORT";
      const entryPrice = 40000 + Math.random() * 5000;
      const exitReasons: TradeRecord["exitReason"][] = ["TP", "SL", "Signal", "Trailing"];
      trades.push({
        id: `t-${tradeId}`,
        entryTime: dateStr,
        exitTime: dateStr,
        side: side as "LONG" | "SHORT",
        entryPrice: Math.round(entryPrice * 100) / 100,
        exitPrice: Math.round((entryPrice + pnl) * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnlPct: Math.round((pnl / 10000) * 10000) / 100,
        exitReason: exitReasons[Math.floor(Math.random() * exitReasons.length)],
      });
    }
  }

  const finalReturn = ((equity - 10000) / 10000) * 100;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1;
  const maxDD = Math.min(...drawdownCurve.map((d) => d.drawdown));

  return {
    totalReturn: Math.round(finalReturn * 100) / 100,
    sharpeRatio: Math.round((finalReturn / 15 + Math.random() * 0.5) * 100) / 100,
    maxDrawdown: Math.round(maxDD * 100) / 100,
    winRate: trades.length > 0 ? Math.round((wins.length / trades.length) * 10000) / 100 : 0,
    profitFactor: avgLoss > 0 ? Math.round((avgWin / avgLoss) * 100) / 100 : 0,
    avgWinLoss: avgLoss > 0 ? Math.round((avgWin / avgLoss) * 100) / 100 : 0,
    totalTrades: trades.length,
    calmarRatio: maxDD !== 0 ? Math.round((finalReturn / Math.abs(maxDD)) * 100) / 100 : 0,
    equityCurve,
    drawdownCurve,
    trades,
  };
}

function BacktestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const strategyId = searchParams.get("strategy");

  const result = useMemo(() => generateMockBacktest(), []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#0F1629] p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/5 to-[#00E5FF]/5" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
              Backtest Results
            </h1>
            <p className="mt-1 text-sm text-[#94A3B8]">
              {strategyId ? `Strategy: ${strategyId}` : "Custom Strategy"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/agents/new?template=custom")}
            className="rounded-lg bg-[#00E5FF] px-5 py-2.5 text-sm font-semibold text-[#06080E] transition-all duration-200 hover:bg-[#00E5FF]/90"
          >
            Deploy as Bot
          </button>
        </div>
      </div>

      {/* Config Summary */}
      <ConfigSummary />

      {/* Metrics */}
      <MetricsGrid
        totalReturn={result.totalReturn}
        sharpeRatio={result.sharpeRatio}
        maxDrawdown={result.maxDrawdown}
        winRate={result.winRate}
        profitFactor={result.profitFactor}
        avgWinLoss={result.avgWinLoss}
        totalTrades={result.totalTrades}
        calmarRatio={result.calmarRatio}
      />

      {/* Charts */}
      <BacktestChart
        equityCurve={result.equityCurve}
        drawdownCurve={result.drawdownCurve}
        trades={result.trades}
        initialCapital={10000}
      />

      {/* Trade List */}
      <TradeTable trades={result.trades} />
    </div>
  );
}

function ConfigSummary() {
  const items = [
    { label: "Symbol", value: "BTC/USDT" },
    { label: "Timeframe", value: "4H" },
    { label: "Period", value: "Jan 2025 — Jun 2025" },
    { label: "Initial Capital", value: "$10,000" },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[#1E293B] bg-[#0F1629] px-4 py-2"
        >
          <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
            {item.label}
          </span>
          <p className="font-mono text-sm font-semibold text-[#F8FAFC]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function TradeTable({ trades }: { trades: TradeRecord[] }) {
  const exitBadgeColors: Record<TradeRecord["exitReason"], string> = {
    TP: "bg-[#10B981]/10 text-[#10B981]",
    SL: "bg-[#F43F5E]/10 text-[#F43F5E]",
    Signal: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    Trailing: "bg-[#F59E0B]/10 text-[#F59E0B]",
  };

  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#F8FAFC]">Trade History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-[#94A3B8]">
              <th className="px-3 py-2">Entry</th>
              <th className="px-3 py-2">Exit</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2 text-right">Entry Price</th>
              <th className="px-3 py-2 text-right">Exit Price</th>
              <th className="px-3 py-2 text-right">P&L</th>
              <th className="px-3 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr
                key={trade.id}
                className="border-b border-[#1E293B]/50 transition-all duration-200 hover:bg-[#1A2340]/30"
              >
                <td className="px-3 py-2.5 font-mono text-xs text-[#E2E8F0]">
                  {trade.entryTime}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-[#E2E8F0]">
                  {trade.exitTime}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold",
                      trade.side === "LONG"
                        ? "bg-[#10B981]/10 text-[#10B981]"
                        : "bg-[#F43F5E]/10 text-[#F43F5E]"
                    )}
                  >
                    {trade.side}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-[#E2E8F0]">
                  ${trade.entryPrice.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-[#E2E8F0]">
                  ${trade.exitPrice.toLocaleString()}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right font-mono text-xs font-bold",
                    trade.pnl >= 0 ? "text-[#10B981]" : "text-[#F43F5E]"
                  )}
                >
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      exitBadgeColors[trade.exitReason]
                    )}
                  >
                    {trade.exitReason}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {trades.length === 0 && (
          <p className="py-8 text-center text-sm text-[#94A3B8]">No trades in this period</p>
        )}
      </div>
    </div>
  );
}
