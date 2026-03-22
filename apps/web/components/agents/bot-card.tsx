"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { PrebuiltBot } from "./bot-data";
import { BotIcon } from "./bot-icon";

function RiskStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={cn("h-3.5 w-3.5", i < level ? "text-[#F59E0B]" : "text-[#1E293B]")}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

interface BotCardProps {
  bot: PrebuiltBot;
  featured?: boolean;
}

export function BotCard({ bot, featured }: BotCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#0F1629] transition-all duration-200 hover:border-[#00E5FF]/40 hover:shadow-[0_0_30px_rgba(0,229,255,0.06)]",
        featured && "md:col-span-1"
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", bot.gradient)} />

      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg bg-[#1A2340]", bot.borderColor)}>
              <BotIcon icon={bot.icon} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F8FAFC]">{bot.name}</h3>
              <p className="text-xs text-[#94A3B8]">{bot.tagline}</p>
            </div>
          </div>
          <span className="rounded-full bg-[#10B981]/10 px-2.5 py-0.5 text-xs font-medium text-[#10B981]">
            LIVE
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[#E2E8F0]/80">{bot.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#1A2340]/60 p-3">
            <p className="text-xs text-[#94A3B8]">Monthly Return</p>
            <p className="mt-0.5 font-mono text-lg font-bold text-[#10B981]">{bot.monthlyReturnRange}</p>
          </div>
          <div className="rounded-lg bg-[#1A2340]/60 p-3">
            <p className="text-xs text-[#94A3B8]">Win Rate</p>
            <p className="mt-0.5 font-mono text-lg font-bold text-[#F8FAFC]">{bot.winRate}%</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">Risk Level</span>
            <div className="flex items-center gap-2">
              <RiskStars level={bot.riskLevel} />
              <span className="text-xs font-medium text-[#E2E8F0]">{bot.riskLabel}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">Strategies</span>
            <div className="flex gap-1">
              {bot.strategies.map((s) => (
                <span key={s} className="rounded bg-[#8B5CF6]/10 px-2 py-0.5 text-[10px] font-medium text-[#8B5CF6]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">Active Traders</span>
            <span className="text-xs font-medium text-[#E2E8F0]">{bot.liveUsers.toLocaleString()}</span>
          </div>

          <div>
            <span className="text-xs text-[#94A3B8]">Pairs: </span>
            <span className="text-xs text-[#E2E8F0]">{bot.supportedPairs.join(", ")}</span>
          </div>
        </div>

        <Link
          href={`/agents/new?template=${bot.id}`}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#00E5FF] py-2.5 text-sm font-semibold text-[#06080E] transition-all duration-200 hover:bg-[#00E5FF]/90 hover:shadow-[0_0_20px_rgba(0,229,255,0.3)]"
        >
          Deploy This Bot
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
