"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { StatCard, CircularProgress } from "./stat-card";

interface PortfolioStats {
  totalValue: number;
  change24h: number;
  changePercent24h: number;
  activeBots: number;
  totalTrades: number;
  winRate: number;
  bestBot: { name: string; pnl: number } | null;
  allocations: { label: string; value: number; color: string }[];
}

function useAnimatedCounter(target: number, duration: number = 800): number {
  const [value, setValue] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let frameId: number;
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + diff * eased);
      if (progress < 1) { frameId = requestAnimationFrame(tick); }
      else { prev.current = target; }
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return value;
}

function DonutChart({ allocations }: { allocations: PortfolioStats["allocations"] }) {
  const total = allocations.reduce((s, a) => s + a.value, 0);
  if (total === 0) return null;
  const r = 32;
  const cx = 40;
  const cy = 40;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {allocations.map((a, i) => {
          const dashLen = (a.value / total) * circ;
          const seg = (<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={a.color} strokeWidth="8" strokeDasharray={`${dashLen} ${circ - dashLen}`} strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`} />);
          offset += dashLen;
          return seg;
        })}
      </svg>
      <div className="space-y-1">
        {allocations.map((a) => (
          <div key={a.label} className="flex items-center gap-1.5 text-[10px]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
            <span className="text-text-muted">{a.label}</span>
            <span className="font-mono text-text-body">{((a.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zelkora-border bg-zelkora-card p-5">
          <div className="h-3 w-20 animate-pulse rounded bg-zelkora-elevated" />
          <div className="mt-3 h-7 w-28 animate-pulse rounded bg-zelkora-elevated" />
        </div>
      ))}
    </div>
  );
}

const DEMO_SPARKLINE = [100, 102, 98, 105, 110, 108, 115, 120, 118, 125];

export function PortfolioOverview() {
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({ totalValue: 0, change24h: 0, changePercent24h: 0, activeBots: 0, totalTrades: 0, winRate: 0, bestBot: null, allocations: [] });
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!stats) return;
    if (prevValue.current !== 0 && stats.change24h !== prevValue.current) {
      setFlash(stats.change24h > prevValue.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      prevValue.current = stats.change24h;
      return () => clearTimeout(t);
    }
    prevValue.current = stats.change24h;
  }, [stats]);

  const animatedValue = useAnimatedCounter(stats?.totalValue ?? 0);
  const todayFlashClass = useMemo(() => {
    if (flash === "up") return "animate-[flash-green_0.6s]";
    if (flash === "down") return "animate-[flash-red_0.6s]";
    return "";
  }, [flash]);

  if (loading) return <OverviewSkeleton />;
  const s = stats ?? { totalValue: 0, change24h: 0, changePercent24h: 0, activeBots: 0, totalTrades: 0, winRate: 0, bestBot: null, allocations: [] };
  const isPositive = s.change24h >= 0;
  const isEmpty = s.totalValue === 0 && s.activeBots === 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Portfolio Value" className="col-span-2 lg:col-span-1" sparkline={isEmpty ? undefined : DEMO_SPARKLINE}>
        {isEmpty ? (
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-text-primary">$0.00</p>
            <p className="mt-1 text-xs text-text-muted">Connect your wallet to get started</p>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-text-primary">${animatedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className={`mt-1 text-sm font-medium font-mono tabular-nums ${todayFlashClass} ${isPositive ? "text-success" : "text-danger"}`}>
              {isPositive ? "+" : ""}${s.change24h.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              <span className="ml-1.5 text-xs">({isPositive ? "+" : ""}{s.changePercent24h.toFixed(2)}%)</span>
            </p>
          </div>
        )}
      </StatCard>

      <StatCard label="Active Bots">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold font-mono tabular-nums text-text-primary">{s.activeBots}</p>
          {s.activeBots > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />Running
            </span>
          )}
        </div>
        {s.activeBots === 0 && <p className="mt-1 text-xs text-text-muted">No bots deployed yet</p>}
      </StatCard>

      <StatCard label="Total Trades">
        <p className="text-2xl font-bold font-mono tabular-nums text-text-primary">{s.totalTrades.toLocaleString()}</p>
        {s.totalTrades === 0 && <p className="mt-1 text-xs text-text-muted">Trades appear here once bots execute</p>}
      </StatCard>

      <StatCard label="Win Rate">
        {s.totalTrades === 0 ? (
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-text-disabled">--</p>
            <p className="mt-1 text-xs text-text-muted">Needs trade history</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <CircularProgress percent={s.winRate} />
            {s.bestBot && (
              <div className="min-w-0">
                <p className="text-xs text-text-muted">Best Bot</p>
                <p className="truncate text-sm font-semibold text-text-primary">{s.bestBot.name}</p>
                <p className="font-mono text-xs font-medium text-success">+${s.bestBot.pnl.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
      </StatCard>

      {s.allocations.length > 0 && (
        <StatCard label="Allocation" className="col-span-2">
          <DonutChart allocations={s.allocations} />
        </StatCard>
      )}
    </div>
  );
}
