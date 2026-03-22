"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { PRESET_STRATEGIES } from "./preset-data";
import type { PresetStrategy } from "./strategy-types";

interface StrategyLibraryProps {
  onUseStrategy: (id: string) => void;
}

export function StrategyLibrary({ onUseStrategy }: StrategyLibraryProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#F8FAFC]">Strategy Library</h2>
        <span className="text-xs text-[#94A3B8]">
          {PRESET_STRATEGIES.length} presets available
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRESET_STRATEGIES.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            onUse={() => onUseStrategy(strategy.id)}
          />
        ))}
        <CustomStrategyCard />
      </div>
    </div>
  );
}

function StrategyCard({
  strategy,
  onUse,
}: {
  strategy: PresetStrategy;
  onUse: () => void;
}) {
  const winRateColor =
    strategy.winRate >= 60
      ? "text-[#10B981]"
      : strategy.winRate >= 55
        ? "text-[#F59E0B]"
        : "text-[#E2E8F0]";

  return (
    <div className="group rounded-xl border border-[#1E293B] bg-[#0F1629] p-5 transition-all duration-200 hover:border-[#00E5FF]/30">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">{strategy.name}</h3>
        <span className="rounded-md bg-[#1A2340] px-2 py-0.5 text-[10px] font-medium text-[#94A3B8]">
          {strategy.category}
        </span>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-[#94A3B8]">
        {strategy.description}
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {strategy.indicators.map((ind) => (
          <span
            key={ind}
            className="rounded-full bg-[#00E5FF]/10 px-2 py-0.5 text-[10px] font-medium text-[#00E5FF]"
          >
            {ind}
          </span>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-1">
        <span className="text-xs text-[#94A3B8]">Historical Win Rate:</span>
        <span className={cn("font-mono text-sm font-bold", winRateColor)}>
          {strategy.winRate}%
        </span>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/strategies/backtest?strategy=${strategy.id}`}
          className="flex-1 rounded-lg border border-[#1E293B] py-2 text-center text-xs font-medium text-[#E2E8F0] transition-all duration-200 hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6]"
        >
          Backtest
        </Link>
        <button
          type="button"
          onClick={onUse}
          className="flex-1 rounded-lg bg-[#00E5FF]/10 py-2 text-xs font-medium text-[#00E5FF] transition-all duration-200 hover:bg-[#00E5FF]/20"
        >
          Use in Bot
        </button>
      </div>
    </div>
  );
}

function CustomStrategyCard() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E293B] bg-[#0F1629]/50 p-5 transition-all duration-200 hover:border-[#00E5FF]/30">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#00E5FF]/10">
        <svg
          className="h-6 w-6 text-[#00E5FF]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <h3 className="mb-1 text-sm font-semibold text-[#F8FAFC]">Build Custom</h3>
      <p className="mb-4 text-center text-xs text-[#94A3B8]">
        Create a strategy from scratch using the condition builder below
      </p>
      <a
        href="#builder"
        className="rounded-lg bg-[#00E5FF]/10 px-4 py-2 text-xs font-medium text-[#00E5FF] transition-all duration-200 hover:bg-[#00E5FF]/20"
      >
        Build Custom
      </a>
    </div>
  );
}
