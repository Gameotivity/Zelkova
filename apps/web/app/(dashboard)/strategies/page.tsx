"use client";

import { StrategyPipeline } from "@/components/dashboard/strategy-pipeline";

export default function StrategiesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F8FAFC]">AI Strategy Engine</h1>
        <p className="text-sm text-[#94A3B8]">
          Visualize how HyperAlpha processes market data through 7 independent AI layers before executing any trade
        </p>
      </div>

      {/* Architecture Overview */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
            <svg className="h-5 w-5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#F8FAFC]">How HyperAlpha Thinks</h2>
            <p className="mt-1 text-sm text-[#E2E8F0]/70">
              Every trade decision passes through a 7-layer pipeline inspired by institutional trading desks.
              Four AI analysts examine different market dimensions simultaneously. A Bull vs Bear debate
              stress-tests the thesis. Three pure-math strategies provide independent validation.
              A trader synthesizes signals, a risk manager can VETO any trade, and a fund manager
              makes the final approve/reject decision. No single point of failure.
            </p>
          </div>
        </div>

        {/* Flow Diagram Mini */}
        <div className="mt-5 flex items-center justify-center gap-1 overflow-x-auto pb-2">
          {[
            { name: "Data", color: "#00E5FF" },
            { name: "Analysts", color: "#8B5CF6" },
            { name: "Debate", color: "#F59E0B" },
            { name: "Stat Arb", color: "#10B981" },
            { name: "Trader", color: "#00E5FF" },
            { name: "Risk", color: "#F43F5E" },
            { name: "Fund Mgr", color: "#8B5CF6" },
          ].map((step, i) => (
            <div key={step.name} className="flex items-center gap-1">
              <div
                className="whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-semibold"
                style={{
                  background: `${step.color}15`,
                  color: step.color,
                  border: `1px solid ${step.color}30`,
                }}
              >
                L{i + 1}: {step.name}
              </div>
              {i < 6 && (
                <svg className="h-3 w-3 flex-shrink-0 text-[#94A3B8]/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Pipeline Visualization */}
      <StrategyPipeline />

      {/* Safety Guarantees */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#F43F5E]/20 bg-[#F43F5E]/5 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-[#F43F5E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <h3 className="text-sm font-bold text-[#F43F5E]">Circuit Breakers</h3>
          </div>
          <p className="mt-2 text-xs text-[#E2E8F0]/60">
            Daily loss &gt; 5% auto-pauses agent. Portfolio drop &gt; 15% in 24h pauses ALL agents globally.
          </p>
        </div>

        <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <h3 className="text-sm font-bold text-[#F59E0B]">Hard Limits</h3>
          </div>
          <p className="mt-2 text-xs text-[#E2E8F0]/60">
            No trade without stop-loss. Max 25% equity per position. Leverage capped per user settings. Non-custodial always.
          </p>
        </div>

        <div className="rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <h3 className="text-sm font-bold text-[#10B981]">Risk Manager VETO</h3>
          </div>
          <p className="mt-2 text-xs text-[#E2E8F0]/60">
            Independent risk agent can reject any trade regardless of upstream consensus. Cannot be overridden by other layers.
          </p>
        </div>
      </div>
    </div>
  );
}
