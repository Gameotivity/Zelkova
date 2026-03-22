// ---------------------------------------------------------------------------
// Performance metrics calculation for backtest results
// ---------------------------------------------------------------------------

import type { CandleData } from "@/lib/market/live-prices";
import type { PerformanceMetrics, TradeResult } from "./types";

export function calculateMetrics(
  trades: TradeResult[],
  initialCapital: number,
  candles: CandleData[]
): PerformanceMetrics {
  const empty: PerformanceMetrics = {
    totalReturn: 0,
    totalReturnPct: 0,
    annualizedReturn: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    winRate: 0,
    profitFactor: 0,
    totalTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    avgHoldingPeriod: 0,
    bestTrade: 0,
    worstTrade: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    calmarRatio: 0,
  };
  if (trades.length === 0) return empty;

  const netPnls = trades.map((t) => t.pnl - t.fees);
  const totalReturn = netPnls.reduce((s, v) => s + v, 0);
  const wins = netPnls.filter((p) => p > 0);
  const losses = netPnls.filter((p) => p < 0);
  const grossWin = wins.reduce((s, v) => s + v, 0);
  const grossLoss = Math.abs(losses.reduce((s, v) => s + v, 0));

  // Equity curve for max drawdown
  let equity = initialCapital;
  let peak = equity;
  let maxDD = 0;
  for (const pnl of netPnls) {
    equity += pnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  }
  const maxDDPct = peak > 0 ? (maxDD / peak) * 100 : 0;
  const finalEquity = initialCapital + totalReturn;

  // Time span in years
  const durationMs =
    candles.length > 1
      ? candles[candles.length - 1].openTime - candles[0].openTime
      : 1;
  const years = durationMs / (365.25 * 24 * 3600 * 1000);
  const totalReturnPct = (totalReturn / initialCapital) * 100;
  const annualized =
    years > 0
      ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100
      : totalReturnPct;

  // Sharpe & Sortino (assume 0 risk-free rate)
  const mean = netPnls.reduce((s, v) => s + v, 0) / netPnls.length;
  const variance =
    netPnls.reduce((s, v) => s + (v - mean) ** 2, 0) / netPnls.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev === 0 ? 0 : (mean / stdDev) * Math.sqrt(252);

  const downside = netPnls.filter((p) => p < 0);
  const downsideVar =
    downside.length > 0
      ? downside.reduce((s, v) => s + v ** 2, 0) / netPnls.length
      : 0;
  const downsideDev = Math.sqrt(downsideVar);
  const sortino =
    downsideDev === 0 ? 0 : (mean / downsideDev) * Math.sqrt(252);

  // Consecutive wins/losses
  let maxConsWins = 0;
  let maxConsLosses = 0;
  let consWins = 0;
  let consLosses = 0;
  for (const pnl of netPnls) {
    if (pnl > 0) {
      consWins++;
      consLosses = 0;
    } else {
      consLosses++;
      consWins = 0;
    }
    if (consWins > maxConsWins) maxConsWins = consWins;
    if (consLosses > maxConsLosses) maxConsLosses = consLosses;
  }

  const calmar = maxDDPct === 0 ? 0 : annualized / maxDDPct;

  return {
    totalReturn,
    totalReturnPct,
    annualizedReturn: annualized,
    sharpeRatio: sharpe,
    sortinoRatio: sortino,
    maxDrawdown: maxDD,
    maxDrawdownPct: maxDDPct,
    winRate: wins.length / trades.length,
    profitFactor:
      grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss,
    totalTrades: trades.length,
    avgWin: wins.length > 0 ? grossWin / wins.length : 0,
    avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    avgHoldingPeriod: 0,
    bestTrade: netPnls.length > 0 ? Math.max(...netPnls) : 0,
    worstTrade: netPnls.length > 0 ? Math.min(...netPnls) : 0,
    consecutiveWins: maxConsWins,
    consecutiveLosses: maxConsLosses,
    calmarRatio: calmar,
  };
}
