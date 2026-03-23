"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

type SortKey = "pnl" | "winRate" | "trades" | "streak";

interface Trader {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  bestStreak: number;
  currentStreak: number;
  badges: Array<{ id: string; name: string; icon: string; earnedAt: string }> | null;
  rank: number | null;
  tradingExperience: string | null;
  memberSince: string;
}

const SORT_OPTIONS: Array<{ key: SortKey; label: string; icon: string }> = [
  { key: "pnl", label: "Total P&L", icon: "$" },
  { key: "winRate", label: "Win Rate", icon: "%" },
  { key: "trades", label: "Total Trades", icon: "#" },
  { key: "streak", label: "Best Streak", icon: "W" },
];

const BADGE_ICONS: Record<string, string> = {
  first_trade: "🎯", profitable_week: "📈", streak_5: "🔥", streak_10: "💎",
  top_10: "🏆", top_3: "👑", whale: "🐋", veteran: "⭐",
};

function getMedalColor(rank: number): string {
  if (rank === 1) return "from-[#FFD700] to-[#FFA500]";
  if (rank === 2) return "from-[#C0C0C0] to-[#808080]";
  if (rank === 3) return "from-[#CD7F32] to-[#8B4513]";
  return "from-[#1A2340] to-[#1A2340]";
}

function formatPnl(pnl: number): string {
  const abs = Math.abs(pnl);
  if (abs >= 1000000) return `${(pnl / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(pnl / 1000).toFixed(1)}K`;
  return pnl.toFixed(2);
}

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [sort, setSort] = useState<SortKey>("pnl");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?sort=${sort}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setTraders(data.traders);
        setTotal(data.total);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sort]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // Demo data for when DB is empty
  const displayTraders = traders.length > 0 ? traders : DEMO_TRADERS;
  const displayTotal = total > 0 ? total : DEMO_TRADERS.length;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#8B5CF6]">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 0 1-3.77 1.522m0 0a6.003 6.003 0 0 1-3.77-1.522" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Global Leaderboard</h1>
            <p className="text-sm text-[#94A3B8]">{displayTotal} {displayTotal === 1 ? "trader" : "traders"} competing worldwide</p>
          </div>
        </div>
      </div>

      {/* Sort Tabs */}
      <div className="mb-6 flex gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button key={opt.key} onClick={() => setSort(opt.key)}
            className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              sort === opt.key
                ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30"
                : "bg-[#0F1629] text-[#94A3B8] border border-[#1E293B] hover:border-[#00E5FF]/20")}>
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#1A2340] text-[10px] font-bold">
              {opt.icon}
            </span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {displayTraders.length >= 3 && (
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[1, 0, 2].map((idx) => {
            const trader = displayTraders[idx];
            if (!trader) return null;
            const rank = idx + 1;
            const isFirst = rank === 1;
            return (
              <div key={trader.username} className={cn(
                "relative rounded-2xl border p-6 text-center transition-all",
                isFirst ? "border-[#FFD700]/30 bg-gradient-to-b from-[#FFD700]/5 to-[#0F1629] -mt-4" :
                rank === 2 ? "border-[#C0C0C0]/20 bg-[#0F1629]" : "border-[#CD7F32]/20 bg-[#0F1629]"
              )}>
                {/* Rank Medal */}
                <div className={cn("mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-lg font-black text-white",
                  getMedalColor(rank))}>
                  {rank}
                </div>
                {/* Avatar */}
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF] to-[#8B5CF6] text-xl font-bold text-white">
                  {(trader.displayName || trader.username || "?")[0].toUpperCase()}
                </div>
                <p className="font-bold text-[#F8FAFC]">{trader.displayName || trader.username}</p>
                <p className="text-xs text-[#94A3B8]">@{trader.username}</p>
                {trader.country && <p className="mt-1 text-xs text-[#475569]">{trader.country}</p>}
                <div className={cn("mt-3 text-2xl font-black font-mono",
                  trader.totalPnl >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
                  {trader.totalPnl >= 0 ? "+" : ""}{formatPnl(trader.totalPnl)}%
                </div>
                <div className="mt-2 flex justify-center gap-3 text-xs text-[#94A3B8]">
                  <span>{trader.winRate.toFixed(0)}% WR</span>
                  <span>{trader.totalTrades} trades</span>
                </div>
                {trader.badges && trader.badges.length > 0 && (
                  <div className="mt-3 flex justify-center gap-1">
                    {trader.badges.slice(0, 4).map((b) => (
                      <span key={b.id} title={b.name} className="text-base">
                        {BADGE_ICONS[b.id] || b.icon}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full Table */}
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F1629] overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_120px_100px_100px_100px] gap-2 border-b border-[#1E293B] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#475569]">
          <span>Rank</span>
          <span>Trader</span>
          <span className="text-right">P&L %</span>
          <span className="text-right">Win Rate</span>
          <span className="text-right">Trades</span>
          <span className="text-right">Streak</span>
        </div>

        {loading && traders.length === 0 && displayTraders === DEMO_TRADERS ? null : (
          displayTraders.map((trader, i) => {
            const rank = i + 1;
            return (
              <div key={trader.username || i}
                className={cn("grid grid-cols-[60px_1fr_120px_100px_100px_100px] gap-2 items-center px-6 py-4 border-b border-[#1E293B]/50 transition-all hover:bg-[#1A2340]/50",
                  rank <= 3 && "bg-[#1A2340]/20")}>
                {/* Rank */}
                <div className="flex items-center">
                  {rank <= 3 ? (
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-xs font-black text-white",
                      getMedalColor(rank))}>{rank}</span>
                  ) : (
                    <span className="font-mono text-sm text-[#94A3B8]">{rank}</span>
                  )}
                </div>

                {/* Trader Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF]/20 to-[#8B5CF6]/20 text-sm font-bold text-[#00E5FF]">
                    {(trader.displayName || trader.username || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#F8FAFC]">
                      {trader.displayName || trader.username}
                    </p>
                    <p className="truncate text-xs text-[#475569]">@{trader.username}</p>
                  </div>
                  {trader.badges && trader.badges.length > 0 && (
                    <div className="hidden sm:flex gap-0.5 ml-1">
                      {trader.badges.slice(0, 3).map((b) => (
                        <span key={b.id} title={b.name} className="text-sm">
                          {BADGE_ICONS[b.id] || b.icon}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* P&L */}
                <span className={cn("text-right font-mono text-sm font-bold",
                  trader.totalPnl >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
                  {trader.totalPnl >= 0 ? "+" : ""}{formatPnl(trader.totalPnl)}%
                </span>

                {/* Win Rate */}
                <div className="text-right">
                  <span className="font-mono text-sm text-[#E2E8F0]">{trader.winRate.toFixed(1)}%</span>
                </div>

                {/* Trades */}
                <span className="text-right font-mono text-sm text-[#94A3B8]">{trader.totalTrades}</span>

                {/* Streak */}
                <div className="text-right">
                  <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold",
                    trader.currentStreak >= 5 ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
                    trader.currentStreak >= 3 ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#1A2340] text-[#94A3B8]")}>
                    {trader.currentStreak > 0 && "🔥"} {trader.bestStreak}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Call to Action */}
      <div className="mt-8 rounded-2xl border border-[#00E5FF]/20 bg-gradient-to-r from-[#00E5FF]/5 to-[#8B5CF6]/5 p-8 text-center">
        <h3 className="text-xl font-bold text-[#F8FAFC]">Ready to compete?</h3>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Deploy a bot, make profitable trades, and climb the global rankings.
        </p>
        <a href="/agents"
          className="mt-4 inline-block rounded-xl bg-[#00E5FF] px-8 py-3 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/20">
          Deploy Your First Bot
        </a>
      </div>
    </div>
  );
}

// Demo data for when DB is empty
const DEMO_TRADERS: Trader[] = [
  {
    username: "alpha_whale", displayName: "Alpha Whale", avatarUrl: null,
    country: "Singapore", totalPnl: 847.32, totalTrades: 1247, winRate: 73.2,
    bestStreak: 18, currentStreak: 7,
    badges: [
      { id: "top_3", name: "Top 3", icon: "👑", earnedAt: "2026-03-01" },
      { id: "whale", name: "Whale Trader", icon: "🐋", earnedAt: "2026-02-15" },
      { id: "streak_10", name: "10 Win Streak", icon: "💎", earnedAt: "2026-03-10" },
    ],
    rank: 1, tradingExperience: "expert", memberSince: "2026-01-01",
  },
  {
    username: "crypto_sage", displayName: "Crypto Sage", avatarUrl: null,
    country: "South Korea", totalPnl: 623.18, totalTrades: 892, winRate: 68.5,
    bestStreak: 14, currentStreak: 5,
    badges: [
      { id: "top_3", name: "Top 3", icon: "👑", earnedAt: "2026-03-01" },
      { id: "streak_10", name: "10 Win Streak", icon: "💎", earnedAt: "2026-02-20" },
    ],
    rank: 2, tradingExperience: "advanced", memberSince: "2026-01-15",
  },
  {
    username: "defi_hunter", displayName: "DeFi Hunter", avatarUrl: null,
    country: "United States", totalPnl: 512.47, totalTrades: 2103, winRate: 61.8,
    bestStreak: 11, currentStreak: 3,
    badges: [
      { id: "top_10", name: "Top 10", icon: "🏆", earnedAt: "2026-03-05" },
      { id: "veteran", name: "Veteran", icon: "⭐", earnedAt: "2026-02-01" },
    ],
    rank: 3, tradingExperience: "expert", memberSince: "2026-01-05",
  },
  {
    username: "moon_trader", displayName: "Moon Trader", avatarUrl: null,
    country: "UAE", totalPnl: 389.21, totalTrades: 567, winRate: 71.0,
    bestStreak: 9, currentStreak: 9,
    badges: [{ id: "streak_5", name: "5 Win Streak", icon: "🔥", earnedAt: "2026-03-15" }],
    rank: 4, tradingExperience: "intermediate", memberSince: "2026-02-01",
  },
  {
    username: "btc_maximalist", displayName: "BTC Maximalist", avatarUrl: null,
    country: "Germany", totalPnl: 278.65, totalTrades: 342, winRate: 76.3,
    bestStreak: 12, currentStreak: 2,
    badges: [{ id: "top_10", name: "Top 10", icon: "🏆", earnedAt: "2026-03-10" }],
    rank: 5, tradingExperience: "advanced", memberSince: "2026-01-20",
  },
  {
    username: "sol_sniper", displayName: "SOL Sniper", avatarUrl: null,
    country: "Japan", totalPnl: 213.44, totalTrades: 1456, winRate: 58.2,
    bestStreak: 8, currentStreak: 0,
    badges: [{ id: "first_trade", name: "First Trade", icon: "🎯", earnedAt: "2026-01-10" }],
    rank: 6, tradingExperience: "intermediate", memberSince: "2026-01-10",
  },
  {
    username: "grid_master", displayName: "Grid Master", avatarUrl: null,
    country: "Canada", totalPnl: 187.93, totalTrades: 3421, winRate: 65.7,
    bestStreak: 7, currentStreak: 4,
    badges: [{ id: "profitable_week", name: "Profitable Week", icon: "📈", earnedAt: "2026-03-12" }],
    rank: 7, tradingExperience: "advanced", memberSince: "2026-01-25",
  },
  {
    username: "dca_king", displayName: "DCA King", avatarUrl: null,
    country: "India", totalPnl: 156.77, totalTrades: 890, winRate: 62.1,
    bestStreak: 6, currentStreak: 6,
    badges: [{ id: "streak_5", name: "5 Win Streak", icon: "🔥", earnedAt: "2026-03-18" }],
    rank: 8, tradingExperience: "beginner", memberSince: "2026-02-10",
  },
];
