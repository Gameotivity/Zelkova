"use client";

import { useState } from "react";
import type { HyperAlphaResult } from "@/lib/ai/types";

interface StrategyResultCardProps {
  result: HyperAlphaResult;
  onExecute: () => void;
  onCreateAgent: () => void;
}

function ActionBadge({ action }: { action: HyperAlphaResult["action"] }) {
  const config: Record<string, { label: string; color: string; glow: string }> = {
    long: { label: "LONG", color: "#10B981", glow: "shadow-[0_0_12px_rgba(16,185,129,0.4)]" },
    short: { label: "SHORT", color: "#F43F5E", glow: "shadow-[0_0_12px_rgba(244,63,94,0.4)]" },
    hold: { label: "HOLD", color: "#94A3B8", glow: "" },
    close: { label: "CLOSE", color: "#F59E0B", glow: "shadow-[0_0_12px_rgba(245,158,11,0.4)]" },
  };
  const { label, color, glow } = config[action] ?? config.hold;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-3 py-1 font-mono text-xs font-bold uppercase ${glow}`}
      style={{ borderColor: color, color }}
    >
      {label}
    </span>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-[#06080E] px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{label}</span>
      <span className="font-mono text-sm text-[#F8FAFC]">{value}</span>
    </div>
  );
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const hue = (1 - score) * 120; // 0 = red, 120 = green
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Risk Score</span>
        <span className="font-mono text-xs" style={{ color: `hsl(${hue},70%,50%)` }}>
          {score.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1A2340]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #F43F5E, #F59E0B, #10B981)`,
          }}
        />
      </div>
    </div>
  );
}

export default function StrategyResultCard({
  result,
  onExecute,
  onCreateAgent,
}: StrategyResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <div className="w-full rounded-xl border border-[#1E293B] bg-[#0F1629] transition-all duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#1E293B] px-5 py-4">
        <ActionBadge action={result.action} />
        <span className="font-mono text-lg font-bold text-[#F8FAFC]">{result.ticker}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-sm text-[#00E5FF]">{confidencePct}%</span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#1A2340]">
            <div
              className="h-full rounded-full bg-[#00E5FF] transition-all duration-500"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCell label="Entry" value={result.entry_price != null ? `$${result.entry_price.toLocaleString()}` : "--"} />
        <MetricCell label="Stop Loss" value={result.stop_loss != null ? `$${result.stop_loss.toLocaleString()}` : "--"} />
        <MetricCell label="Take Profit" value={result.take_profit != null ? `$${result.take_profit.toLocaleString()}` : "--"} />
        <MetricCell label="Size USD" value={result.size_usd != null ? `$${result.size_usd.toLocaleString()}` : "--"} />
        <MetricCell label="Leverage" value={result.leverage != null ? `${result.leverage}x` : "--"} />
        <MetricCell label="Signals" value={`${result.signal_alignment}/4`} />
      </div>

      {/* Risk + Approval */}
      <div className="flex flex-col gap-3 border-t border-[#1E293B] px-5 py-4">
        <RiskBar score={result.risk_score} />
        <div className="flex items-center gap-2">
          {result.approved ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#10B981" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-medium text-[#10B981] drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                Approved
              </span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#F43F5E" strokeWidth="1.5" />
                <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#F43F5E" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-medium text-[#F43F5E] drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]">
                Rejected
              </span>
            </>
          )}
        </div>

        {result.errors.length > 0 && (
          <div className="rounded-lg border border-[#F43F5E]/30 bg-[#F43F5E]/5 px-3 py-2">
            {result.errors.map((err, i) => (
              <p key={i} className="text-xs text-[#F43F5E]">{err}</p>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 border-t border-[#1E293B] px-5 py-4">
        <button
          type="button"
          onClick={onExecute}
          disabled={!result.approved}
          className="flex items-center gap-2 rounded-lg bg-[#00E5FF] px-4 py-2.5 text-sm font-semibold text-[#06080E] transition-all duration-200 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M9 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Execute Trade
        </button>
        <button
          type="button"
          onClick={onCreateAgent}
          className="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[0_0_16px_rgba(139,92,246,0.3)]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="3" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="5.5" cy="7" r="1" fill="currentColor" />
            <circle cx="8.5" cy="7" r="1" fill="currentColor" />
          </svg>
          Create Agent
        </button>
      </div>

      {/* Expandable report */}
      <div className="border-t border-[#1E293B]">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between px-5 py-3 text-xs text-[#94A3B8] transition-all duration-200 hover:text-[#E2E8F0]"
        >
          <span>Full Analysis Report</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {expanded && (
          <div className="max-h-80 overflow-y-auto px-5 pb-4">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#E2E8F0]">
              {result.report}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
