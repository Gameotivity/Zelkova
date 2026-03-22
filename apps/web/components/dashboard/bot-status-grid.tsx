"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type BotStatus = "LIVE" | "PAPER" | "PAUSED" | "STOPPED";
type SortKey = "name" | "pnl" | "status";
type FilterStatus = "ALL" | BotStatus;

interface Bot {
  id: string; name: string; strategy: string; status: BotStatus;
  pnl: number; pnlPercent: number; lastSignal: string; lastSignalTime: string;
  pairs: string[]; equityCurve: number[];
}

const STATUS_STYLES: Record<BotStatus, { dot: string; bg: string; label: string }> = {
  LIVE: { dot: "bg-success animate-pulse-dot", bg: "bg-success/10 text-success", label: "Live" },
  PAPER: { dot: "bg-warning", bg: "bg-warning/10 text-warning", label: "Paper" },
  PAUSED: { dot: "bg-text-muted", bg: "bg-zelkora-elevated text-text-muted", label: "Paused" },
  STOPPED: { dot: "bg-danger", bg: "bg-danger/10 text-danger", label: "Stopped" },
};

const STRATEGY_COLORS: Record<string, string> = {
  rsi_mean_reversion: "bg-accent-secondary/10 text-accent-secondary",
  macd_crossover: "bg-accent-primary/10 text-accent-primary",
  bollinger_breakout: "bg-warning/10 text-warning",
  grid_trading: "bg-success/10 text-success",
};

function MiniEquityCurve({ values, isUp }: { values: number[]; isUp: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(...values); const max = Math.max(...values);
  const range = max - min || 1; const w = 60; const h = 24;
  const color = isUp ? "#10B981" : "#F43F5E";
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs><linearGradient id={`eq-${isUp}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`M ${pts.join(" L ")} L ${w},${h} L 0,${h} Z`} fill={`url(#eq-${isUp})`} />
      <path d={`M ${pts.join(" L ")}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const BotCard = React.memo(function BotCard({ bot, onTogglePause }: { bot: Bot; onTogglePause: (id: string, s: BotStatus) => void }) {
  const style = STATUS_STYLES[bot.status];
  const isUp = bot.pnl >= 0;
  const [flashClass, setFlashClass] = useState("");
  const prevPnl = React.useRef(bot.pnl);
  useEffect(() => {
    if (prevPnl.current !== bot.pnl) {
      setFlashClass(bot.pnl > prevPnl.current ? "animate-[flash-green_0.6s]" : "animate-[flash-red_0.6s]");
      const t = setTimeout(() => setFlashClass(""), 600); prevPnl.current = bot.pnl; return () => clearTimeout(t);
    }
  }, [bot.pnl]);
  const strategyStyle = STRATEGY_COLORS[bot.strategy] ?? "bg-zelkora-elevated text-text-muted";
  const canPause = bot.status === "LIVE" || bot.status === "PAPER";
  const canResume = bot.status === "PAUSED";

  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-4 transition-all duration-200 hover:border-zelkora-border-subtle">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} /><h3 className="truncate text-sm font-semibold text-text-primary">{bot.name}</h3></div>
          <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold", strategyStyle)}>{bot.strategy.replace(/_/g, " ")}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg}`}>{style.label}</span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div><p className="text-[10px] uppercase tracking-wider text-text-muted">P&L</p><p className={cn("font-mono text-lg font-bold tabular-nums", flashClass, isUp ? "text-success" : "text-danger")}>{isUp ? "+" : ""}${bot.pnl.toFixed(2)}</p></div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn("font-mono text-xs font-medium tabular-nums", isUp ? "text-success" : "text-danger")}>{isUp ? "+" : ""}{bot.pnlPercent.toFixed(2)}%</span>
          <MiniEquityCurve values={bot.equityCurve} isUp={isUp} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-zelkora-border pt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase text-text-muted">Signal:</span>
          <span className={cn("text-xs font-semibold", bot.lastSignal === "BUY" ? "text-success" : bot.lastSignal === "SELL" ? "text-danger" : "text-text-muted")}>{bot.lastSignal}</span>
          <span className="text-[10px] text-text-disabled">{bot.lastSignalTime}</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {bot.pairs.slice(0, 3).map((p) => <span key={p} className="rounded bg-zelkora-elevated px-1.5 py-0.5 text-[10px] font-mono text-text-muted">{p}</span>)}
        {bot.pairs.length > 3 && <span className="text-[10px] text-text-disabled">+{bot.pairs.length - 3}</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/agents/${bot.id}`} className="flex-1 rounded-lg border border-zelkora-border bg-zelkora-elevated px-3 py-1.5 text-center text-xs font-medium text-text-body transition-all hover:border-accent-primary/50 hover:text-accent-primary">Details</Link>
        {canPause && <button onClick={() => onTogglePause(bot.id, "PAUSED")} className="flex-1 rounded-lg border border-zelkora-border px-3 py-1.5 text-xs font-medium text-warning transition-all hover:border-warning/50 hover:bg-warning/5">Pause</button>}
        {canResume && <button onClick={() => onTogglePause(bot.id, "PAPER")} className="flex-1 rounded-lg border border-zelkora-border px-3 py-1.5 text-xs font-medium text-success transition-all hover:border-success/50 hover:bg-success/5">Resume</button>}
      </div>
    </div>
  );
});

export function BotStatusGrid() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("pnl");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");

  useEffect(() => { const t = setTimeout(() => { setBots([]); setLoading(false); }, 400); return () => clearTimeout(t); }, []);
  const handleTogglePause = useCallback((id: string, newStatus: BotStatus) => { setBots((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))); }, []);

  const filtered = useMemo(() => {
    let list = filterStatus === "ALL" ? bots : bots.filter((b) => b.status === filterStatus);
    switch (sortKey) { case "pnl": list = [...list].sort((a, b) => b.pnl - a.pnl); break; case "name": list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break; case "status": list = [...list].sort((a, b) => a.status.localeCompare(b.status)); break; }
    return list;
  }, [bots, sortKey, filterStatus]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Active Bots</h2>
          {bots.length > 0 && <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-semibold text-accent-primary">{bots.filter((b) => b.status === "LIVE" || b.status === "PAPER").length} running</span>}
        </div>
        {bots.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 rounded-lg bg-zelkora-elevated p-0.5">
              {(["ALL", "LIVE", "PAPER", "PAUSED"] as FilterStatus[]).map((f) => (
                <button key={f} onClick={() => setFilterStatus(f)} className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all", filterStatus === f ? "bg-accent-primary/15 text-accent-primary" : "text-text-muted hover:text-text-body")}>{f}</button>
              ))}
            </div>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded-lg border border-zelkora-border bg-zelkora-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted outline-none transition-all focus:border-accent-primary">
              <option value="pnl">Sort: P&L</option><option value="name">Sort: Name</option><option value="status">Sort: Status</option>
            </select>
          </div>
        )}
      </div>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="rounded-xl border border-zelkora-border bg-zelkora-card p-4"><div className="flex items-center gap-2"><div className="h-2 w-2 animate-pulse rounded-full bg-zelkora-elevated" /><div className="h-4 w-24 animate-pulse rounded bg-zelkora-elevated" /></div><div className="mt-3 h-6 w-20 animate-pulse rounded bg-zelkora-elevated" /></div>))}</div>
      ) : bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zelkora-border bg-zelkora-card/50 px-6 py-12 text-center">
          <div className="rounded-xl bg-zelkora-elevated p-4"><svg className="h-8 w-8 text-text-disabled" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21a48.25 48.25 0 0 1-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg></div>
          <p className="mt-4 text-sm font-semibold text-text-primary">No bots running</p>
          <p className="mt-1 text-xs text-text-muted">Deploy your first trading bot to see it here</p>
          <Link href="/agents/new" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-xs font-semibold text-zelkora-base transition-all hover:bg-accent-primary/90">Deploy your first bot<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg></Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-8 text-center"><p className="text-sm text-text-muted">No bots match the current filter</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((bot) => <BotCard key={bot.id} bot={bot} onTogglePause={handleTogglePause} />)}</div>
      )}
    </div>
  );
}
