"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Template = "alpha-hunter" | "steady-grinder" | "safe-harbor";

const TEMPLATES: {
  id: Template;
  name: string;
  risk: string;
  pairs: string;
  desc: string;
  color: string;
}[] = [
  {
    id: "alpha-hunter",
    name: "Alpha Hunter",
    risk: "High",
    pairs: "BTC · ETH · SOL",
    desc: "RSI + EMA crossover, aggressive momentum plays",
    color: "#F43F5E",
  },
  {
    id: "steady-grinder",
    name: "Steady Grinder",
    risk: "Medium",
    pairs: "BTC · ETH",
    desc: "EMA + DCA, consistent returns with lower risk",
    color: "#F59E0B",
  },
  {
    id: "safe-harbor",
    name: "Safe Harbor",
    risk: "Low",
    pairs: "BTC",
    desc: "DCA + Grid bot, conservative capital preservation",
    color: "#10B981",
  },
];

interface DemoResult {
  ok: boolean;
  agent?: { id: string; name: string; status: string };
  stats?: { totalTrades: number; totalPnl: number; winRate: number };
  error?: string;
}

export function LaunchDemoBot() {
  const router = useRouter();
  const [loading, setLoading] = useState<Template | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function launch(template: Template) {
    setLoading(template);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/agents/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });

      const data: DemoResult = await res.json();

      if (!res.ok || !data.ok) {
        setError(
          data.error || (res.status === 401 ? "Connect your wallet first" : "Failed to create demo bot")
        );
        return;
      }

      setResult(data);

      // Navigate to agent detail after 2s
      if (data.agent?.id) {
        setTimeout(() => router.push(`/agents/${data.agent!.id}`), 2000);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00E5FF]/10">
          <svg className="h-5 w-5 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#F8FAFC]">Launch Demo Bot</h3>
          <p className="text-xs text-[#94A3B8]">
            Paper trade with real market data — no risk
          </p>
        </div>
      </div>

      {/* Success state */}
      {result?.ok && (
        <div className="mb-4 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-[#10B981]">
              {result.agent?.name} deployed!
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-[#94A3B8]">Trades</p>
              <p className="font-mono text-sm font-bold text-[#F8FAFC]">
                {result.stats?.totalTrades}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#94A3B8]">P&L</p>
              <p className={`font-mono text-sm font-bold ${(result.stats?.totalPnl ?? 0) >= 0 ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
                ${result.stats?.totalPnl?.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#94A3B8]">Win Rate</p>
              <p className="font-mono text-sm font-bold text-[#F8FAFC]">
                {result.stats?.winRate}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#94A3B8]">
            Redirecting to agent detail...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-lg border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3">
          <p className="text-xs text-[#F43F5E]">{error}</p>
        </div>
      )}

      {/* Template buttons */}
      <div className="space-y-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => launch(t.id)}
            disabled={loading !== null}
            className="group flex w-full items-center justify-between rounded-lg border border-[#1E293B] bg-[#1A2340]/50 p-3 text-left transition-all duration-200 hover:border-[#00E5FF]/30 hover:bg-[#1A2340] disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              <div>
                <p className="text-xs font-semibold text-[#F8FAFC]">{t.name}</p>
                <p className="text-[10px] text-[#94A3B8]">
                  {t.pairs} · {t.risk} risk
                </p>
              </div>
            </div>
            {loading === t.id ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
            ) : (
              <svg
                className="h-4 w-4 text-[#94A3B8] transition-all group-hover:text-[#00E5FF]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
