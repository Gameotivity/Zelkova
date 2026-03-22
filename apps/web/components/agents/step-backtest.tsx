"use client";

import { useMemo } from "react";
import type { BotConfig } from "./bot-data";

interface StepBacktestProps {
  config: BotConfig;
  templateName: string | null;
}

interface MockResult {
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}

function generateMockBacktest(config: BotConfig): MockResult {
  const riskFactor = config.takeProfitPct / config.stopLossPct;
  const baseWinRate = Math.min(80, 55 + riskFactor * 3);
  return {
    totalReturn: +(config.takeProfitPct * 0.8 * (baseWinRate / 100) * 3).toFixed(1),
    winRate: +baseWinRate.toFixed(1),
    maxDrawdown: +(config.stopLossPct * 1.2).toFixed(1),
    sharpeRatio: +(riskFactor * 0.6).toFixed(2),
    totalTrades: Math.floor(80 + Math.random() * 40),
    profitFactor: +(1 + riskFactor * 0.3).toFixed(2),
    avgWin: +(config.takeProfitPct * 0.6).toFixed(1),
    avgLoss: +(config.stopLossPct * 0.7).toFixed(1),
  };
}

const MOCK_EQUITY_CURVE = [
  0, 1.2, 0.8, 2.4, 3.1, 2.6, 4.2, 5.1, 4.5, 6.3,
  7.2, 6.8, 8.4, 9.1, 8.5, 10.2, 11.4, 10.8, 12.6, 13.8,
  13.2, 14.5, 15.8, 15.1, 16.9, 18.2, 17.5, 19.1, 20.4, 21.2,
];

export function StepBacktest({ config, templateName }: StepBacktestProps) {
  const result = useMemo(() => generateMockBacktest(config), [config]);

  const maxVal = Math.max(...MOCK_EQUITY_CURVE);
  const chartHeight = 120;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">Backtest Preview</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Simulated results over the last 90 days {templateName ? `for ${templateName}` : ""}
        </p>
      </div>

      {/* Equity curve */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#F8FAFC]">Equity Curve (90 days)</h3>
          <span className="font-mono text-sm font-bold text-[#10B981]">+{result.totalReturn}%</span>
        </div>

        <div className="relative" style={{ height: chartHeight + 20 }}>
          <svg width="100%" height={chartHeight + 20} className="overflow-visible">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((pct) => (
              <line
                key={pct}
                x1="0"
                y1={chartHeight - (pct / 100) * chartHeight}
                x2="100%"
                y2={chartHeight - (pct / 100) * chartHeight}
                stroke="#1E293B"
                strokeWidth="1"
              />
            ))}

            {/* Area fill */}
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={buildAreaPath(MOCK_EQUITY_CURVE, maxVal, chartHeight)}
              fill="url(#equityGradient)"
            />

            {/* Line */}
            <polyline
              points={MOCK_EQUITY_CURVE.map(
                (v, i) =>
                  `${(i / (MOCK_EQUITY_CURVE.length - 1)) * 100}%,${chartHeight - (v / maxVal) * chartHeight}`
              ).join(" ")}
              fill="none"
              stroke="#00E5FF"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="mt-2 flex justify-between text-[10px] text-[#94A3B8]">
          <span>90 days ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox label="Total Return" value={`+${result.totalReturn}%`} color="#10B981" />
        <StatBox label="Win Rate" value={`${result.winRate}%`} color="#00E5FF" />
        <StatBox label="Max Drawdown" value={`-${result.maxDrawdown}%`} color="#F43F5E" />
        <StatBox label="Sharpe Ratio" value={String(result.sharpeRatio)} color="#8B5CF6" />
        <StatBox label="Total Trades" value={String(result.totalTrades)} color="#E2E8F0" />
        <StatBox label="Profit Factor" value={`${result.profitFactor}x`} color="#10B981" />
        <StatBox label="Avg Win" value={`+${result.avgWin}%`} color="#10B981" />
        <StatBox label="Avg Loss" value={`-${result.avgLoss}%`} color="#F43F5E" />
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 p-4">
        <p className="text-xs text-[#8B5CF6]">
          <span className="font-bold">Simulation Only:</span> These are backtested results using historical data. Actual live performance may vary due to slippage, fees, and market conditions. Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-4">
      <p className="text-[10px] text-[#94A3B8]">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function buildAreaPath(data: number[], max: number, height: number): string {
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - (v / max) * height;
    return `${x}%,${y}`;
  });

  const linePoints = points.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(" ");
  return `${linePoints} L 100%,${height} L 0%,${height} Z`;
}
