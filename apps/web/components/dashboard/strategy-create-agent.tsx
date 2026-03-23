"use client";

import { useState } from "react";
import type { HyperAlphaResult } from "@/lib/ai/types";

interface StrategyCreateAgentProps {
  result: HyperAlphaResult;
  onClose: () => void;
  onSuccess: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

const SCHEDULE_OPTIONS = [
  { value: "1h", label: "Every 1 hour" },
  { value: "4h", label: "Every 4 hours" },
  { value: "8h", label: "Every 8 hours" },
  { value: "1d", label: "Every 24 hours" },
];

const MODE_OPTIONS = ["paper", "live"] as const;
type Mode = (typeof MODE_OPTIONS)[number];

export default function StrategyCreateAgent({
  result,
  onClose,
  onSuccess,
}: StrategyCreateAgentProps) {
  const [name, setName] = useState(`HyperAlpha ${result.ticker}`);
  const [schedule, setSchedule] = useState("4h");
  const [mode, setMode] = useState<Mode>("paper");
  const [stopLossPct, setStopLossPct] = useState(2);
  const [maxPositionPct, setMaxPositionPct] = useState(25);
  const [maxDailyLossPct, setMaxDailyLossPct] = useState(5);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit() {
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          pairs: [`${result.ticker}-USD`],
          strategy: "hyperalpha",
          strategyConfig: {
            ticker: result.ticker,
            interval: schedule,
          },
          riskConfig: {
            stopLossPct,
            takeProfitPct: 4,
            maxPositionSizePct: maxPositionPct,
            maxDailyLossPct,
            cooldownMinutes: 60,
            maxLeverage: 1,
          },
          mode,
          capitalUsd: result.size_usd ?? 1000,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      setStatus("success");
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#1E293B] bg-[#0F1629] shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] px-5 py-4">
          <h2 className="text-base font-semibold text-[#F8FAFC]">Create Agent</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#94A3B8] transition-all duration-200 hover:bg-[#1A2340] hover:text-[#F8FAFC]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 px-5 py-4">
          {/* Agent name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#94A3B8]">Agent Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-[#1E293B] bg-[#06080E] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition-all duration-200 focus:border-[#8B5CF6]/50 focus:ring-1 focus:ring-[#8B5CF6]/30"
            />
          </div>

          {/* Schedule */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#94A3B8]">Schedule</label>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="rounded-lg border border-[#1E293B] bg-[#06080E] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition-all duration-200 focus:border-[#8B5CF6]/50"
            >
              {SCHEDULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mode toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#94A3B8]">Mode</label>
            <div className="flex overflow-hidden rounded-lg border border-[#1E293B]">
              {MODE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    mode === m
                      ? m === "live"
                        ? "bg-[#10B981]/15 text-[#10B981]"
                        : "bg-[#8B5CF6]/15 text-[#8B5CF6]"
                      : "bg-[#06080E] text-[#94A3B8] hover:text-[#E2E8F0]"
                  }`}
                >
                  {m === "paper" ? "Paper" : "Live"}
                </button>
              ))}
            </div>
          </div>

          {/* Risk config */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#94A3B8]">Risk Configuration</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#94A3B8]">Stop Loss %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={stopLossPct}
                  onChange={(e) => setStopLossPct(Number(e.target.value))}
                  className="rounded-lg border border-[#1E293B] bg-[#06080E] px-2 py-1.5 font-mono text-sm text-[#F8FAFC] outline-none transition-all duration-200 focus:border-[#8B5CF6]/50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#94A3B8]">Max Position %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={maxPositionPct}
                  onChange={(e) => setMaxPositionPct(Number(e.target.value))}
                  className="rounded-lg border border-[#1E293B] bg-[#06080E] px-2 py-1.5 font-mono text-sm text-[#F8FAFC] outline-none transition-all duration-200 focus:border-[#8B5CF6]/50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#94A3B8]">Max Daily Loss %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={maxDailyLossPct}
                  onChange={(e) => setMaxDailyLossPct(Number(e.target.value))}
                  className="rounded-lg border border-[#1E293B] bg-[#06080E] px-2 py-1.5 font-mono text-sm text-[#F8FAFC] outline-none transition-all duration-200 focus:border-[#8B5CF6]/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status feedback */}
        {status === "success" && (
          <div className="mx-5 flex items-center gap-2 rounded-lg bg-[#10B981]/10 px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#10B981" strokeWidth="1.3" />
              <path d="M4.5 7l2 2 3-3.5" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-medium text-[#10B981]">Agent created successfully</span>
          </div>
        )}
        {status === "error" && (
          <div className="mx-5 flex items-center gap-2 rounded-lg bg-[#F43F5E]/10 px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#F43F5E" strokeWidth="1.3" />
              <path d="M5 5l4 4M9 5l-4 4" stroke="#F43F5E" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-[#F43F5E]">{errorMsg}</span>
          </div>
        )}

        {/* Submit button */}
        <div className="px-5 py-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === "loading" || status === "success" || !name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[0_0_16px_rgba(139,92,246,0.3)] disabled:opacity-40"
          >
            {status === "loading" ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
                <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" opacity="0.3" />
                <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="3" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="5.5" cy="7" r="1" fill="currentColor" />
                  <circle cx="8.5" cy="7" r="1" fill="currentColor" />
                </svg>
                Create Agent
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
