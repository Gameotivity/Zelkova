"use client";

import { useState, useMemo } from "react";
import type { EquityPoint, DrawdownPoint, TradeRecord } from "./strategy-types";

interface BacktestChartProps {
  equityCurve: EquityPoint[];
  drawdownCurve: DrawdownPoint[];
  trades: TradeRecord[];
  initialCapital: number;
}

export function BacktestChart({
  equityCurve,
  drawdownCurve,
  trades,
  initialCapital,
}: BacktestChartProps) {
  return (
    <div className="space-y-4">
      <EquityCurveChart
        data={equityCurve}
        trades={trades}
        initialCapital={initialCapital}
      />
      <DrawdownChart data={drawdownCurve} />
    </div>
  );
}

function EquityCurveChart({
  data,
  trades,
  initialCapital,
}: {
  data: EquityPoint[];
  trades: TradeRecord[];
  initialCapital: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { pathD, gradientId, minY, maxY, width, height, points } = useMemo(() => {
    const w = 800;
    const h = 300;
    const pad = 40;
    if (data.length < 2) return { pathD: "", gradientId: "eq-grad", minY: 0, maxY: 0, width: w, height: h, points: [] };

    const values = data.map((d) => d.equity);
    const mn = Math.min(...values) * 0.98;
    const mx = Math.max(...values) * 1.02;
    const xStep = (w - pad * 2) / (data.length - 1);

    const pts = data.map((d, i) => ({
      x: pad + i * xStep,
      y: pad + ((mx - d.equity) / (mx - mn)) * (h - pad * 2),
      equity: d.equity,
      date: d.date,
    }));

    const segments: string[] = [];
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) {
        segments.push(`M ${pts[i].x} ${pts[i].y}`);
      } else {
        const cp1x = pts[i - 1].x + xStep * 0.3;
        const cp1y = pts[i - 1].y;
        const cp2x = pts[i].x - xStep * 0.3;
        const cp2y = pts[i].y;
        segments.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i].x} ${pts[i].y}`);
      }
    }

    const isPositive = values[values.length - 1] >= initialCapital;
    const gId = isPositive ? "eq-grad-green" : "eq-grad-red";

    return { pathD: segments.join(" "), gradientId: gId, minY: mn, maxY: mx, width: w, height: h, points: pts };
  }, [data, initialCapital]);

  const isPositive = data.length > 0 && data[data.length - 1].equity >= initialCapital;
  const strokeColor = isPositive ? "#10B981" : "#F43F5E";
  const fillStart = isPositive ? "#10B98140" : "#F43F5E40";

  const tradeMarkers = useMemo(() => {
    if (points.length === 0) return [];
    return trades.map((t) => {
      const idx = data.findIndex((d) => d.date === t.exitTime);
      if (idx < 0 || idx >= points.length) return null;
      return { x: points[idx].x, y: points[idx].y, win: t.pnl >= 0 };
    }).filter(Boolean) as { x: number; y: number; win: boolean }[];
  }, [trades, data, points]);

  if (data.length < 2) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-[#1E293B] bg-[#0F1629] text-sm text-[#94A3B8]">
        Not enough data to render chart
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[#F8FAFC]">Equity Curve</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillStart} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => {
          const y = 40 + pct * (height - 80);
          const val = maxY - pct * (maxY - minY);
          return (
            <g key={pct}>
              <line x1={40} y1={y} x2={width - 40} y2={y} stroke="#1E293B" strokeWidth={1} />
              <text x={36} y={y + 4} textAnchor="end" className="fill-[#94A3B8] text-[10px] font-mono">
                ${val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Fill area */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${height - 40} L ${points[0].x} ${height - 40} Z`}
          fill={`url(#${gradientId})`}
        />

        {/* Main line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={2} />

        {/* Trade markers */}
        {tradeMarkers.map((m, i) => (
          <circle
            key={i}
            cx={m.x}
            cy={m.y}
            r={3}
            fill={m.win ? "#10B981" : "#F43F5E"}
            stroke={m.win ? "#10B98180" : "#F43F5E80"}
            strokeWidth={2}
          />
        ))}

        {/* Hover targets */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - 4}
            y={0}
            width={8}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
          />
        ))}

        {/* Tooltip */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <g>
            <line
              x1={points[hoveredIdx].x}
              y1={40}
              x2={points[hoveredIdx].x}
              y2={height - 40}
              stroke="#94A3B8"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].y} r={5} fill={strokeColor} stroke="#0F1629" strokeWidth={2} />
            <rect x={points[hoveredIdx].x - 55} y={points[hoveredIdx].y - 38} width={110} height={30} rx={6} fill="#1A2340" stroke="#1E293B" />
            <text x={points[hoveredIdx].x} y={points[hoveredIdx].y - 24} textAnchor="middle" className="fill-[#94A3B8] text-[9px]">
              {points[hoveredIdx].date}
            </text>
            <text x={points[hoveredIdx].x} y={points[hoveredIdx].y - 13} textAnchor="middle" className="fill-[#F8FAFC] text-[11px] font-mono font-bold">
              ${points[hoveredIdx].equity.toFixed(2)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function DrawdownChart({ data }: { data: DrawdownPoint[] }) {
  const { pathD, points, width, height, minDD } = useMemo(() => {
    const w = 800;
    const h = 150;
    const pad = 40;
    if (data.length < 2) return { pathD: "", points: [], width: w, height: h, minDD: 0 };

    const values = data.map((d) => d.drawdown);
    const mn = Math.min(...values) * 1.1;
    const xStep = (w - pad * 2) / (data.length - 1);

    const pts = data.map((d, i) => ({
      x: pad + i * xStep,
      y: pad + ((0 - d.drawdown) / (0 - mn)) * (h - pad * 2),
    }));

    const segments: string[] = [];
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) segments.push(`M ${pts[i].x} ${pts[i].y}`);
      else segments.push(`L ${pts[i].x} ${pts[i].y}`);
    }

    return { pathD: segments.join(" "), points: pts, width: w, height: h, minDD: mn };
  }, [data]);

  if (data.length < 2) return null;

  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[#F8FAFC]">Drawdown</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="dd-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="#F43F5E30" />
          </linearGradient>
        </defs>
        <line x1={40} y1={40} x2={width - 40} y2={40} stroke="#1E293B" strokeWidth={1} />
        <text x={36} y={44} textAnchor="end" className="fill-[#94A3B8] text-[10px] font-mono">0%</text>
        <text x={36} y={height - 36} textAnchor="end" className="fill-[#94A3B8] text-[10px] font-mono">
          {minDD.toFixed(1)}%
        </text>
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${40} L ${points[0].x} ${40} Z`}
          fill="url(#dd-grad)"
        />
        <path d={pathD} fill="none" stroke="#F43F5E" strokeWidth={1.5} />
      </svg>
    </div>
  );
}
