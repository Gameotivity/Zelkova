"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface Trade {
  id: string;
  coin: string;
  pair: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "TRIGGER";
  quantity: number;
  price: number;
  fee: number | null;
  builderFee: number | null;
  pnl: number | null;
  status: "PENDING" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED" | "FAILED";
  isPaper: boolean;
  hlOrderId: string | null;
  createdAt: string;
  filledAt: string | null;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-[#F59E0B]/10 text-[#F59E0B]",
  FILLED: "bg-[#10B981]/10 text-[#10B981]",
  PARTIALLY_FILLED: "bg-[#00E5FF]/10 text-[#00E5FF]",
  CANCELLED: "bg-[#94A3B8]/10 text-[#94A3B8]",
  FAILED: "bg-[#F43F5E]/10 text-[#F43F5E]",
};

// Demo trades
const DEMO_TRADES: Trade[] = [
  { id: "1", coin: "BTC", pair: "BTC-USD", side: "BUY", type: "MARKET", quantity: 0.05, price: 67420.50, fee: 3.37, builderFee: 1.68, pnl: 234.50, status: "FILLED", isPaper: false, hlOrderId: "0x1234", createdAt: new Date(Date.now() - 3600000).toISOString(), filledAt: new Date(Date.now() - 3590000).toISOString() },
  { id: "2", coin: "ETH", pair: "ETH-USD", side: "SELL", type: "LIMIT", quantity: 2.0, price: 3845.20, fee: 1.54, builderFee: 0.77, pnl: -82.30, status: "FILLED", isPaper: false, hlOrderId: "0x5678", createdAt: new Date(Date.now() - 7200000).toISOString(), filledAt: new Date(Date.now() - 7150000).toISOString() },
  { id: "3", coin: "SOL", pair: "SOL-USD", side: "BUY", type: "MARKET", quantity: 25, price: 148.30, fee: 0.74, builderFee: 0.37, pnl: 156.25, status: "FILLED", isPaper: true, hlOrderId: null, createdAt: new Date(Date.now() - 14400000).toISOString(), filledAt: new Date(Date.now() - 14380000).toISOString() },
  { id: "4", coin: "DOGE", pair: "DOGE-USD", side: "BUY", type: "LIMIT", quantity: 5000, price: 0.1234, fee: 0.12, builderFee: 0.06, pnl: null, status: "PENDING", isPaper: false, hlOrderId: "0x9abc", createdAt: new Date(Date.now() - 1800000).toISOString(), filledAt: null },
  { id: "5", coin: "ARB", pair: "ARB-USD", side: "SELL", type: "MARKET", quantity: 500, price: 1.23, fee: 0.12, builderFee: 0.06, pnl: 45.80, status: "FILLED", isPaper: false, hlOrderId: "0xdef0", createdAt: new Date(Date.now() - 86400000).toISOString(), filledAt: new Date(Date.now() - 86390000).toISOString() },
  { id: "6", coin: "BTC", pair: "BTC-USD", side: "SELL", type: "LIMIT", quantity: 0.02, price: 68100.00, fee: 0.27, builderFee: 0.14, pnl: null, status: "CANCELLED", isPaper: false, hlOrderId: "0x1111", createdAt: new Date(Date.now() - 172800000).toISOString(), filledAt: null },
];

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "filled" | "pending" | "paper">("all");

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio"); // trades come from dashboard stats
      if (res.ok) {
        const data = await res.json();
        if (data.trades) setTrades(data.trades);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const displayTrades = trades.length > 0 ? trades : DEMO_TRADES;
  const filtered = displayTrades.filter((t) => {
    if (filter === "filled") return t.status === "FILLED";
    if (filter === "pending") return t.status === "PENDING";
    if (filter === "paper") return t.isPaper;
    return true;
  });

  const totalPnl = filtered.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalFees = filtered.reduce((sum, t) => sum + (t.fee ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Trade History</h1>
          <p className="text-sm text-[#94A3B8]">{filtered.length} trades</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-[#475569]">Net P&L</p>
            <p className={cn("font-mono text-lg font-bold", totalPnl >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
              {totalPnl >= 0 ? "+" : ""}{formatUsd(totalPnl)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#475569]">Total Fees</p>
            <p className="font-mono text-lg font-bold text-[#94A3B8]">{formatUsd(totalFees)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {([
          { key: "all", label: "All" },
          { key: "filled", label: "Filled" },
          { key: "pending", label: "Open" },
          { key: "paper", label: "Paper" },
        ] as const).map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn("rounded-lg px-4 py-2 text-xs font-medium transition-all",
              filter === f.key ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30" :
              "bg-[#0F1629] text-[#94A3B8] border border-[#1E293B] hover:border-[#00E5FF]/20")}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Trade Table */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1E293B] text-xs uppercase tracking-wider text-[#475569]">
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium">Pair</th>
                <th className="px-6 py-3 font-medium">Side</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium text-right">Price</th>
                <th className="px-6 py-3 font-medium text-right">Qty</th>
                <th className="hidden md:table-cell px-6 py-3 font-medium text-right">Fee</th>
                <th className="px-6 py-3 font-medium text-right">P&L</th>
                <th className="px-6 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-[#94A3B8]">No trades found</td>
                </tr>
              ) : (
                filtered.map((trade) => (
                  <tr key={trade.id} className="border-b border-[#1E293B]/50 transition-colors hover:bg-[#1A2340]/30">
                    <td className="px-6 py-4">
                      <span className="text-[#E2E8F0]">{timeAgo(trade.createdAt)}</span>
                      {trade.isPaper && <span className="ml-1.5 rounded bg-[#8B5CF6]/10 px-1.5 py-0.5 text-[10px] text-[#8B5CF6]">Paper</span>}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#F8FAFC]">{trade.coin}<span className="text-[#475569]">-USD</span></td>
                    <td className="px-6 py-4">
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold",
                        trade.side === "BUY" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F43F5E]/10 text-[#F43F5E]")}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#94A3B8]">{trade.type}</td>
                    <td className="px-6 py-4 text-right font-mono text-[#E2E8F0]">{formatUsd(trade.price)}</td>
                    <td className="px-6 py-4 text-right font-mono text-[#E2E8F0]">{trade.quantity}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-right font-mono text-[#475569]">{trade.fee != null ? formatUsd(trade.fee) : "—"}</td>
                    <td className={cn("px-6 py-4 text-right font-mono font-bold",
                      trade.pnl == null ? "text-[#475569]" : trade.pnl >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
                      {trade.pnl != null ? `${trade.pnl >= 0 ? "+" : ""}${formatUsd(trade.pnl)}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", STATUS_COLORS[trade.status] ?? "")}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
