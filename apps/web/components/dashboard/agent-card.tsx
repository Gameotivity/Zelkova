"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface AgentCardProps {
  id: string;
  name: string;
  type: "CRYPTO" | "POLYMARKET";
  status: "PAPER" | "LIVE" | "PAUSED" | "STOPPED" | "DRAFT";
  strategy: string;
  pairs?: string[];
  pnl?: number;
  lastSignal?: string;
  lastSignalTime?: string;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  PAPER: { bg: "bg-warning/10", text: "text-warning", label: "Paper" },
  LIVE: { bg: "bg-success/10", text: "text-success", label: "Live" },
  PAUSED: { bg: "bg-text-muted/10", text: "text-text-muted", label: "Paused" },
  STOPPED: { bg: "bg-danger/10", text: "text-danger", label: "Stopped" },
  DRAFT: { bg: "bg-zelkora-elevated", text: "text-text-muted", label: "Draft" },
};

export function AgentCard({
  id,
  name,
  type,
  status,
  strategy,
  pairs,
  pnl = 0,
  lastSignal,
  lastSignalTime,
}: AgentCardProps) {
  const statusStyle = statusColors[status] || statusColors.DRAFT;
  const isPositive = pnl >= 0;

  return (
    <Link
      href={`/agents/${id}`}
      className="group rounded-xl border border-zelkora-border bg-zelkora-card p-5 transition-all duration-200 hover:border-accent-primary/50 hover:bg-zelkora-elevated/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-zelkora-elevated p-2">
            {type === "CRYPTO" ? (
              <svg className="h-5 w-5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors">{name}</h3>
            <p className="text-xs text-text-muted">{strategy.replace(/_/g, " ")}</p>
          </div>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusStyle.bg, statusStyle.text)}>
          {statusStyle.label}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-text-muted">P&L</p>
          <p className={cn("text-lg font-bold font-mono tabular-nums", isPositive ? "text-success" : "text-danger")}>
            {isPositive ? "+" : ""}${pnl.toFixed(2)}
          </p>
        </div>
        {lastSignal && (
          <div className="text-right">
            <p className="text-xs text-text-muted">Last Signal</p>
            <p className="text-sm text-text-body">{lastSignal}</p>
            {lastSignalTime && <p className="text-xs text-text-muted">{lastSignalTime}</p>}
          </div>
        )}
      </div>

      {pairs && pairs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pairs.slice(0, 3).map((pair) => (
            <span key={pair} className="rounded bg-zelkora-elevated px-2 py-0.5 text-xs text-text-muted">
              {pair}
            </span>
          ))}
          {pairs.length > 3 && (
            <span className="text-xs text-text-muted">+{pairs.length - 3} more</span>
          )}
        </div>
      )}
    </Link>
  );
}
