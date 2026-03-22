// ---------------------------------------------------------------------------
// Preset strategy definitions — 5 ready-to-use quantitative strategies
// ---------------------------------------------------------------------------

import type { StrategyDefinition } from "./types";

// ---------------------------------------------------------------------------
// 1. Golden Cross — SMA(50) crosses above SMA(200)
// ---------------------------------------------------------------------------

export const goldenCross: StrategyDefinition = {
  name: "Golden Cross",
  description:
    "Classic trend-following strategy. Enters long when SMA(50) crosses above SMA(200), exits when it crosses below.",
  entryLong: {
    logic: "AND",
    conditions: [
      {
        indicator: { type: "SMA", params: { period: 50 } },
        comparison: "crosses_above",
        value: { type: "SMA", params: { period: 200 } },
      },
    ],
  },
  exitLong: {
    logic: "AND",
    conditions: [
      {
        indicator: { type: "SMA", params: { period: 50 } },
        comparison: "crosses_below",
        value: { type: "SMA", params: { period: 200 } },
      },
    ],
  },
  stopLossPct: 5,
  takeProfitPct: 15,
  timeframe: "1d",
  cooldownBars: 5,
};

// ---------------------------------------------------------------------------
// 2. RSI Mean Reversion — RSI(14) oversold with BB confirmation
// ---------------------------------------------------------------------------

export const rsiMeanReversion: StrategyDefinition = {
  name: "RSI Mean Reversion",
  description:
    "Buys when RSI(14) drops below 30 and price is near lower Bollinger Band. Exits when RSI exceeds 70.",
  entryLong: {
    logic: "AND",
    conditions: [
      {
        indicator: { type: "RSI", params: { period: 14 } },
        comparison: "<",
        value: 30,
      },
      {
        indicator: { type: "BB", params: { period: 20, stdDev: 2, output: 2 } },
        comparison: ">=",
        value: { type: "SMA", params: { period: 1 } }, // price proxy (SMA(1) = close)
      },
    ],
  },
  exitLong: {
    logic: "AND",
    conditions: [
      {
        indicator: { type: "RSI", params: { period: 14 } },
        comparison: ">",
        value: 70,
      },
    ],
  },
  stopLossPct: 3,
  takeProfitPct: 8,
  timeframe: "1h",
  cooldownBars: 10,
};

// ---------------------------------------------------------------------------
// 3. MACD Momentum — MACD line crosses above signal line
// ---------------------------------------------------------------------------

export const macdMomentum: StrategyDefinition = {
  name: "MACD Momentum",
  description:
    "Enters long when MACD line crosses above signal line, exits when it crosses below.",
  entryLong: {
    logic: "AND",
    conditions: [
      {
        indicator: { type: "MACD", params: { fast: 12, slow: 26, signal: 9, output: 0 } },
        comparison: "crosses_above",
        value: { type: "MACD", params: { fast: 12, slow: 26, signal: 9, output: 1 } },
      },
    ],
  },
  exitLong: {
    logic: "AND",
    conditions: [
      {
        indicator: { type: "MACD", params: { fast: 12, slow: 26, signal: 9, output: 0 } },
        comparison: "crosses_below",
        value: { type: "MACD", params: { fast: 12, slow: 26, signal: 9, output: 1 } },
      },
    ],
  },
  stopLossPct: 4,
  takeProfitPct: 10,
  timeframe: "4h",
  cooldownBars: 3,
};

// ---------------------------------------------------------------------------
// 4. Bollinger Breakout — Price breaks above upper BB
// ---------------------------------------------------------------------------

export const bollingerBreakout: StrategyDefinition = {
  name: "Bollinger Breakout",
  description:
    "Enters long when price breaks above upper Bollinger Band, exits when price falls below middle band.",
  entryLong: {
    logic: "AND",
    conditions: [
      {
        indicator: { type: "SMA", params: { period: 1 } }, // close price proxy
        comparison: ">",
        value: { type: "BB", params: { period: 20, stdDev: 2, output: 1 } },
      },
    ],
  },
  exitLong: {
    logic: "AND",
    conditions: [
      {
        indicator: { type: "SMA", params: { period: 1 } },
        comparison: "<",
        value: { type: "BB", params: { period: 20, stdDev: 2, output: 0 } },
      },
    ],
  },
  stopLossPct: 3,
  takeProfitPct: 8,
  trailingStopPct: 2,
  timeframe: "1h",
  cooldownBars: 5,
};

// ---------------------------------------------------------------------------
// 5. Triple EMA — EMA(9) > EMA(21) > EMA(55) alignment
// ---------------------------------------------------------------------------

export const tripleEma: StrategyDefinition = {
  name: "Triple EMA",
  description:
    "Enters long when EMA(9) > EMA(21) > EMA(55) alignment forms, exits when any EMA crosses below.",
  entryLong: {
    logic: "AND",
    conditions: [
      {
        indicator: { type: "EMA", params: { period: 9 } },
        comparison: ">",
        value: { type: "EMA", params: { period: 21 } },
      },
      {
        indicator: { type: "EMA", params: { period: 21 } },
        comparison: ">",
        value: { type: "EMA", params: { period: 55 } },
      },
    ],
  },
  exitLong: {
    logic: "OR",
    conditions: [
      {
        indicator: { type: "EMA", params: { period: 9 } },
        comparison: "crosses_below",
        value: { type: "EMA", params: { period: 21 } },
      },
      {
        indicator: { type: "EMA", params: { period: 21 } },
        comparison: "crosses_below",
        value: { type: "EMA", params: { period: 55 } },
      },
    ],
  },
  stopLossPct: 4,
  takeProfitPct: 12,
  trailingStopPct: 3,
  timeframe: "4h",
  cooldownBars: 4,
};

// ---------------------------------------------------------------------------
// All presets
// ---------------------------------------------------------------------------

export const strategyPresets: StrategyDefinition[] = [
  goldenCross,
  rsiMeanReversion,
  macdMomentum,
  bollingerBreakout,
  tripleEma,
];
