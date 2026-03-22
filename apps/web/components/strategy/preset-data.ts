import type { PresetStrategy } from "./strategy-types";

export const PRESET_STRATEGIES: PresetStrategy[] = [
  {
    id: "golden-cross",
    name: "Golden Cross",
    description:
      "Buy when the 50-period SMA crosses above the 200-period SMA. Classic trend-following strategy used by institutional traders.",
    indicators: ["SMA 50", "SMA 200"],
    winRate: 62,
    category: "Trend Following",
  },
  {
    id: "rsi-mean-reversion",
    name: "RSI Mean Reversion",
    description:
      "Buy when RSI drops below 30 (oversold), sell when it rises above 70 (overbought). Works best in range-bound markets.",
    indicators: ["RSI 14"],
    winRate: 58,
    category: "Mean Reversion",
  },
  {
    id: "macd-momentum",
    name: "MACD Momentum",
    description:
      "Enter on MACD line crossing above signal line with positive histogram. Captures strong momentum moves early.",
    indicators: ["MACD 12/26/9"],
    winRate: 55,
    category: "Momentum",
  },
  {
    id: "bollinger-breakout",
    name: "Bollinger Breakout",
    description:
      "Trade breakouts when price closes outside Bollinger Bands after a squeeze. High reward-to-risk ratio.",
    indicators: ["BB 20/2", "ATR 14"],
    winRate: 51,
    category: "Breakout",
  },
  {
    id: "triple-ema",
    name: "Triple EMA",
    description:
      "Uses 8, 21, and 55-period EMAs for trend confirmation. Enter when all three align, exit on first cross.",
    indicators: ["EMA 8", "EMA 21", "EMA 55"],
    winRate: 59,
    category: "Trend Following",
  },
];
