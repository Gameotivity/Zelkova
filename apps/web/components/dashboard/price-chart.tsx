"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Candle, Interval, Pair, PAIRS, INTERVALS, W, H, PAD, CHART_W, CHART_H, VOL_H } from "./chart-types";

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-zelkora-elevated" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-10 animate-pulse rounded bg-zelkora-elevated" />
          ))}
        </div>
      </div>
      <div className="h-[380px] w-full animate-pulse rounded bg-zelkora-elevated/50" />
    </div>
  );
}

const OHLCDisplay = React.memo(function OHLCDisplay({ candle }: { candle: Candle }) {
  return (
    <div className="flex items-center gap-4 text-xs">
      <span className="text-text-muted">O <span className="font-mono text-text-body">{candle.open.toLocaleString()}</span></span>
      <span className="text-text-muted">H <span className="font-mono text-success">{candle.high.toLocaleString()}</span></span>
      <span className="text-text-muted">L <span className="font-mono text-danger">{candle.low.toLocaleString()}</span></span>
      <span className="text-text-muted">C <span className="font-mono text-text-body">{candle.close.toLocaleString()}</span></span>
      <span className="text-text-muted">V <span className="font-mono text-accent-secondary">{(candle.volume / 1000).toFixed(1)}K</span></span>
    </div>
  );
});

const CandleGroup = React.memo(function CandleGroup({
  candle, index, total, candleW, priceY, volY,
}: {
  candle: Candle; index: number; total: number; candleW: number;
  priceY: (p: number) => number; volY: (v: number) => number;
}) {
  const x = PAD.left + (index / total) * CHART_W + candleW / 2;
  const isUp = candle.close >= candle.open;
  const color = isUp ? "#10B981" : "#F43F5E";
  const bodyTop = priceY(isUp ? candle.close : candle.open);
  const bodyBot = priceY(isUp ? candle.open : candle.close);
  const bodyH = Math.max(1, bodyBot - bodyTop);
  return (
    <g>
      <line x1={x} y1={priceY(candle.high)} x2={x} y2={priceY(candle.low)} stroke={color} strokeWidth="1" />
      <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} rx="0.5" />
      <rect x={x - candleW / 2} y={volY(candle.volume)} width={candleW} height={PAD.top + CHART_H - volY(candle.volume)} fill={color} opacity="0.2" rx="0.5" />
    </g>
  );
});

export const PriceChart = React.memo(function PriceChart() {
  const [pair, setPair] = useState<Pair>("BTCUSDT");
  const [interval, setInterval_] = useState<Interval>("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  const handleHover = useCallback((idx: number) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setHoveredIdx(idx));
  }, []);

  const handleLeave = useCallback(() => { cancelAnimationFrame(rafRef.current); setHoveredIdx(null); }, []);

  const fetchCandles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market/live?action=candles&pair=${pair}&interval=${interval}&limit=60`);
      if (!res.ok) throw new Error("fetch failed");
      const data: { candles?: Candle[] } = await res.json();
      setCandles(data.candles ?? []);
      setError(false);
    } catch { setError(true); } finally { setLoading(false); }
  }, [pair, interval]);

  useEffect(() => {
    fetchCandles();
    const id = globalThis.setInterval(fetchCandles, 30_000);
    return () => { globalThis.clearInterval(id); cancelAnimationFrame(rafRef.current); };
  }, [fetchCandles]);

  const { priceMin, priceMax, volMax, candleW } = useMemo(() => {
    if (candles.length === 0) return { priceMin: 0, priceMax: 1, volMax: 1, candleW: 4 };
    const pMin = Math.min(...candles.map((c) => c.low));
    const pMax = Math.max(...candles.map((c) => c.high));
    const margin = (pMax - pMin) * 0.05 || 1;
    return { priceMin: pMin - margin, priceMax: pMax + margin, volMax: Math.max(...candles.map((c) => c.volume)) || 1, candleW: Math.max(2, (CHART_W / candles.length) * 0.7) };
  }, [candles]);

  const priceY = useCallback((p: number) => PAD.top + CHART_H - VOL_H - ((p - priceMin) / (priceMax - priceMin)) * (CHART_H - VOL_H), [priceMin, priceMax]);
  const volY = useCallback((v: number) => PAD.top + CHART_H - (v / volMax) * VOL_H, [volMax]);

  const gridLines = useMemo(() => Array.from({ length: 5 }).map((_, i) => ({
    y: PAD.top + ((CHART_H - VOL_H) / 4) * i,
    price: priceMax - ((priceMax - priceMin) / 4) * i,
  })), [priceMax, priceMin]);

  const timeLabels = useMemo(() => {
    if (candles.length === 0) return [];
    const step = Math.max(1, Math.floor(candles.length / 6));
    return candles.filter((_, i) => i % step === 0).map((c) => {
      const idx = candles.indexOf(c);
      const x = PAD.left + (idx / candles.length) * CHART_W + candleW / 2;
      const d = new Date(c.openTime);
      const label = interval === "1d" || interval === "1w"
        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      return { x, label };
    });
  }, [candles, candleW, interval]);

  if (loading && candles.length === 0) return <ChartSkeleton />;
  const hovered = hoveredIdx !== null ? candles[hoveredIdx] : null;
  const displayCandle = hovered ?? candles[candles.length - 1];

  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select value={pair} onChange={(e) => setPair(e.target.value as Pair)} className="rounded-lg border border-zelkora-border bg-zelkora-elevated px-3 py-1.5 text-sm font-semibold text-text-primary outline-none transition-all focus:border-accent-primary">
            {PAIRS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {displayCandle && <OHLCDisplay candle={displayCandle} />}
        </div>
        <div className="flex gap-1 rounded-lg bg-zelkora-elevated p-0.5">
          {INTERVALS.map((iv) => (
            <button key={iv.value} onClick={() => setInterval_(iv.value)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${interval === iv.value ? "bg-accent-primary/15 text-accent-primary" : "text-text-muted hover:text-text-body"}`}>{iv.label}</button>
          ))}
        </div>
      </div>
      {error && candles.length === 0 ? (
        <div className="flex h-[380px] items-center justify-center text-sm text-text-muted">Unable to load chart data. Retrying...</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" onMouseLeave={handleLeave}>
          {gridLines.map((gl, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={gl.y} x2={W - PAD.right} y2={gl.y} stroke="#1E293B" strokeWidth="0.5" />
              <text x={W - PAD.right + 8} y={gl.y + 4} fill="#94A3B8" fontSize="10" fontFamily="ui-monospace, monospace">{gl.price >= 1000 ? `${(gl.price / 1000).toFixed(1)}k` : gl.price.toFixed(2)}</text>
            </g>
          ))}
          <line x1={PAD.left} y1={PAD.top + CHART_H - VOL_H} x2={W - PAD.right} y2={PAD.top + CHART_H - VOL_H} stroke="#1E293B" strokeWidth="0.5" strokeDasharray="4 2" />
          {candles.map((c, i) => <CandleGroup key={i} candle={c} index={i} total={candles.length} candleW={candleW} priceY={priceY} volY={volY} />)}
          {/* Hover zones */}
          {candles.map((_, i) => (
            <rect key={`hz-${i}`} x={PAD.left + (i / candles.length) * CHART_W} y={PAD.top} width={CHART_W / candles.length} height={CHART_H} fill="transparent" onMouseEnter={() => handleHover(i)} />
          ))}
          {hoveredIdx !== null && candles[hoveredIdx] && (() => {
            const x = PAD.left + (hoveredIdx / candles.length) * CHART_W + candleW / 2;
            const cy = priceY(candles[hoveredIdx].close);
            return (<g><line x1={x} y1={PAD.top} x2={x} y2={PAD.top + CHART_H} stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="3 3" /><line x1={PAD.left} y1={cy} x2={W - PAD.right} y2={cy} stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="3 3" /><circle cx={x} cy={cy} r="3" fill="#00E5FF" opacity="0.8" /></g>);
          })()}
          {timeLabels.map((tl, i) => <text key={i} x={tl.x} y={H - 8} fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="ui-monospace, monospace">{tl.label}</text>)}
        </svg>
      )}
    </div>
  );
});
