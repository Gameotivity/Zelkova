"use client";

import React from "react";

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 48;
  const h = 20;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-60">
      <path d={`M ${pts.join(" L ")}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CircularProgress({ percent }: { percent: number }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#1E293B" strokeWidth="6" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={percent >= 50 ? "#10B981" : "#F59E0B"} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="animate-progress" transform="rotate(-90 44 44)" />
      <text x="44" y="44" textAnchor="middle" dominantBaseline="central" fill="#F8FAFC" fontSize="16" fontWeight="700" fontFamily="ui-monospace, monospace">{percent.toFixed(0)}%</text>
    </svg>
  );
}

export function StatCard({ label, children, sparkline, className = "" }: {
  label: string;
  children: React.ReactNode;
  sparkline?: number[];
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-zelkora-border bg-zelkora-card p-5 transition-all duration-200 hover:border-zelkora-border-subtle ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
        {sparkline && sparkline.length > 1 && (
          <MiniSparkline values={sparkline} color={sparkline[sparkline.length - 1] >= sparkline[0] ? "#10B981" : "#F43F5E"} />
        )}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
