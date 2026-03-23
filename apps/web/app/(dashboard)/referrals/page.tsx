"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface ReferralData {
  code: string;
  summary: {
    count: number;
    commission: number;
    tier: string;
    nextTierThreshold: number;
    progressToNextTier: number;
    nextTierName: string;
  };
  referrals: Array<{ status: string; commission: number; joinedAt: string }>;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/referral");
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopy = () => {
    if (data?.code) {
      navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareUrl = `https://zelkora.ai?ref=${data?.code || ""}`;

  const s = data?.summary ?? { count: 0, commission: 0, tier: "FREE", nextTierThreshold: 3, progressToNextTier: 0, nextTierName: "Pro" };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Referrals</h1>
        <p className="text-sm text-[#94A3B8]">Invite friends and earn 20% of their performance fees. Forever.</p>
      </div>

      {/* Referral Code Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[#00E5FF]/20 bg-gradient-to-br from-[#0F1629] to-[#0A1020] p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#00E5FF]/[0.05] blur-[80px]" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-[#00E5FF]">Your Referral Code</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-xl bg-[#06080E] px-6 py-3 font-mono text-2xl font-black tracking-widest text-[#F8FAFC]">
              {data?.code || "ZELK-XXXX"}
            </span>
            <button onClick={handleCopy}
              className="rounded-xl bg-[#00E5FF]/10 px-5 py-3 text-sm font-bold text-[#00E5FF] transition-all hover:bg-[#00E5FF]/20">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="mt-4 flex gap-3">
            <a href={`https://twitter.com/intent/tweet?text=Join%20me%20on%20Zelkora%20%E2%80%94%20AI%20trading%20on%20Hyperliquid.%20Use%20my%20code%3A%20${data?.code || ""}&url=https://zelkora.ai`}
              target="_blank" rel="noopener noreferrer"
              className="rounded-lg bg-[#1A2340] px-4 py-2 text-xs font-medium text-[#94A3B8] transition-all hover:bg-[#1E293B] hover:text-white">
              Share on Twitter
            </a>
            <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="rounded-lg bg-[#1A2340] px-4 py-2 text-xs font-medium text-[#94A3B8] transition-all hover:bg-[#1E293B] hover:text-white">
              Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
          <p className="text-[10px] text-[#475569]">Total Referrals</p>
          <p className="mt-1 font-mono text-2xl font-black text-[#F8FAFC]">{s.count}</p>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
          <p className="text-[10px] text-[#475569]">Commission Earned</p>
          <p className="mt-1 font-mono text-2xl font-black text-[#10B981]">${s.commission.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
          <p className="text-[10px] text-[#475569]">Commission Rate</p>
          <p className="mt-1 font-mono text-2xl font-black text-[#00E5FF]">20%</p>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
          <p className="text-[10px] text-[#475569]">Your Tier</p>
          <p className="mt-1 font-mono text-2xl font-black text-[#8B5CF6]">{s.tier}</p>
        </div>
      </div>

      {/* Tier Progress */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#F8FAFC]">Tier Upgrade Progress</p>
            <p className="text-xs text-[#94A3B8]">
              {s.nextTierThreshold > 0
                ? `${s.count}/${s.nextTierThreshold} referrals to unlock ${s.nextTierName}`
                : "Maximum tier reached!"
              }
            </p>
          </div>
          <span className="rounded-full bg-[#8B5CF6]/10 px-3 py-1 text-xs font-bold text-[#8B5CF6]">{s.nextTierName}</span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#1A2340]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#8B5CF6] transition-all duration-500"
            style={{ width: `${s.progressToNextTier}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[#475569]">
          <span>3 refs = Pro (free)</span>
          <span>10 refs = Elite (free)</span>
        </div>
      </div>

      {/* How It Works */}
      <div className="rounded-xl border border-[#10B981]/10 bg-[#10B981]/[0.03] p-6">
        <h3 className="text-sm font-bold text-[#F8FAFC]">How Referral Earnings Work</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981]/10 text-sm font-black text-[#10B981]">1</div>
            <p className="mt-2 text-xs font-semibold text-[#E2E8F0]">Share Your Code</p>
            <p className="mt-1 text-[10px] text-[#94A3B8]">Friend signs up with your referral code</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E5FF]/10 text-sm font-black text-[#00E5FF]">2</div>
            <p className="mt-2 text-xs font-semibold text-[#E2E8F0]">They Trade</p>
            <p className="mt-1 text-[10px] text-[#94A3B8]">AI generates profits for them</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/10 text-sm font-black text-[#8B5CF6]">3</div>
            <p className="mt-2 text-xs font-semibold text-[#E2E8F0]">You Earn 20%</p>
            <p className="mt-1 text-[10px] text-[#94A3B8]">Of their performance fees, forever</p>
          </div>
        </div>
      </div>

      {/* Referral List */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629]">
        <div className="border-b border-[#1E293B] px-6 py-4">
          <h3 className="text-sm font-bold text-[#F8FAFC]">Your Referrals</h3>
        </div>
        {(data?.referrals ?? []).length === 0 ? (
          <div className="p-12 text-center text-sm text-[#94A3B8]">
            No referrals yet. Share your code to start earning!
          </div>
        ) : (
          <div className="divide-y divide-[#1E293B]">
            {(data?.referrals ?? []).map((ref, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF]/20 to-[#8B5CF6]/20 text-xs font-bold text-[#00E5FF]">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm text-[#E2E8F0]">Referred Trader #{i + 1}</p>
                    <p className="text-[10px] text-[#475569]">Joined {timeAgo(ref.joinedAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("font-mono text-sm font-bold", ref.commission > 0 ? "text-[#10B981]" : "text-[#94A3B8]")}>
                    ${ref.commission.toFixed(2)}
                  </p>
                  <span className={cn("text-[10px]", ref.status === "active" ? "text-[#10B981]" : "text-[#475569]")}>
                    {ref.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
