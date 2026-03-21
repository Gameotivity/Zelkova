export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Portfolio</h1>
      <p className="text-sm text-text-muted">Track your overall portfolio performance across all agents.</p>

      <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-text-muted">Portfolio data will appear after your first trade</p>
        </div>
      </div>
    </div>
  );
}
