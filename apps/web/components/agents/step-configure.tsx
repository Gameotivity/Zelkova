"use client";

import { cn } from "@/lib/utils/cn";
import { InfoTooltip } from "./builder-steps";
import type { StrategyParam, BotConfig } from "./bot-data";
import { TRADING_PAIRS } from "./bot-data";

interface StepConfigureProps {
  isTemplate: boolean;
  config: BotConfig;
  onConfigChange: (config: BotConfig) => void;
  agentName: string;
  onNameChange: (name: string) => void;
  exchange: "binance" | "bybit";
  onExchangeChange: (ex: "binance" | "bybit") => void;
  selectedPairs: string[];
  onTogglePair: (pair: string) => void;
}

export function StepConfigure({
  isTemplate,
  config,
  onConfigChange,
  agentName,
  onNameChange,
  exchange,
  onExchangeChange,
  selectedPairs,
  onTogglePair,
}: StepConfigureProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">Configure Your Bot</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">
          {isTemplate ? "Pre-filled with optimized values. Adjust as needed." : "Set up your custom strategy from scratch."}
        </p>
      </div>

      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-6 space-y-5">
        <div>
          <label className="mb-1.5 flex items-center text-sm font-medium text-[#E2E8F0]">
            Bot Name
            <InfoTooltip text="Give your bot a memorable name. This appears in your dashboard." />
          </label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., My BTC Alpha Hunter"
            className="w-full rounded-lg border border-[#1E293B] bg-[#06080E] px-4 py-2.5 text-[#E2E8F0] outline-none transition-all duration-200 placeholder:text-[#94A3B8]/50 focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center text-sm font-medium text-[#E2E8F0]">
            Exchange
            <InfoTooltip text="Choose which exchange to trade on. Requires API keys in Settings." />
          </label>
          <div className="flex gap-3">
            {(["binance", "bybit"] as const).map((ex) => (
              <button
                key={ex}
                onClick={() => onExchangeChange(ex)}
                className={cn(
                  "rounded-lg border px-6 py-2.5 text-sm font-medium capitalize transition-all duration-200",
                  exchange === ex
                    ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]"
                    : "border-[#1E293B] text-[#94A3B8] hover:border-[#00E5FF]/40"
                )}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-center text-sm font-medium text-[#E2E8F0]">
            Trading Pairs
            <InfoTooltip text="Select which pairs this bot will trade. More pairs = more opportunities but more risk." />
          </label>
          <div className="flex flex-wrap gap-2">
            {TRADING_PAIRS.map((pair) => (
              <button
                key={pair}
                onClick={() => onTogglePair(pair)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  selectedPairs.includes(pair)
                    ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]"
                    : "border-[#1E293B] text-[#94A3B8] hover:border-[#00E5FF]/40"
                )}
              >
                {pair}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isTemplate && config.strategies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#F8FAFC]">Strategy Parameters</h3>
          {config.strategies.map((strat) => (
            <StrategyCard key={strat.id} strategy={strat} />
          ))}
        </div>
      )}
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: StrategyParam }) {
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-[#F8FAFC]">{strategy.name}</h4>
          <p className="text-xs text-[#94A3B8]">{strategy.description}</p>
        </div>
        <span className="rounded bg-[#8B5CF6]/10 px-2 py-0.5 text-[10px] font-medium text-[#8B5CF6]">AI Optimized</span>
      </div>

      <div className="mt-3 rounded-lg bg-[#00E5FF]/5 border border-[#00E5FF]/10 p-3">
        <p className="text-xs text-[#00E5FF]/90">
          <span className="font-semibold">AI Insight:</span> {strategy.aiExplanation}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(strategy.params).map(([key, val]) => (
          <div key={key} className="rounded-lg bg-[#1A2340]/60 p-2.5">
            <p className="text-[10px] text-[#94A3B8]">
              {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
            </p>
            <p className="mt-0.5 font-mono text-sm font-medium text-[#E2E8F0]">{String(val)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
