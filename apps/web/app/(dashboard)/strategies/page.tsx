"use client";

export default function StrategiesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Strategies</h1>
        <p className="text-sm text-[#94A3B8]">Trading strategies for your agents</p>
      </div>

      <div className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#8B5CF6]/10">
          <svg className="h-10 w-10 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">New Strategies Coming Soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#94A3B8]">
          We're designing the next generation of AI-powered trading strategies for Hyperliquid perpetuals. Stay tuned.
        </p>
      </div>
    </div>
  );
}
