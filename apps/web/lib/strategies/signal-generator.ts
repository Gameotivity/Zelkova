import { rsi, ema, macd, bollingerBands, vwap, atr, sma } from "./indicators";
import type { Candle } from "./indicators";
import type { SignalDirection, CryptoStrategy } from "@zelkora/shared";

export interface Signal {
  direction: SignalDirection;
  confidence: number;
  strategy: string;
  pair: string;
  indicators: Record<string, number | string>;
  reason: string;
}

/** RSI Crossover Strategy */
export function rsiCrossoverSignal(
  candles: Candle[],
  pair: string,
  config: { rsiPeriod: number; oversoldThreshold: number; overboughtThreshold: number }
): Signal {
  const closes = candles.map((c) => c.close);
  const rsiValues = rsi(closes, config.rsiPeriod);
  const currentRSI = rsiValues[rsiValues.length - 1];
  const prevRSI = rsiValues[rsiValues.length - 2];

  let direction: SignalDirection = "HOLD";
  let confidence = 0;
  let reason = "RSI neutral";

  if (currentRSI <= config.oversoldThreshold && prevRSI > config.oversoldThreshold) {
    direction = "BUY";
    confidence = Math.min(90, 50 + (config.oversoldThreshold - currentRSI) * 2);
    reason = `RSI crossed below oversold (${currentRSI.toFixed(1)})`;
  } else if (currentRSI >= config.overboughtThreshold && prevRSI < config.overboughtThreshold) {
    direction = "SELL";
    confidence = Math.min(90, 50 + (currentRSI - config.overboughtThreshold) * 2);
    reason = `RSI crossed above overbought (${currentRSI.toFixed(1)})`;
  }

  return {
    direction,
    confidence,
    strategy: "RSI_CROSSOVER",
    pair,
    indicators: { rsi: currentRSI, prevRsi: prevRSI },
    reason,
  };
}

/** EMA Crossover Strategy */
export function emaCrossoverSignal(
  candles: Candle[],
  pair: string,
  config: { fastEma: number; slowEma: number; confirmationCandles: number }
): Signal {
  const closes = candles.map((c) => c.close);
  const fastEMA = ema(closes, config.fastEma);
  const slowEMA = ema(closes, config.slowEma);

  const len = closes.length;
  const fastNow = fastEMA[len - 1];
  const slowNow = slowEMA[len - 1];
  const fastPrev = fastEMA[len - 2];
  const slowPrev = slowEMA[len - 2];

  let direction: SignalDirection = "HOLD";
  let confidence = 0;
  let reason = "EMAs not crossed";

  // Golden cross: fast crosses above slow
  if (fastNow > slowNow && fastPrev <= slowPrev) {
    // Confirm with N candles
    let confirmed = true;
    for (let i = 1; i <= Math.min(config.confirmationCandles, len - 2); i++) {
      if (fastEMA[len - 1 - i] <= slowEMA[len - 1 - i]) {
        confirmed = false;
        break;
      }
    }

    if (config.confirmationCandles === 0 || !confirmed) {
      direction = "BUY";
      const spread = ((fastNow - slowNow) / slowNow) * 100;
      confidence = Math.min(85, 50 + spread * 10);
      reason = `EMA golden cross (${config.fastEma}/${config.slowEma})`;
    }
  }
  // Death cross: fast crosses below slow
  else if (fastNow < slowNow && fastPrev >= slowPrev) {
    direction = "SELL";
    const spread = ((slowNow - fastNow) / slowNow) * 100;
    confidence = Math.min(85, 50 + spread * 10);
    reason = `EMA death cross (${config.fastEma}/${config.slowEma})`;
  }

  return {
    direction,
    confidence,
    strategy: "EMA_CROSSOVER",
    pair,
    indicators: {
      fastEma: fastNow,
      slowEma: slowNow,
      spread: fastNow - slowNow,
    },
    reason,
  };
}

/** Breakout Strategy */
export function breakoutSignal(
  candles: Candle[],
  pair: string,
  config: { lookbackPeriod: number; volumeMultiplier: number; breakoutThreshold: number }
): Signal {
  const len = candles.length;
  if (len < config.lookbackPeriod + 1) {
    return { direction: "HOLD", confidence: 0, strategy: "BREAKOUT", pair, indicators: {}, reason: "Insufficient data" };
  }

  const lookback = candles.slice(len - config.lookbackPeriod - 1, len - 1);
  const current = candles[len - 1];

  const highestHigh = Math.max(...lookback.map((c) => c.high));
  const lowestLow = Math.min(...lookback.map((c) => c.low));
  const avgVolume = lookback.reduce((s, c) => s + c.volume, 0) / lookback.length;

  let direction: SignalDirection = "HOLD";
  let confidence = 0;
  let reason = "No breakout";

  const volumeSpike = current.volume > avgVolume * config.volumeMultiplier;
  const breakoutPct = ((current.close - highestHigh) / highestHigh) * 100;
  const breakdownPct = ((lowestLow - current.close) / lowestLow) * 100;

  if (current.close > highestHigh && breakoutPct >= config.breakoutThreshold && volumeSpike) {
    direction = "BUY";
    confidence = Math.min(90, 60 + breakoutPct * 5);
    reason = `Breakout above ${highestHigh.toFixed(2)} with volume spike`;
  } else if (current.close < lowestLow && breakdownPct >= config.breakoutThreshold && volumeSpike) {
    direction = "SELL";
    confidence = Math.min(90, 60 + breakdownPct * 5);
    reason = `Breakdown below ${lowestLow.toFixed(2)} with volume spike`;
  }

  return {
    direction,
    confidence,
    strategy: "BREAKOUT",
    pair,
    indicators: {
      highestHigh,
      lowestLow,
      currentClose: current.close,
      volumeRatio: current.volume / avgVolume,
    },
    reason,
  };
}

/** Generate signal based on strategy type */
export function generateSignal(
  strategy: CryptoStrategy,
  candles: Candle[],
  pair: string,
  config: Record<string, any>
): Signal {
  switch (strategy) {
    case "RSI_CROSSOVER":
      return rsiCrossoverSignal(candles, pair, config as any);
    case "EMA_CROSSOVER":
      return emaCrossoverSignal(candles, pair, config as any);
    case "BREAKOUT":
      return breakoutSignal(candles, pair, config as any);
    case "GRID_BOT":
    case "DCA_BOT":
      // These operate on schedule, not signals
      return {
        direction: "HOLD",
        confidence: 0,
        strategy,
        pair,
        indicators: {},
        reason: "Schedule-based strategy",
      };
    default:
      return {
        direction: "HOLD",
        confidence: 0,
        strategy: "UNKNOWN",
        pair,
        indicators: {},
        reason: "Unknown strategy",
      };
  }
}
