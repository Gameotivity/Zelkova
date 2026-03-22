"use client";

import { useState, useEffect } from "react";

interface ActivityItem {
  id: string;
  time: string;
  type: "trade" | "signal" | "alert";
  bot: string;
  pair: string;
  side: "BUY" | "SELL" | "HOLD";
  price: string;
  quantity: string;
  pnl: string | null;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-zelkora-border/50 px-4 py-3">
          <div className="h-3 w-14 animate-pulse rounded bg-zelkora-elevated" />
          <div className="h-3 w-24 animate-pulse rounded bg-zelkora-elevated" />
          <div className="h-3 w-16 animate-pulse rounded bg-zelkora-elevated" />
          <div className="ml-auto h-3 w-20 animate-pulse rounded bg-zelkora-elevated" />
        </div>
      ))}
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg className="h-10 w-10 text-text-disabled" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <p className="mt-3 text-sm text-text-muted">No recent activity</p>
      <p className="mt-1 text-xs text-text-disabled">
        Trade signals and executions will appear here
      </p>
    </div>
  );
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActivities([]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card">
      <div className="flex items-center justify-between border-b border-zelkora-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
        {activities.length > 0 && (
          <button className="text-xs font-medium text-accent-primary transition-all hover:text-accent-primary/80">
            View all
          </button>
        )}
      </div>

      {loading ? (
        <ActivitySkeleton />
      ) : activities.length === 0 ? (
        <EmptyActivity />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zelkora-border text-[11px] uppercase tracking-wider text-text-muted">
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Bot</th>
                <th className="px-5 py-3 font-medium">Pair</th>
                <th className="px-5 py-3 font-medium">Side</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium text-right">Qty</th>
                <th className="px-5 py-3 font-medium text-right">P&L</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b border-zelkora-border/30 transition-colors hover:bg-zelkora-elevated/30">
                  <td className="px-5 py-3 text-xs text-text-muted">{a.time}</td>
                  <td className="px-5 py-3 text-xs font-medium text-text-body">{a.bot}</td>
                  <td className="px-5 py-3 font-mono text-xs text-text-muted">{a.pair}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold ${
                      a.side === "BUY" ? "text-success" : a.side === "SELL" ? "text-danger" : "text-text-muted"
                    }`}>
                      {a.side}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-text-body">{a.price}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-text-muted">{a.quantity}</td>
                  <td className="px-5 py-3 text-right">
                    {a.pnl ? (
                      <span className={`font-mono text-xs font-medium tabular-nums ${
                        a.pnl.startsWith("+") ? "text-success" : "text-danger"
                      }`}>
                        {a.pnl}
                      </span>
                    ) : (
                      <span className="text-xs text-text-disabled">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
