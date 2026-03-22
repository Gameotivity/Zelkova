"use client";

import { cn } from "@/lib/utils/cn";
import type { BotConfig } from "./bot-data";

interface StepDeployProps {
  config: BotConfig;
  agentName: string;
  selectedPairs: string[];
  templateName: string | null;
  mode: "PAPER" | "LIVE";
  onModeChange: (mode: "PAPER" | "LIVE") => void;
}

export function StepDeploy({
  config,
  agentName,
  selectedPairs,
  templateName,
  mode,
  onModeChange,
}: StepDeployProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">Review & Deploy</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">Final check before your bot goes live</p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onModeChange("PAPER")}
          className={cn(
            "rounded-xl border p-5 text-center transition-all duration-200",
            mode === "PAPER"
              ? "border-[#F59E0B]/50 bg-[#F59E0B]/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
              : "border-[#1E293B] bg-[#0F1629] hover:border-[#94A3B8]/30"
          )}
        >
          <div className="text-2xl">&#128196;</div>
          <p className="mt-2 text-sm font-bold text-[#F8FAFC]">Paper Trading</p>
          <p className="mt-1 text-[10px] text-[#94A3B8]">Simulated trades, no real money. Perfect for testing.</p>
        </button>

        <button
          onClick={() => onModeChange("LIVE")}
          className={cn(
            "rounded-xl border p-5 text-center transition-all duration-200",
            mode === "LIVE"
              ? "border-[#10B981]/50 bg-[#10B981]/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              : "border-[#1E293B] bg-[#0F1629] hover:border-[#94A3B8]/30"
          )}
        >
          <div className="text-2xl">&#9889;</div>
          <p className="mt-2 text-sm font-bold text-[#F8FAFC]">Live Trading</p>
          <p className="mt-1 text-[10px] text-[#94A3B8]">Real trades on Hyperliquid. Requires wallet + builder fee approval.</p>
        </button>
      </div>

      {mode === "LIVE" && (
        <div className="rounded-lg border border-[#F43F5E]/30 bg-[#F43F5E]/5 p-4">
          <p className="text-xs font-medium text-[#F43F5E]">
            Live trading uses real funds on Hyperliquid DEX. Wallet connection and builder fee approval are required. Ensure your stop-loss is configured.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">Bot Summary</h3>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <SummaryRow label="Name" value={agentName || "Unnamed Bot"} />
          {templateName && <SummaryRow label="Template" value={templateName} />}
          <SummaryRow label="Exchange" value="Hyperliquid DEX" />
          <SummaryRow label="Mode" value={mode === "PAPER" ? "Paper Trading" : "Live Trading"} />
          <SummaryRow label="Capital" value={`$${config.capitalAllocation.toLocaleString()}`} />
          <SummaryRow label="Stop Loss" value={`${config.stopLossPct}%`} highlight="danger" />
          <SummaryRow label="Take Profit" value={`${config.takeProfitPct}%`} highlight="success" />
          <SummaryRow label="Max Position" value={`${config.maxPositionSizePct}%`} />
          <SummaryRow label="Max Daily Loss" value={`${config.maxDailyLossPct}%`} highlight="danger" />
          <SummaryRow label="Trailing Stop" value={config.trailingStop ? "Enabled" : "Disabled"} />
          <SummaryRow label="Cooldown" value={`${config.cooldownMinutes} min`} />
        </div>

        <div className="border-t border-[#1E293B] pt-3">
          <p className="text-xs text-[#94A3B8]">Trading Pairs</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedPairs.map((pair) => (
              <span key={pair} className="rounded bg-[#00E5FF]/10 px-2 py-0.5 text-xs font-medium text-[#00E5FF]">
                {pair}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-[#1E293B] pt-3">
          <p className="text-xs text-[#94A3B8]">Strategies</p>
          <div className="mt-2 space-y-2">
            {config.strategies.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="rounded bg-[#8B5CF6]/10 px-2 py-0.5 text-xs font-medium text-[#8B5CF6]">
                  {s.name}
                </span>
                <span className="text-xs text-[#94A3B8]">{s.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety checklist */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#F8FAFC]">Safety Checklist</h3>
        <div className="space-y-2">
          <CheckItem checked label="Stop-loss configured" />
          <CheckItem checked label="Maximum daily loss limit set" />
          <CheckItem checked label="Position size limited" />
          <CheckItem checked={config.trailingStop} label="Trailing stop-loss enabled" optional />
          <CheckItem checked={mode === "PAPER"} label="Starting with paper trading" optional />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: "success" | "danger" }) {
  const colorMap = { success: "text-[#10B981]", danger: "text-[#F43F5E]" };
  return (
    <div className="flex justify-between">
      <span className="text-xs text-[#94A3B8]">{label}</span>
      <span className={cn("text-xs font-medium capitalize", highlight ? colorMap[highlight] : "text-[#E2E8F0]")}>
        {value}
      </span>
    </div>
  );
}

function CheckItem({ checked, label, optional }: { checked: boolean; label: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded",
          checked ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#1A2340] text-[#94A3B8]"
        )}
      >
        {checked ? (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        )}
      </div>
      <span className={cn("text-xs", checked ? "text-[#E2E8F0]" : "text-[#94A3B8]")}>
        {label}
        {optional && <span className="ml-1 text-[#94A3B8]">(recommended)</span>}
      </span>
    </div>
  );
}
