"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";

interface SparklineData {
  values: number[];
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 64;
  const h = 24;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface AgentMetricsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: { value: number; label: string };
  sparkline?: SparklineData;
  className?: string;
}

export function AgentMetricsCard({
  icon,
  label,
  value,
  change,
  sparkline,
  className,
}: AgentMetricsCardProps) {
  const changeColor = useMemo(() => {
    if (!change) return "";
    return change.value >= 0 ? "text-success" : "text-danger";
  }, [change]);

  const sparkColor = useMemo(() => {
    if (!sparkline || sparkline.values.length < 2) return "#94A3B8";
    const first = sparkline.values[0];
    const last = sparkline.values[sparkline.values.length - 1];
    return last >= first ? "#10B981" : "#F43F5E";
  }, [sparkline]);

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-zelkora-border bg-zelkora-card p-4 transition-all duration-200",
        "hover:border-zelkora-border-subtle",
        className
      )}
    >
      {/* Gradient border on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">{icon}</span>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              {label}
            </p>
          </div>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums text-text-primary">
            {value}
          </p>
          {change && (
            <div className={cn("mt-1 flex items-center gap-1 text-xs font-medium font-mono tabular-nums", changeColor)}>
              <span>{change.value >= 0 ? "\u25B2" : "\u25BC"}</span>
              <span>
                {change.value >= 0 ? "+" : ""}
                {change.label}
              </span>
            </div>
          )}
        </div>
        {sparkline && sparkline.values.length >= 2 && (
          <div className="ml-2 mt-1">
            <MiniSparkline values={sparkline.values} color={sparkColor} />
          </div>
        )}
      </div>
    </div>
  );
}
