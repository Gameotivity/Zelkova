"use client";

import { cn } from "@/lib/utils/cn";
import type { RiskParams } from "./strategy-types";

interface RiskParamsFormProps {
  risk: RiskParams;
  onChange: (risk: RiskParams) => void;
}

export function RiskParamsForm({ risk, onChange }: RiskParamsFormProps) {
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#F8FAFC]">Risk Parameters</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Stop Loss */}
        <div>
          <label className="mb-1.5 block text-xs text-[#94A3B8]">Stop Loss %</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.5}
              max={20}
              step={0.5}
              value={risk.stopLossPct}
              onChange={(e) => onChange({ ...risk, stopLossPct: Number(e.target.value) })}
              className="h-1.5 flex-1 appearance-none rounded-full bg-[#1A2340] accent-[#F43F5E]"
            />
            <span className="w-14 text-right font-mono text-sm font-bold text-[#F43F5E]">
              {risk.stopLossPct}%
            </span>
          </div>
        </div>

        {/* Take Profit */}
        <div>
          <label className="mb-1.5 block text-xs text-[#94A3B8]">Take Profit %</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={50}
              step={0.5}
              value={risk.takeProfitPct}
              onChange={(e) => onChange({ ...risk, takeProfitPct: Number(e.target.value) })}
              className="h-1.5 flex-1 appearance-none rounded-full bg-[#1A2340] accent-[#10B981]"
            />
            <span className="w-14 text-right font-mono text-sm font-bold text-[#10B981]">
              {risk.takeProfitPct}%
            </span>
          </div>
        </div>

        {/* Trailing Stop Toggle */}
        <div className="sm:col-span-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onChange({ ...risk, trailingStop: !risk.trailingStop })}
              className={cn(
                "relative h-6 w-11 rounded-full transition-all duration-200",
                risk.trailingStop ? "bg-[#00E5FF]" : "bg-[#1A2340]"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
                  risk.trailingStop ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
            <label className="text-xs text-[#E2E8F0]">Enable Trailing Stop</label>
          </div>

          {risk.trailingStop && (
            <div className="mt-3">
              <label className="mb-1.5 block text-xs text-[#94A3B8]">
                Trailing Stop Distance %
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.25}
                  value={risk.trailingStopPct}
                  onChange={(e) =>
                    onChange({ ...risk, trailingStopPct: Number(e.target.value) })
                  }
                  className="h-1.5 flex-1 appearance-none rounded-full bg-[#1A2340] accent-[#F59E0B]"
                />
                <span className="w-14 text-right font-mono text-sm font-bold text-[#F59E0B]">
                  {risk.trailingStopPct}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
