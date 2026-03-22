"use client";

import { cn } from "@/lib/utils/cn";

interface MetricItem {
  label: string;
  value: string;
  positive: boolean;
  icon: React.ReactNode;
}

interface MetricsGridProps {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWinLoss: number;
  totalTrades: number;
  calmarRatio: number;
}

export function MetricsGrid(props: MetricsGridProps) {
  const metrics: MetricItem[] = [
    {
      label: "Total Return",
      value: `${props.totalReturn >= 0 ? "+" : ""}${props.totalReturn.toFixed(2)}%`,
      positive: props.totalReturn >= 0,
      icon: <TrendIcon />,
    },
    {
      label: "Sharpe Ratio",
      value: props.sharpeRatio.toFixed(2),
      positive: props.sharpeRatio >= 1,
      icon: <ChartIcon />,
    },
    {
      label: "Max Drawdown",
      value: `${props.maxDrawdown.toFixed(2)}%`,
      positive: props.maxDrawdown > -10,
      icon: <DrawdownIcon />,
    },
    {
      label: "Win Rate",
      value: `${props.winRate.toFixed(1)}%`,
      positive: props.winRate >= 50,
      icon: <TargetIcon />,
    },
    {
      label: "Profit Factor",
      value: props.profitFactor.toFixed(2),
      positive: props.profitFactor >= 1,
      icon: <ScaleIcon />,
    },
    {
      label: "Avg Win/Loss",
      value: props.avgWinLoss.toFixed(2),
      positive: props.avgWinLoss >= 1,
      icon: <BarIcon />,
    },
    {
      label: "Total Trades",
      value: props.totalTrades.toString(),
      positive: true,
      icon: <HashIcon />,
    },
    {
      label: "Calmar Ratio",
      value: props.calmarRatio.toFixed(2),
      positive: props.calmarRatio >= 1,
      icon: <GaugeIcon />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-4 transition-all duration-200 hover:border-[#1E293B]/80"
        >
          <div className="mb-2 flex items-center gap-2 text-[#94A3B8]">
            {m.icon}
            <span className="text-xs">{m.label}</span>
          </div>
          <p
            className={cn(
              "font-mono text-xl font-bold",
              m.positive ? "text-[#10B981]" : "text-[#F43F5E]"
            )}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function TrendIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
    </svg>
  );
}

function DrawdownIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  );
}

function BarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.6 19.5m-2.1-19.5l-3.6 19.5" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
