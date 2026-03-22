"use client";

import { useParams, useRouter } from "next/navigation";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Agent Details</h1>
          <p className="font-mono text-sm text-[#94A3B8]">{String(params.id).slice(0, 8)}...</p>
        </div>
        <button onClick={() => router.push("/agents")}
          className="rounded-xl border border-[#1E293B] px-4 py-2 text-sm text-[#94A3B8] hover:bg-[#1A2340]">
          Back
        </button>
      </div>

      <div className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-12 text-center">
        <p className="text-sm text-[#94A3B8]">Agent view is being rebuilt with new strategies.</p>
      </div>
    </div>
  );
}
