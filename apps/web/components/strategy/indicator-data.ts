import type { IndicatorDef } from "./strategy-types";

export const INDICATORS: IndicatorDef[] = [
  {
    id: "sma",
    name: "SMA",
    category: "Trend",
    description: "Simple Moving Average — mean price over N periods",
    params: [{ key: "period", label: "Period", min: 2, max: 200, step: 1, defaultValue: 20 }],
  },
  {
    id: "ema",
    name: "EMA",
    category: "Trend",
    description: "Exponential Moving Average — weighted toward recent prices",
    params: [{ key: "period", label: "Period", min: 2, max: 200, step: 1, defaultValue: 12 }],
  },
  {
    id: "macd",
    name: "MACD",
    category: "Trend",
    description: "Moving Average Convergence/Divergence — trend & momentum",
    params: [
      { key: "fast", label: "Fast", min: 2, max: 50, step: 1, defaultValue: 12 },
      { key: "slow", label: "Slow", min: 5, max: 100, step: 1, defaultValue: 26 },
      { key: "signal", label: "Signal", min: 2, max: 50, step: 1, defaultValue: 9 },
    ],
  },
  {
    id: "adx",
    name: "ADX",
    category: "Trend",
    description: "Average Directional Index — trend strength (0–100)",
    params: [{ key: "period", label: "Period", min: 5, max: 50, step: 1, defaultValue: 14 }],
  },
  {
    id: "rsi",
    name: "RSI",
    category: "Momentum",
    description: "Relative Strength Index — overbought/oversold (0–100)",
    params: [{ key: "period", label: "Period", min: 2, max: 50, step: 1, defaultValue: 14 }],
  },
  {
    id: "stoch",
    name: "Stochastic",
    category: "Momentum",
    description: "Stochastic Oscillator — momentum reversal signals",
    params: [
      { key: "kPeriod", label: "%K Period", min: 2, max: 50, step: 1, defaultValue: 14 },
      { key: "dPeriod", label: "%D Period", min: 1, max: 20, step: 1, defaultValue: 3 },
    ],
  },
  {
    id: "bb",
    name: "Bollinger Bands",
    category: "Volatility",
    description: "Price bands based on standard deviation from SMA",
    params: [
      { key: "period", label: "Period", min: 5, max: 50, step: 1, defaultValue: 20 },
      { key: "stdDev", label: "Std Dev", min: 0.5, max: 4, step: 0.5, defaultValue: 2 },
    ],
  },
  {
    id: "atr",
    name: "ATR",
    category: "Volatility",
    description: "Average True Range — measures volatility in price units",
    params: [{ key: "period", label: "Period", min: 5, max: 50, step: 1, defaultValue: 14 }],
  },
  {
    id: "vwap",
    name: "VWAP",
    category: "Volume",
    description: "Volume Weighted Average Price — institutional benchmark",
    params: [],
  },
  {
    id: "obv",
    name: "OBV",
    category: "Volume",
    description: "On-Balance Volume — cumulative volume flow",
    params: [],
  },
];

export const INDICATOR_CATEGORIES = ["Trend", "Momentum", "Volatility", "Volume"] as const;

export function getIndicatorById(id: string): IndicatorDef | undefined {
  return INDICATORS.find((ind) => ind.id === id);
}

export function getDefaultParams(indicatorId: string): Record<string, number> {
  const indicator = getIndicatorById(indicatorId);
  if (!indicator) return {};
  return Object.fromEntries(indicator.params.map((p) => [p.key, p.defaultValue]));
}
