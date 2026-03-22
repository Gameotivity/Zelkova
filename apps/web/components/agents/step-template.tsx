"use client";

import { cn } from "@/lib/utils/cn";
import { PREBUILT_BOTS, type PrebuiltBot } from "./bot-data";
import { BotIcon } from "./bot-icon";

interface StepTemplateProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function StepTemplate({ selected, onSelect }: StepTemplateProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">Choose Your Starting Point</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Pick a battle-tested template or start from scratch
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PREBUILT_BOTS.map((bot) => (
          <TemplateCard key={bot.id} bot={bot} isSelected={selected === bot.id} onSelect={() => onSelect(bot.id)} />
        ))}
      </div>

      <div className="relative flex items-center gap-4 py-2">
        <div className="flex-1 border-t border-[#1E293B]" />
        <span className="text-xs font-medium text-[#94A3B8]">OR</span>
        <div className="flex-1 border-t border-[#1E293B]" />
      </div>

      <button
        onClick={() => onSelect("custom")}
        className={cn(
          "w-full rounded-xl border p-6 text-left transition-all duration-200",
          selected === "custom"
            ? "border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-[0_0_20px_rgba(139,92,246,0.1)]"
            : "border-[#1E293B] bg-[#0F1629] hover:border-[#8B5CF6]/40"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1A2340]">
            <svg className="h-5 w-5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Custom Strategy</h3>
            <p className="text-xs text-[#94A3B8]">Full control over every parameter. For experienced traders.</p>
          </div>
        </div>
      </button>
    </div>
  );
}

function TemplateCard({ bot, isSelected, onSelect }: { bot: PrebuiltBot; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-200",
        isSelected
          ? "border-[#00E5FF] bg-[#00E5FF]/5 shadow-[0_0_20px_rgba(0,229,255,0.1)]"
          : "border-[#1E293B] bg-[#0F1629] hover:border-[#00E5FF]/40"
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40", bot.gradient)} />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A2340]", bot.borderColor)}>
            <BotIcon icon={bot.icon} />
          </div>
          <div>
            <h3 className="font-bold text-[#F8FAFC]">{bot.name}</h3>
            <p className="text-[10px] text-[#94A3B8]">{bot.riskLabel}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[#94A3B8]">Return</span>
            <span className="font-mono font-bold text-[#10B981]">{bot.monthlyReturnRange}/mo</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#94A3B8]">Win Rate</span>
            <span className="font-mono font-medium text-[#E2E8F0]">{bot.winRate}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#94A3B8]">Stop Loss</span>
            <span className="font-mono font-medium text-[#F43F5E]">-{bot.stopLossPct}%</span>
          </div>
        </div>

        {isSelected && (
          <div className="mt-3 flex items-center justify-center gap-1 text-xs font-medium text-[#00E5FF]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Selected
          </div>
        )}
      </div>
    </button>
  );
}
