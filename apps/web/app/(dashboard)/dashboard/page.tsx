import Link from "next/link";
import { PnLChart } from "@/components/dashboard/pnl-chart";
import { AgentCard } from "@/components/dashboard/agent-card";

function StatCard({
  label, value, change, positive,
}: { label: string; value: string; change?: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-text-primary font-mono">{value}</p>
      {change && (
        <p className={`mt-1 text-sm font-medium ${positive ? "text-success" : "text-danger"}`}>
          {positive ? "+" : ""}{change}
        </p>
      )}
    </div>
  );
}

const demoAgents = [
  {
    id: "demo-1", name: "BTC Momentum", type: "CRYPTO" as const, status: "PAPER" as const,
    strategy: "EMA_CROSSOVER", pairs: ["BTC/USDT", "ETH/USDT"], pnl: 342.50,
    lastSignal: "BUY", lastSignalTime: "2m ago",
  },
  {
    id: "demo-2", name: "SOL RSI Hunter", type: "CRYPTO" as const, status: "PAPER" as const,
    strategy: "RSI_CROSSOVER", pairs: ["SOL/USDT"], pnl: -47.20,
    lastSignal: "HOLD", lastSignalTime: "15m ago",
  },
  {
    id: "demo-3", name: "Polymarket Alpha", type: "POLYMARKET" as const, status: "PAPER" as const,
    strategy: "ODDS_DIVERGENCE", pnl: 128.90,
    lastSignal: "BUY", lastSignalTime: "1h ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted">Monitor your agents and portfolio performance</p>
        </div>
        <Link href="/agents/new" className="rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-semibold text-zelkora-base transition-all hover:bg-accent-primary/90">
          + New Agent
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Portfolio Value" value="$10,424" change="3.2%" positive />
        <StatCard label="Active Agents" value="3" />
        <StatCard label="Today's P&L" value="+$124" change="+1.2%" positive />
        <StatCard label="Win Rate" value="64.3%" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PnLChart />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Active Agents</h2>
          {demoAgents.map((agent) => (
            <AgentCard key={agent.id} {...agent} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Recent Trades</h2>
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
            <tbody className="text-text-body">
              {[
                { time: "2m ago", agent: "BTC Momentum", pair: "BTC/USDT", side: "BUY", price: "$67,432", qty: "0.015", pnl: "+$42.30" },
                { time: "18m ago", agent: "SOL RSI Hunter", pair: "SOL/USDT", side: "SELL", price: "$142.80", qty: "5.2", pnl: "-$12.40" },
                { time: "1h ago", agent: "BTC Momentum", pair: "ETH/USDT", side: "BUY", price: "$3,542", qty: "0.5", pnl: "+$28.50" },
                { time: "3h ago", agent: "Polymarket Alpha", pair: "Election Yes", side: "BUY", price: "$0.62", qty: "200", pnl: "+$18.00" },
              ].map((t, i) => (
                <tr key={i} className="border-b border-zelkora-border/50">
                  <td className="py-3 text-text-muted">{t.time}</td>
                  <td className="py-3">{t.agent}</td>
                  <td className="py-3 font-mono text-xs">{t.pair}</td>
                  <td className="py-3"><span className={t.side === "BUY" ? "text-success" : "text-danger"}>{t.side}</span></td>
                  <td className="py-3 text-right font-mono">{t.price}</td>
                  <td className="py-3 text-right font-mono">{t.qty}</td>
                  <td className={`py-3 text-right font-mono font-medium ${t.pnl.startsWith("+") ? "text-success" : "text-danger"}`}>{t.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
