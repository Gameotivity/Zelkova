import Link from "next/link";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Agents</h1>
          <p className="text-sm text-text-muted">Manage your trading agents</p>
        </div>
        <Link
          href="/agents/new"
          className="rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-semibold text-zelkora-base transition-all duration-200 hover:bg-accent-primary/90"
        >
          + New Agent
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-zelkora-border bg-zelkora-card py-20">
        <div className="mb-4 rounded-full bg-zelkora-elevated p-4">
          <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <p className="text-lg font-medium text-text-body">No agents yet</p>
        <p className="mt-1 text-sm text-text-muted">Create your first autonomous trading agent</p>
        <Link
          href="/agents/new"
          className="mt-6 rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-semibold text-zelkora-base transition-all duration-200 hover:bg-accent-primary/90"
        >
          Create Agent
        </Link>
      </div>
    </div>
  );
}
