"use client";

import { cn } from "@/lib/utils/cn";
import { InfoTooltip } from "./builder-steps";
import type { BotConfig } from "./bot-data";

interface StepRiskProps {
  config: BotConfig;
  onConfigChange: (config: BotConfig) => void;
}

type RiskPreset = "conservative" | "balanced" | "aggressive";

const RISK_PRESETS: Record<RiskPreset, { stopLoss: number; takeProfit: number; maxPos: number; maxDaily: number; label: string; color: string }> = {
  conservative: { stopLoss: 3, takeProfit: 4, maxPos: 10, maxDaily: 2, label: "Conservative", color: "#10B981" },
  balanced: { stopLoss: 5, takeProfit: 8, maxPos: 15, maxDaily: 3, label: "Balanced", color: "#F59E0B" },
  aggressive: { stopLoss: 8, takeProfit: 15, maxPos: 25, maxDaily: 5, label: "Aggressive", color: "#F43F5E" },
};

export function StepRisk({ config, onConfigChange }: StepRiskProps) {
  function applyPreset(preset: RiskPreset) {
    const p = RISK_PRESETS[preset];
    onConfigChange({
      ...config,
      stopLossPct: p.stopLoss,
      takeProfitPct: p.takeProfit,
      maxPositionSizePct: p.maxPos,
      maxDailyLossPct: p.maxDaily,
    });
  }

  function updateField(field: keyof BotConfig, value: number | boolean) {
    onConfigChange({ ...config, [field]: value });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">Risk & Capital</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">Set your risk tolerance and capital allocation</p>
      </div>

      {/* Capital slider */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-6">
        <label className="flex items-center text-sm font-medium text-[#E2E8F0]">
          Capital Allocation
          <InfoTooltip text="Total capital this bot can use. Start small and increase once you trust its performance." />
        </label>
        <div className="mt-4 flex items-center gap-4">
          <input
            type="range"
            min={100}
            max={50000}
            step={100}
            value={config.capitalAllocation}
            onChange={(e) => updateField("capitalAllocation", Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[#1A2340] accent-[#00E5FF] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00E5FF] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,229,255,0.4)]"
          />
          <div className="min-w-[100px] rounded-lg bg-[#1A2340] px-4 py-2 text-center">
            <span className="font-mono text-lg font-bold text-[#F8FAFC]">${config.capitalAllocation.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Risk preset */}
      <div>
        <label className="flex items-center text-sm font-medium text-[#E2E8F0]">
          Risk Profile
          <InfoTooltip text="Quick presets that adjust stop-loss, take-profit, and position sizing together." />
        </label>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {(Object.entries(RISK_PRESETS) as [RiskPreset, typeof RISK_PRESETS[RiskPreset]][]).map(([key, preset]) => {
            const isActive =
              config.stopLossPct === preset.stopLoss && config.takeProfitPct === preset.takeProfit;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={cn(
                  "rounded-xl border p-4 text-center transition-all duration-200",
                  isActive
                    ? `border-[${preset.color}]/50 bg-[${preset.color}]/5`
                    : "border-[#1E293B] bg-[#0F1629] hover:border-[#94A3B8]/30"
                )}
                style={isActive ? { borderColor: `${preset.color}50`, backgroundColor: `${preset.color}08` } : undefined}
              >
                <p className="text-sm font-bold" style={{ color: preset.color }}>{preset.label}</p>
                <p className="mt-1 text-[10px] text-[#94A3B8]">SL: {preset.stopLoss}% / TP: {preset.takeProfit}%</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual controls */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-6 space-y-5">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">Fine-Tune Risk Controls</h3>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SliderField
            label="Stop Loss"
            value={config.stopLossPct}
            onChange={(v) => updateField("stopLossPct", v)}
            min={1} max={20} suffix="%"
            color="#F43F5E"
            tooltip="Closes position automatically at this loss percentage. Required for safety."
          />
          <SliderField
            label="Take Profit"
            value={config.takeProfitPct}
            onChange={(v) => updateField("takeProfitPct", v)}
            min={1} max={50} suffix="%"
            color="#10B981"
            tooltip="Auto-closes position at this profit percentage."
          />
          <SliderField
            label="Max Position Size"
            value={config.maxPositionSizePct}
            onChange={(v) => updateField("maxPositionSizePct", v)}
            min={5} max={50} suffix="%"
            color="#F59E0B"
            tooltip="Maximum percentage of capital used in a single position."
          />
          <SliderField
            label="Max Daily Loss"
            value={config.maxDailyLossPct}
            onChange={(v) => updateField("maxDailyLossPct", v)}
            min={1} max={10} suffix="%"
            color="#F43F5E"
            tooltip="Bot pauses for the day if daily losses exceed this amount."
          />
        </div>

        <div className="flex items-center gap-6 pt-2">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={config.trailingStop}
              onChange={(e) => updateField("trailingStop", e.target.checked)}
              className="h-4 w-4 rounded border-[#1E293B] bg-[#06080E] accent-[#00E5FF]"
            />
            <span className="text-sm text-[#E2E8F0]">Trailing Stop-Loss</span>
            <InfoTooltip text="Stop-loss follows price upward, locking in profits as the trade moves in your favor." />
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#E2E8F0]">Cooldown:</span>
            <input
              type="number"
              min={1} max={60}
              value={config.cooldownMinutes}
              onChange={(e) => updateField("cooldownMinutes", Number(e.target.value))}
              className="w-16 rounded-lg border border-[#1E293B] bg-[#06080E] px-3 py-1.5 text-center font-mono text-sm text-[#E2E8F0] outline-none focus:border-[#00E5FF]"
            />
            <span className="text-xs text-[#94A3B8]">min</span>
          </div>
        </div>
      </div>

      {/* Risk warning */}
      <div className="rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
        <p className="text-xs text-[#F59E0B]">
          <span className="font-bold">Risk Warning:</span> Trading involves risk. Past performance does not guarantee future results. Only allocate capital you can afford to lose. All bots include mandatory stop-loss protection.
        </p>
      </div>
    </div>
  );
}

function SliderField({
  label, value, onChange, min, max, suffix, color, tooltip,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; suffix: string; color: string; tooltip: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="flex items-center text-xs font-medium text-[#E2E8F0]">
          {label}
          <InfoTooltip text={tooltip} />
        </label>
        <span className="font-mono text-sm font-bold" style={{ color }}>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#1A2340] accent-[#00E5FF] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00E5FF]"
      />
    </div>
  );
}
