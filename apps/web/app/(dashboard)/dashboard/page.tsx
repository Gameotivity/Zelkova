import Link from "next/link";

function StatCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-text-primary font-mono">
        {value}
      </p>
      {change && (
        <p
          className={`mt-1 text-sm font-medium ${
            positive ? "text-success" : "text-danger"
          }`}
        >
          {positive ? "+" : ""}
          {change}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Dashboard
          </h1>
          <p className="text-sm text-text-muted">
            Monitor your agents and portfolio performance
          </p>
        </div>
        <Link
          href="/agents/new"
          className="rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-semibold text-zelkora-base transition-all duration-200 hover:bg-accent-primary/90"
        >
          + New Agent
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Portfolio Value"
          value="$0.00"
          change="0.00%"
          positive
        />
        <StatCard label="Active Agents" value="0" />
        <StatCard
          label="Today's P&L"
          value="$0.00"
          change="$0.00"
          positive
        />
        <StatCard label="Win Rate" value="—" />
      </div>

      {/* Agent Status + Chart Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Agents */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Active Agents
            </h2>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-zelkora-elevated p-4">
                <svg
                  className="h-8 w-8 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                  />
                </svg>
              </div>
              <p className="text-text-muted">No agents yet</p>
              <Link
                href="/agents/new"
                className="mt-4 text-sm font-medium text-accent-primary hover:underline"
              >
                Create your first agent
              </Link>
            </div>
          </div>
        </div>

        {/* P&L Chart Placeholder */}
        <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            P&L Overview
          </h2>
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-text-muted">
              Chart will appear after first trade
            </p>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          Recent Trades
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zelkora-border text-text-muted">
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Agent</th>
                <th className="pb-3 font-medium">Pair</th>
                <th className="pb-3 font-medium">Side</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">Qty</th>
                <th className="pb-3 font-medium text-right">P&L</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-text-muted"
                >
                  No trades yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
