"use client";

export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Agents</h1>
          <p className="text-sm text-[#94A3B8]">Your autonomous trading bots</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#00E5FF]/10">
          <svg className="h-10 w-10 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">No Agents Yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#94A3B8]">
          New agents and strategies are coming soon. Stay tuned for the next generation of AI-powered trading bots on Hyperliquid.
        </p>
      </div>
    </div>
  );
}
