"use client";

import Link from "next/link";
import { BotCard } from "@/components/agents/bot-card";
import { ActiveBots } from "@/components/agents/active-bots";
import { PREBUILT_BOTS } from "@/components/agents/bot-data";

export default function AgentsPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1E293B] bg-[#0F1629]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF]/5 via-[#8B5CF6]/5 to-transparent" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#00E5FF]/5 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-[#8B5CF6]/5 blur-3xl" />

        <div className="relative px-8 py-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">Bot Marketplace</h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#94A3B8]">
                Deploy battle-tested trading bots in seconds, or build your own custom strategy.
                Each bot is powered by AI-optimized parameters and real-time risk management.
              </p>
            </div>
            <Link
              href="/agents/new"
              className="flex items-center gap-2 rounded-lg bg-[#00E5FF] px-5 py-2.5 text-sm font-semibold text-[#06080E] transition-all duration-200 hover:bg-[#00E5FF]/90 hover:shadow-[0_0_20px_rgba(0,229,255,0.3)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Bot
            </Link>
          </div>

          {/* Quick stats */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <QuickStat label="Active Bots" value="2,480" sublabel="across all users" />
            <QuickStat label="Total Volume" value="$14.2M" sublabel="last 30 days" />
            <QuickStat label="Avg. Win Rate" value="68.4%" sublabel="all strategies" />
          </div>
        </div>
      </div>

      {/* Featured Bots */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#F8FAFC]">Featured Bots</h2>
            <p className="mt-0.5 text-sm text-[#94A3B8]">
              Pre-built strategies, ready to deploy
            </p>
          </div>
          <span className="rounded-full bg-[#10B981]/10 px-3 py-1 text-xs font-medium text-[#10B981]">
            AI Optimized
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PREBUILT_BOTS.map((bot) => (
            <BotCard key={bot.id} bot={bot} featured />
          ))}
        </div>
      </section>

      {/* Build Your Own */}
      <section>
        <Link
          href="/agents/new?template=custom"
          className="group flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#0F1629] p-6 transition-all duration-200 hover:border-[#8B5CF6]/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
              <svg className="h-6 w-6 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F8FAFC]">Build Your Own Bot</h3>
              <p className="text-sm text-[#94A3B8]">
                Full control over strategies, risk parameters, and trading pairs
              </p>
            </div>
          </div>
          <svg
            className="h-5 w-5 text-[#94A3B8] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#8B5CF6]"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </section>

      {/* Active Bots */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-[#F8FAFC]">Your Active Bots</h2>
          <p className="mt-0.5 text-sm text-[#94A3B8]">Live P&L and status</p>
        </div>
        <ActiveBots />
      </section>
    </div>
  );
}

function QuickStat({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-lg bg-[#1A2340]/40 p-4 backdrop-blur-sm">
      <p className="text-xs text-[#94A3B8]">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-[#F8FAFC]">{value}</p>
      <p className="mt-0.5 text-[10px] text-[#94A3B8]">{sublabel}</p>
    </div>
  );
}
