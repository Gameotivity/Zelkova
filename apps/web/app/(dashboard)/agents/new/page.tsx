"use client";

import { useRouter } from "next/navigation";

export default function NewAgentPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Create Agent</h1>
        <p className="text-sm text-[#94A3B8]">New agent builder coming soon</p>
      </div>

      <div className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B5CF6]/10">
          <svg className="h-8 w-8 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[#F8FAFC]">Under Construction</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#94A3B8]">
          We're building a new agent creation flow with fresh strategies. Check back soon.
        </p>
        <button onClick={() => router.push("/agents")}
          className="mt-6 rounded-xl border border-[#1E293B] px-6 py-2.5 text-sm font-medium text-[#94A3B8] transition-all hover:bg-[#1A2340]">
          Back to Agents
        </button>
      </div>
    </div>
  );
}
