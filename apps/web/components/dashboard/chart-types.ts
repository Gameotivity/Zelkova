export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Interval = "1h" | "4h" | "1d" | "1w";
export type Pair = "BTCUSDT" | "ETHUSDT" | "SOLUSDT";

export const PAIRS: { value: Pair; label: string }[] = [
  { value: "BTCUSDT", label: "BTC/USDT" },
  { value: "ETHUSDT", label: "ETH/USDT" },
  { value: "SOLUSDT", label: "SOL/USDT" },
];

export const INTERVALS: { value: Interval; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

export const W = 800;
export const H = 380;
export const PAD = { top: 20, right: 60, bottom: 50, left: 10 };
export const CHART_W = W - PAD.left - PAD.right;
export const CHART_H = H - PAD.top - PAD.bottom;
export const VOL_H = 60;
