// ---------------------------------------------------------------------------
// Resolves an IndicatorConfig to computed values from candle data
// Bridges the typed config to the raw indicator functions
// ---------------------------------------------------------------------------

import type { CandleData } from "@/lib/market/live-prices";
import type { IndicatorConfig } from "./types";
import {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  vwap,
  obv,
  adx,
  stochastic,
} from "./indicators";

// ---------------------------------------------------------------------------
// Extract price arrays from candle data
// ---------------------------------------------------------------------------

function extractArrays(candles: CandleData[]): {
  close: number[];
  high: number[];
  low: number[];
  volume: number[];
} {
  const close = new Array<number>(candles.length);
  const high = new Array<number>(candles.length);
  const low = new Array<number>(candles.length);
  const volume = new Array<number>(candles.length);

  for (let i = 0; i < candles.length; i++) {
    close[i] = candles[i].close;
    high[i] = candles[i].high;
    low[i] = candles[i].low;
    volume[i] = candles[i].volume;
  }
  return { close, high, low, volume };
}

// ---------------------------------------------------------------------------
// Get a numeric param with a fallback default
// ---------------------------------------------------------------------------

function param(params: Record<string, number>, key: string, def: number): number {
  return params[key] ?? def;
}

// ---------------------------------------------------------------------------
// Compute indicator values for the given config and candle data
// ---------------------------------------------------------------------------

export function computeIndicator(
  config: IndicatorConfig,
  candles: CandleData[]
): number[] {
  const { close, high, low, volume } = extractArrays(candles);

  switch (config.type) {
    case "SMA":
      return sma(close, param(config.params, "period", 20));

    case "EMA":
      return ema(close, param(config.params, "period", 20));

    case "RSI":
      return rsi(close, param(config.params, "period", 14));

    case "MACD": {
      const result = macd(
        close,
        param(config.params, "fast", 12),
        param(config.params, "slow", 26),
        param(config.params, "signal", 9)
      );
      // Default to MACD line; use output param to select
      const output = config.params["output"];
      if (output === 1) return result.signalLine;
      if (output === 2) return result.histogram;
      return result.macdLine;
    }

    case "BB": {
      const result = bollingerBands(
        close,
        param(config.params, "period", 20),
        param(config.params, "stdDev", 2)
      );
      const output = config.params["output"];
      if (output === 1) return result.upper;
      if (output === 2) return result.lower;
      return result.middle;
    }

    case "ATR":
      return atr(high, low, close, param(config.params, "period", 14));

    case "VWAP":
      return vwap(high, low, close, volume);

    case "OBV":
      return obv(close, volume);

    case "ADX":
      return adx(high, low, close, param(config.params, "period", 14));

    case "STOCH": {
      const result = stochastic(
        high,
        low,
        close,
        param(config.params, "kPeriod", 14),
        param(config.params, "dPeriod", 3)
      );
      const output = config.params["output"];
      if (output === 1) return result.d;
      return result.k;
    }
  }
}
