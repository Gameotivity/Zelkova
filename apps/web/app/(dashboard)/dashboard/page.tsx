import { LiveTicker } from "@/components/dashboard/live-ticker";
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview";
import { PriceChart } from "@/components/dashboard/price-chart";
import { BotStatusGrid } from "@/components/dashboard/bot-status-grid";
import { RecentActivity } from "./recent-activity";

export default function DashboardPage() {
  return (
    <div className="-mx-6 -mt-6">
      {/* Live Market Ticker */}
      <LiveTicker />

      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Dashboard
            </h1>
            <p className="text-sm text-text-muted">
              Real-time portfolio and market overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
              Markets open
            </span>
          </div>
        </div>

        {/* Portfolio Stats Row */}
        <PortfolioOverview />

        {/* Chart + Bot Grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <PriceChart />
          </div>
          <div>
            <BotStatusGrid />
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </div>
  );
}
