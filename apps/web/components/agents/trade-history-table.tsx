"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils/cn";

type SortField = "time" | "pair" | "side" | "price" | "quantity" | "pnl" | "fee" | "status";
type SortDir = "asc" | "desc";

interface Trade {
  id: string;
  pair: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  pnl: number | null;
  fee: number | null;
  status: "PENDING" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED" | "FAILED";
  createdAt: string;
}

interface TradeHistoryTableProps {
  trades: Trade[];
  loading?: boolean;
}

const STATUS_STYLES: Record<Trade["status"], string> = {
  FILLED: "bg-success/10 text-success",
  PENDING: "bg-warning/10 text-warning",
  PARTIALLY_FILLED: "bg-accent-primary/10 text-accent-primary",
  CANCELLED: "bg-text-muted/10 text-text-muted",
  FAILED: "bg-danger/10 text-danger",
};

const COLUMNS: { key: SortField; label: string; align: string }[] = [
  { key: "time", label: "Time", align: "text-left" },
  { key: "pair", label: "Pair", align: "text-left" },
  { key: "side", label: "Side", align: "text-center" },
  { key: "price", label: "Price", align: "text-right" },
  { key: "quantity", label: "Qty", align: "text-right" },
  { key: "pnl", label: "P&L", align: "text-right" },
  { key: "fee", label: "Fee", align: "text-right" },
  { key: "status", label: "Status", align: "text-center" },
];

const PAGE_SIZE = 10;

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3">
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="h-4 flex-1 animate-pulse rounded bg-zelkora-elevated" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg className="h-10 w-10 text-text-disabled" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
      </svg>
      <p className="mt-3 text-sm font-semibold text-text-primary">No trades yet</p>
      <p className="mt-1 text-xs text-text-muted">
        Trades will appear here once your agent starts executing
      </p>
    </div>
  );
}

function sortTrades(trades: Trade[], field: SortField, dir: SortDir): Trade[] {
  return [...trades].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "time": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      case "pair": cmp = a.pair.localeCompare(b.pair); break;
      case "side": cmp = a.side.localeCompare(b.side); break;
      case "price": cmp = a.price - b.price; break;
      case "quantity": cmp = a.quantity - b.quantity; break;
      case "pnl": cmp = (a.pnl ?? 0) - (b.pnl ?? 0); break;
      case "fee": cmp = (a.fee ?? 0) - (b.fee ?? 0); break;
      case "status": cmp = a.status.localeCompare(b.status); break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export function TradeHistoryTable({ trades, loading }: TradeHistoryTableProps) {
  const [sortField, setSortField] = useState<SortField>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(
    () => sortTrades(trades, sortField, sortDir),
    [trades, sortField, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zelkora-border bg-zelkora-card">
        <div className="border-b border-zelkora-border px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">Trade History</h3>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card">
      <div className="border-b border-zelkora-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Trade History</h3>
      </div>

      {trades.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zelkora-border">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        "cursor-pointer px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-body",
                        col.align
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortField === col.key && (
                          <span className="text-accent-primary">
                            {sortDir === "asc" ? "\u25B2" : "\u25BC"}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((trade) => {
                  const isBuy = trade.side === "BUY";
                  const hasPnl = trade.pnl !== null;
                  const pnlPositive = (trade.pnl ?? 0) >= 0;

                  return (
                    <tr
                      key={trade.id}
                      className="border-b border-zelkora-border/50 transition-colors hover:bg-zelkora-elevated/30"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-text-muted">
                        {new Date(trade.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-text-body">
                        {trade.pair}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={cn(
                            "inline-block rounded px-2 py-0.5 text-[10px] font-bold",
                            isBuy ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                          )}
                        >
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-text-body">
                        ${trade.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-text-body">
                        {trade.quantity.toFixed(4)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono text-xs font-medium tabular-nums",
                          hasPnl ? (pnlPositive ? "text-success" : "text-danger") : "text-text-muted"
                        )}
                      >
                        {hasPnl
                          ? `${pnlPositive ? "+" : ""}$${(trade.pnl ?? 0).toFixed(2)}`
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-text-muted">
                        {trade.fee !== null ? `$${trade.fee.toFixed(2)}` : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            STATUS_STYLES[trade.status]
                          )}
                        >
                          {trade.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zelkora-border px-4 py-3">
              <p className="text-xs text-text-muted">
                Page {page + 1} of {totalPages} ({sorted.length} trades)
              </p>
              <div className="flex gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-zelkora-border px-3 py-1 text-xs font-medium text-text-body transition-all hover:border-accent-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-zelkora-border px-3 py-1 text-xs font-medium text-text-body transition-all hover:border-accent-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
