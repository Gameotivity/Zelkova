export default function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Agent Detail
          </h1>
          <p className="text-sm text-text-muted">ID: {params.id}</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-zelkora-border px-4 py-2 text-sm font-medium text-text-body transition-all hover:border-warning hover:text-warning">
            Pause
          </button>
          <button className="rounded-lg border border-danger/50 px-4 py-2 text-sm font-medium text-danger transition-all hover:bg-danger/10">
            Stop
          </button>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Live Chart</h2>
        <div className="flex h-64 items-center justify-center text-text-muted">
          TradingView chart will render here
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {["Total P&L", "Win Rate", "Sharpe Ratio", "Max Drawdown"].map(
          (metric) => (
            <div
              key={metric}
              className="rounded-xl border border-zelkora-border bg-zelkora-card p-4"
            >
              <p className="text-xs text-text-muted">{metric}</p>
              <p className="mt-1 text-xl font-bold text-text-primary font-mono">—</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
