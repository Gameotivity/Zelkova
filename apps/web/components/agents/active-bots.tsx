"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface AgentRow {
  id: string;
  name: string;
  strategy: string;
  status: string;
  pairs: string[];
  createdAt: string;
}

const STATUS_MAP: Record<string, { dot: string; bg: string; label: string }> = {
  PAPER: { dot: "bg-[#F59E0B]", bg: "bg-[#F59E0B]/10 text-[#F59E0B]", label: "Paper" },
  LIVE: { dot: "bg-[#10B981] animate-ping-slow", bg: "bg-[#10B981]/10 text-[#10B981]", label: "Live" },
  PAUSED: { dot: "bg-[#94A3B8]", bg: "bg-[#94A3B8]/10 text-[#94A3B8]", label: "Paused" },
  STOPPED: { dot: "bg-[#F43F5E]", bg: "bg-[#F43F5E]/10 text-[#F43F5E]", label: "Stopped" },
  DRAFT: { dot: "bg-[#94A3B8]", bg: "bg-[#94A3B8]/10 text-[#94A3B8]", label: "Draft" },
};

export function ActiveBots() {
  const router = useRouter();
  const [bots, setBots] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) setBots(data.agents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const launchDemo = useCallback(
    async (template: string) => {
      setLaunching(template);
      try {
        const res = await fetch("/api/agents/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template }),
        });
        const data = await res.json();
        if (data?.ok && data.agent?.id) {
          router.push(`/agents/${data.agent.id}`);
        }
      } catch {
        setLaunching(null);
      }
    },
    [router]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-[#1E293B] bg-[#0F1629]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Launch Demo Bot Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(["alpha-hunter", "steady-grinder", "safe-harbor"] as const).map((t) => {
          const meta = {
            "alpha-hunter": { name: "Alpha Hunter", desc: "RSI + EMA crossover on BTC/ETH/SOL", color: "#00E5FF" },
            "steady-grinder": { name: "Steady Grinder", desc: "EMA + DCA on BTC/ETH", color: "#8B5CF6" },
            "safe-harbor": { name: "Safe Harbor", desc: "Conservative DCA + Grid on BTC", color: "#10B981" },
          }[t];
          return (
            <button
              key={t}
              onClick={() => launchDemo(t)}
              disabled={launching !== null}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#0F1629] p-4 text-left transition-all duration-200",
                "hover:border-[#1E293B]/80 hover:shadow-lg disabled:opacity-60"
              )}
            >
              <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ background: `linear-gradient(135deg, ${meta.color}08, transparent)` }} />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                  <span className="text-sm font-semibold text-[#F8FAFC]">{meta.name}</span>
                  <span className="rounded bg-[#1A2340] px-1.5 py-0.5 text-[10px] font-medium text-[#94A3B8]">PAPER</span>
                </div>
                <p className="mt-1 text-xs text-[#94A3B8]">{meta.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium" style={{ color: meta.color }}>
                  {launching === t ? (
                    <>
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Launching...
                    </>
                  ) : (
                    <>
                      Launch Demo
                      <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Real Agents */}
      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E293B] bg-[#0F1629] py-12">
          <svg className="h-10 w-10 text-[#94A3B8]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          <p className="mt-3 text-sm text-[#94A3B8]">No agents yet. Launch a demo bot above or build your own.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bots.map((bot) => {
            const s = STATUS_MAP[bot.status] ?? STATUS_MAP.DRAFT;
            return (
              <Link
                key={bot.id}
                href={`/agents/${bot.id}`}
                className="group flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#0F1629] p-4 transition-all duration-200 hover:border-[#00E5FF]/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1A2340]">
                    <svg className="h-4 w-4 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[#F8FAFC]">{bot.name}</h4>
                      <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", s.bg)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                        {s.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#94A3B8]">
                      {bot.strategy} · {(bot.pairs ?? []).join(", ")}
                    </p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-[#94A3B8] transition-transform group-hover:translate-x-1 group-hover:text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
