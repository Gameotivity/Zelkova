export default function TradesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Trade History</h1>
      <p className="text-sm text-text-muted">Complete history of all executed trades across your agents.</p>

      <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zelkora-border text-text-muted">
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Agent</th>
                <th className="pb-3 font-medium">Pair</th>
                <th className="pb-3 font-medium">Side</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">Quantity</th>
                <th className="pb-3 font-medium text-right">Fee</th>
                <th className="pb-3 font-medium text-right">P&L</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={10} className="py-12 text-center text-text-muted">
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
