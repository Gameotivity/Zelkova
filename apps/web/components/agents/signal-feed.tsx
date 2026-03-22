"use client";

import { cn } from "@/lib/utils/cn";

interface Signal {
  id: string;
  signalType: string;
  pair: string;
  direction: "BUY" | "SELL" | "LONG" | "SHORT";
  confidence: number;
  indicators: Record<string, unknown> | null;
  createdAt: string;
}

interface SignalFeedProps {
  signals: Signal[];
  loading?: boolean;
}

function ConfidenceMeter({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value * 100));
  const color =
    clamped >= 70 ? "#10B981" : clamped >= 40 ? "#F59E0B" : "#F43F5E";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zelkora-elevated">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="font-mono text-[10px] font-semibold tabular-nums"
        style={{ color }}
      >
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}

function isUpDirection(dir: string): boolean {
  return dir === "BUY" || dir === "LONG";
}

function SignalItem({ signal, isLatest }: { signal: Signal; isLatest: boolean }) {
  const isUp = isUpDirection(signal.direction);
  const indicatorTags: string[] = signal.indicators
    ? Object.keys(signal.indicators).slice(0, 3)
    : [];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-zelkora-border/50 px-3 py-2.5 transition-all duration-200",
        isLatest && "border-accent-primary/30 bg-accent-primary/5"
      )}
    >
      {/* Pulse dot for latest */}
      <div className="flex w-5 items-center justify-center">
        {isLatest ? (
          <span className="h-2 w-2 rounded-full bg-accent-primary animate-pulse-dot" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-zelkora-border" />
        )}
      </div>

      {/* Timestamp */}
      <span className="w-14 shrink-0 font-mono text-[10px] tabular-nums text-text-muted">
        {new Date(signal.createdAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>

      {/* Pair badge */}
      <span className="shrink-0 rounded bg-zelkora-elevated px-2 py-0.5 font-mono text-[10px] font-semibold text-text-body">
        {signal.pair}
      </span>

      {/* Direction arrow */}
      <span
        className={cn(
          "text-lg font-bold leading-none",
          isUp ? "text-success" : "text-danger"
        )}
      >
        {isUp ? "\u2191" : "\u2193"}
      </span>

      {/* Signal type */}
      <span className="text-xs text-text-muted">{signal.signalType}</span>

      {/* Confidence */}
      <div className="ml-auto">
        <ConfidenceMeter value={signal.confidence} />
      </div>

      {/* Indicator tags */}
      {indicatorTags.length > 0 && (
        <div className="hidden gap-1 md:flex">
          {indicatorTags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-accent-secondary/10 px-1.5 py-0.5 text-[9px] font-medium text-accent-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-zelkora-elevated" />
          <div className="h-3 w-12 animate-pulse rounded bg-zelkora-elevated" />
          <div className="h-3 w-16 animate-pulse rounded bg-zelkora-elevated" />
          <div className="h-4 w-4 animate-pulse rounded bg-zelkora-elevated" />
          <div className="ml-auto h-2 w-20 animate-pulse rounded bg-zelkora-elevated" />
        </div>
      ))}
    </div>
  );
}

export function SignalFeed({ signals, loading }: SignalFeedProps) {
  const visible = signals.slice(0, 20);

  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card">
      <div className="flex items-center justify-between border-b border-zelkora-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Signal Feed</h3>
        {visible.length > 0 && (
          <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-semibold text-accent-primary">
            {signals.length} signals
          </span>
        )}
      </div>

      <div className="max-h-[480px] overflow-y-auto p-3">
        {loading ? (
          <FeedSkeleton />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-semibold text-text-primary">No signals yet</p>
            <p className="mt-1 text-xs text-text-muted">
              Signals appear as your agent analyzes the market
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visible.map((signal, idx) => (
              <SignalItem key={signal.id} signal={signal} isLatest={idx === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
