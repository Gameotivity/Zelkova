"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";

interface Position {
  id: string;
  pair: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnl: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string;
}

interface PositionCardProps {
  position: Position;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function SLTPProgress({
  entry,
  current,
  stopLoss,
  takeProfit,
}: {
  entry: number;
  current: number;
  stopLoss: number | null;
  takeProfit: number | null;
}) {
  if (!stopLoss && !takeProfit) return null;

  const sl = stopLoss ?? entry * 0.9;
  const tp = takeProfit ?? entry * 1.1;
  const totalRange = tp - sl;
  if (totalRange <= 0) return null;

  const progress = Math.max(0, Math.min(1, (current - sl) / totalRange));
  const entryPos = Math.max(0, Math.min(1, (entry - sl) / totalRange));

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[9px] text-text-muted">
        <span>SL: <span className="font-mono text-danger">${sl.toLocaleString()}</span></span>
        <span>TP: <span className="font-mono text-success">${tp.toLocaleString()}</span></span>
      </div>
      <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-zelkora-elevated">
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{
            width: `${progress * 100}%`,
            background: progress > entryPos
              ? "linear-gradient(90deg, #F59E0B, #10B981)"
              : "linear-gradient(90deg, #F43F5E, #F59E0B)",
          }}
        />
        {/* Entry marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-text-muted"
          style={{ left: `${entryPos * 100}%` }}
        />
      </div>
    </div>
  );
}

export function PositionCard({ position }: PositionCardProps) {
  const isLong = position.side === "LONG";
  const isProfitable = position.unrealizedPnl >= 0;
  const pnlPercent = useMemo(() => {
    const notional = position.entryPrice * position.quantity;
    if (notional === 0) return 0;
    return (position.unrealizedPnl / notional) * 100;
  }, [position]);

  const timeInTrade = useMemo(() => {
    return formatDuration(Date.now() - new Date(position.openedAt).getTime());
  }, [position.openedAt]);

  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-4 transition-all duration-200 hover:border-zelkora-border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-text-primary">
            {position.pair}
          </span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-bold",
              isLong ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            )}
          >
            {position.side}
          </span>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-text-muted">
          {timeInTrade}
        </span>
      </div>

      {/* Price movement */}
      <div className="mt-3 flex items-center gap-2">
        <div>
          <p className="text-[10px] uppercase text-text-muted">Entry</p>
          <p className="font-mono text-sm tabular-nums text-text-body">
            ${position.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <span className="mt-3 text-text-disabled">{"\u2192"}</span>
        <div>
          <p className="text-[10px] uppercase text-text-muted">Current</p>
          <p className="font-mono text-sm font-semibold tabular-nums text-text-primary">
            ${position.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* P&L */}
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase text-text-muted">Unrealized P&L</p>
          <p
            className={cn(
              "font-mono text-lg font-bold tabular-nums",
              isProfitable ? "text-success" : "text-danger"
            )}
          >
            {isProfitable ? "+" : ""}${position.unrealizedPnl.toFixed(2)}
          </p>
        </div>
        <span
          className={cn(
            "font-mono text-xs font-semibold tabular-nums",
            isProfitable ? "text-success" : "text-danger"
          )}
        >
          {isProfitable ? "+" : ""}{pnlPercent.toFixed(2)}%
        </span>
      </div>

      {/* Size */}
      <div className="mt-2 text-[10px] text-text-muted">
        Size: <span className="font-mono text-text-body">{position.quantity.toFixed(4)}</span>
      </div>

      {/* SL/TP Progress */}
      <SLTPProgress
        entry={position.entryPrice}
        current={position.currentPrice}
        stopLoss={position.stopLoss}
        takeProfit={position.takeProfit}
      />
    </div>
  );
}

interface PositionListProps {
  positions: Position[];
  loading?: boolean;
}

export function PositionList({ positions, loading }: PositionListProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Open Positions</h3>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-zelkora-border p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-zelkora-elevated" />
              <div className="mt-3 h-6 w-32 animate-pulse rounded bg-zelkora-elevated" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Open Positions
        {positions.length > 0 && (
          <span className="ml-2 rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-semibold text-accent-primary">
            {positions.length}
          </span>
        )}
      </h3>
      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-text-muted">No open positions</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {positions.map((pos) => (
            <PositionCard key={pos.id} position={pos} />
          ))}
        </div>
      )}
    </div>
  );
}
