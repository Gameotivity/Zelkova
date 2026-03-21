"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

type TimeRange = "24h" | "7d" | "30d" | "all";

interface DataPoint {
  time: string;
  value: number;
}

// Generate sample data for demo
function generateSampleData(range: TimeRange): DataPoint[] {
  const points: DataPoint[] = [];
  const now = Date.now();
  let count: number;
  let intervalMs: number;

  switch (range) {
    case "24h": count = 24; intervalMs = 3600000; break;
    case "7d": count = 7 * 24; intervalMs = 3600000; break;
    case "30d": count = 30; intervalMs = 86400000; break;
    case "all": count = 90; intervalMs = 86400000; break;
  }

  let value = 0;
  for (let i = count; i >= 0; i--) {
    const time = new Date(now - i * intervalMs);
    value += (Math.random() - 0.45) * 50;
    points.push({
      time: time.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round(value * 100) / 100,
    });
  }

  return points;
}

export function PnLChart() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    setData(generateSampleData(range));
  }, [range]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="text-lg font-semibold text-text-primary">P&L Overview</h2>
        <div className="flex h-48 items-center justify-center text-text-muted">Loading chart...</div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));
  const valueRange = maxVal - minVal || 1;
  const lastValue = data[data.length - 1]?.value || 0;
  const isPositive = lastValue >= 0;

  // Generate SVG path
  const width = 600;
  const height = 200;
  const padding = 10;

  const pathPoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = padding + (1 - (d.value - minVal) / valueRange) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const linePath = `M ${pathPoints.join(" L ")}`;
  const areaPath = `${linePath} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">P&L Overview</h2>
          <p className={cn("text-2xl font-bold font-mono tabular-nums", isPositive ? "text-success" : "text-danger")}>
            {isPositive ? "+" : ""}${lastValue.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-1">
          {(["24h", "7d", "30d", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                range === r ? "bg-accent-primary/10 text-accent-primary" : "text-text-muted hover:text-text-body"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? "#10B981" : "#F43F5E"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isPositive ? "#10B981" : "#F43F5E"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#pnlGradient)" />
        <path d={linePath} fill="none" stroke={isPositive ? "#10B981" : "#F43F5E"} strokeWidth="2" />
      </svg>
    </div>
  );
}
