"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StrategyLibrary } from "@/components/strategy/strategy-library";
import { ConditionBuilder } from "@/components/strategy/condition-builder";
import { RiskParamsForm } from "@/components/strategy/risk-params-form";
import { getDefaultParams } from "@/components/strategy/indicator-data";
import type { ConditionGroup, RiskParams, StrategyConfig } from "@/components/strategy/strategy-types";

function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeDefaultGroup(): ConditionGroup {
  return {
    id: createId(),
    logic: "AND",
    conditions: [
      {
        id: createId(),
        indicatorId: "rsi",
        indicatorParams: getDefaultParams("rsi"),
        operator: "<",
        compareType: "value",
        compareValue: 30,
        compareIndicatorId: "sma",
        compareIndicatorParams: getDefaultParams("sma"),
      },
    ],
    groups: [],
  };
}

const DEFAULT_RISK: RiskParams = {
  stopLossPct: 3,
  takeProfitPct: 6,
  trailingStop: false,
  trailingStopPct: 2,
};

export default function StrategiesPage() {
  const router = useRouter();
  const [strategyName, setStrategyName] = useState("");
  const [entryConditions, setEntryConditions] = useState<ConditionGroup>(makeDefaultGroup);
  const [exitConditions, setExitConditions] = useState<ConditionGroup>(makeDefaultGroup);
  const [risk, setRisk] = useState<RiskParams>(DEFAULT_RISK);

  const handleUseStrategy = useCallback(
    (id: string) => {
      router.push(`/agents/new?template=${id}`);
    },
    [router]
  );

  const handleBacktest = useCallback(() => {
    const config: StrategyConfig = {
      name: strategyName || "Custom Strategy",
      entryConditions,
      exitConditions,
      risk,
    };
    const encoded = encodeURIComponent(JSON.stringify(config));
    router.push(`/strategies/backtest?config=${encoded}`);
  }, [strategyName, entryConditions, exitConditions, risk, router]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#0F1629] p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00E5FF]/5 to-[#8B5CF6]/5" />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
            Strategy Builder
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Choose a preset or build a custom trading strategy from scratch
          </p>
        </div>
      </div>

      {/* Section A: Strategy Library */}
      <StrategyLibrary onUseStrategy={handleUseStrategy} />

      {/* Section B: Strategy Builder */}
      <div id="builder" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#1E293B]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8]">
            Custom Builder
          </span>
          <div className="h-px flex-1 bg-[#1E293B]" />
        </div>

        {/* Strategy Name */}
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
          <label className="mb-1.5 block text-xs text-[#94A3B8]">Strategy Name</label>
          <input
            type="text"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            placeholder="e.g., My RSI + MACD Strategy"
            className="w-full rounded-lg border border-[#1E293B] bg-[#1A2340] px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 transition-all duration-200 focus:border-[#00E5FF] focus:outline-none"
          />
        </div>

        {/* Entry Conditions */}
        <ConditionBuilder
          label="Entry Conditions"
          group={entryConditions}
          onChange={setEntryConditions}
        />

        {/* Exit Conditions */}
        <ConditionBuilder
          label="Exit Conditions"
          group={exitConditions}
          onChange={setExitConditions}
        />

        {/* Risk Parameters */}
        <RiskParamsForm risk={risk} onChange={setRisk} />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBacktest}
            className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#8B5CF6]/90"
          >
            Run Backtest
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/agents/new?template=custom&strategy=${encodeURIComponent(
                  JSON.stringify({ name: strategyName, entryConditions, exitConditions, risk })
                )}`
              )
            }
            className="rounded-lg border border-[#00E5FF]/30 px-6 py-2.5 text-sm font-semibold text-[#00E5FF] transition-all duration-200 hover:bg-[#00E5FF]/10"
          >
            Deploy as Bot
          </button>
        </div>
      </div>
    </div>
  );
}
