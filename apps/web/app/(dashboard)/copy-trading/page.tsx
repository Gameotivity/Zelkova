"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type SortKey = "aiScore" | "pnl" | "winRate" | "followers";

interface Leader {
  id: string;
  walletAddress: string;
  name: string | null;
  aiScore: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  totalPnl: number;
  pnl30d: number;
  avgLeverage: number;
  followerCount: number;
  strategyTags: string[] | null;
  isActive: boolean;
}

interface Subscription {
  id: string;
  leaderId: string;
  leaderName: string | null;
  leaderWallet: string;
  leaderPnl: number;
  leaderWinRate: number;
  allocationUsd: number;
  maxLeverage: number;
  riskScale: number;
  isActive: boolean;
  totalPnl: number;
  createdAt: string;
}

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "aiScore", label: "AI Score" },
  { key: "pnl", label: "Total P&L" },
  { key: "winRate", label: "Win Rate" },
  { key: "followers", label: "Followers" },
];

function formatPnl(pnl: number): string {
  const abs = Math.abs(pnl);
  if (abs >= 1000000) return `${(pnl / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(pnl / 1000).toFixed(1)}K`;
  return pnl.toFixed(2);
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Demo leaders for when DB is empty
const DEMO_LEADERS: Leader[] = [
  {
    id: "demo-1", walletAddress: "0xABCD...1234", name: "Momentum Alpha",
    aiScore: 92, sharpeRatio: 2.4, winRate: 71.5, maxDrawdown: 8.2,
    totalPnl: 156420, pnl30d: 23800, avgLeverage: 3.2, followerCount: 847,
    strategyTags: ["Momentum", "BTC", "ETH"], isActive: true,
  },
  {
    id: "demo-2", walletAddress: "0xEF01...5678", name: "DeFi Whale",
    aiScore: 88, sharpeRatio: 1.9, winRate: 68.3, maxDrawdown: 12.1,
    totalPnl: 98750, pnl30d: 15200, avgLeverage: 2.5, followerCount: 623,
    strategyTags: ["Mean Reversion", "ALT"], isActive: true,
  },
  {
    id: "demo-3", walletAddress: "0x2345...9ABC", name: "Grid Master",
    aiScore: 85, sharpeRatio: 3.1, winRate: 76.2, maxDrawdown: 5.4,
    totalPnl: 72300, pnl30d: 8900, avgLeverage: 1.5, followerCount: 412,
    strategyTags: ["Grid", "Low Risk"], isActive: true,
  },
  {
    id: "demo-4", walletAddress: "0x6789...DEF0", name: "Trend Sniper",
    aiScore: 82, sharpeRatio: 1.7, winRate: 62.8, maxDrawdown: 15.3,
    totalPnl: 54100, pnl30d: 19400, avgLeverage: 5.0, followerCount: 289,
    strategyTags: ["Breakout", "High Vol"], isActive: true,
  },
];

export default function CopyTradingPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [sort, setSort] = useState<SortKey>("aiScore");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "active">("browse");

  const fetchLeaders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/copy-trading?sort=${sort}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setLeaders(data.leaders);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sort]);

  const fetchSubs = useCallback(async () => {
    try {
      const res = await fetch("/api/copy-trading/subscriptions");
      if (res.ok) {
        const data = await res.json();
        setSubs(data.subscriptions);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchLeaders();
    fetchSubs();
  }, [fetchLeaders, fetchSubs]);

  const displayLeaders = leaders.length > 0 ? leaders : DEMO_LEADERS;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#0F1629] p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00E5FF]/5 to-[#8B5CF6]/5" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#8B5CF6]">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Copy Trading</h1>
            <p className="text-sm text-[#94A3B8]">
              Mirror top traders automatically. AI-scored, risk-managed.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("browse")}
          className={cn("rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
            tab === "browse" ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30" :
            "bg-[#0F1629] text-[#94A3B8] border border-[#1E293B] hover:border-[#00E5FF]/20")}>
          Browse Leaders
        </button>
        <button onClick={() => setTab("active")}
          className={cn("rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
            tab === "active" ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30" :
            "bg-[#0F1629] text-[#94A3B8] border border-[#1E293B] hover:border-[#00E5FF]/20")}>
          My Copies {subs.filter((s) => s.isActive).length > 0 && (
            <span className="ml-1.5 rounded-full bg-[#00E5FF]/20 px-2 py-0.5 text-[10px]">
              {subs.filter((s) => s.isActive).length}
            </span>
          )}
        </button>
      </div>

      {tab === "browse" && (
        <>
          {/* Sort */}
          <div className="flex gap-2">
            {SORT_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => setSort(opt.key)}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  sort === opt.key ? "bg-[#8B5CF6]/10 text-[#8B5CF6]" : "text-[#94A3B8] hover:text-[#E2E8F0]")}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Leader Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {displayLeaders.map((leader) => (
              <div key={leader.id} className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5 transition-all hover:border-[#00E5FF]/30">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF]/20 to-[#8B5CF6]/20 text-sm font-bold text-[#00E5FF]">
                      {(leader.name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#F8FAFC]">{leader.name || shortenAddress(leader.walletAddress)}</h3>
                      <p className="text-xs text-[#475569]">{shortenAddress(leader.walletAddress)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#8B5CF6]/10 px-2.5 py-1">
                    <span className="text-[10px] text-[#94A3B8]">AI</span>
                    <span className="font-mono text-sm font-bold text-[#8B5CF6]">{leader.aiScore}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="mb-3 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-[#475569]">Total P&L</p>
                    <p className={cn("font-mono text-sm font-bold", leader.totalPnl >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
                      ${formatPnl(leader.totalPnl)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#475569]">Win Rate</p>
                    <p className="font-mono text-sm font-bold text-[#E2E8F0]">{leader.winRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#475569]">Max DD</p>
                    <p className="font-mono text-sm font-bold text-[#F59E0B]">{leader.maxDrawdown.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Extra Stats */}
                <div className="mb-3 flex items-center gap-4 text-xs text-[#94A3B8]">
                  <span>Sharpe: {leader.sharpeRatio.toFixed(1)}</span>
                  <span>Avg Lev: {leader.avgLeverage.toFixed(1)}x</span>
                  <span>{leader.followerCount} followers</span>
                </div>

                {/* Tags */}
                {leader.strategyTags && leader.strategyTags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {leader.strategyTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[#1A2340] px-2 py-0.5 text-[10px] text-[#94A3B8]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <button className="w-full rounded-lg bg-[#00E5FF]/10 py-2.5 text-sm font-semibold text-[#00E5FF] transition-all hover:bg-[#00E5FF]/20">
                  Copy This Trader
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "active" && (
        <div className="space-y-4">
          {subs.filter((s) => s.isActive).length === 0 ? (
            <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1A2340]">
                <svg className="h-8 w-8 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC]">No active copies</h3>
              <p className="mt-1 text-sm text-[#94A3B8]">Browse leaders and start copy trading</p>
              <button onClick={() => setTab("browse")}
                className="mt-4 rounded-lg bg-[#00E5FF] px-6 py-2.5 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/20">
                Browse Leaders
              </button>
            </div>
          ) : (
            subs.filter((s) => s.isActive).map((sub) => (
              <div key={sub.id} className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF]/20 to-[#8B5CF6]/20 text-sm font-bold text-[#00E5FF]">
                      {(sub.leaderName || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#F8FAFC]">{sub.leaderName || shortenAddress(sub.leaderWallet)}</h3>
                      <p className="text-xs text-[#475569]">${sub.allocationUsd.toLocaleString()} allocated | {sub.riskScale}x scale</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-mono text-lg font-bold", sub.totalPnl >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
                      {sub.totalPnl >= 0 ? "+" : ""}${formatPnl(sub.totalPnl)}
                    </p>
                    <p className="text-xs text-[#94A3B8]">Copy P&L</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
