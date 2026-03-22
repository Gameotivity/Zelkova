import { fetchCandles } from "../executors/hl-data";
import type { Candle } from "../executors/hl-data";
import type { Signal } from "../engine/types";

/** Simple Moving Average */
function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    const slice = data.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

/** Exponential Moving Average */
function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const mult = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { result.push(data[0]); }
    else if (i < period) { result.push(data.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1)); }
    else if (i === period) { result.push(data.slice(0, period + 1).reduce((a, b) => a + b, 0) / (period + 1)); }
    else { result.push((data[i] - result[i - 1]) * mult + result[i - 1]); }
  }
  return result;
}

/** RSI */
function rsi(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);

  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i + 1] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/** RSI Crossover strategy */
export async function runRSICrossover(
  coin: string,
  pair: string,
  config: { rsiPeriod: number; oversoldThreshold: number; overboughtThreshold: number; timeframe: string },
): Promise<Signal> {
  const candles = await fetchCandles(coin, config.timeframe, 100);
  const closes = candles.map((c) => c.close);
  const rsiValues = rsi(closes, config.rsiPeriod);

  const current = rsiValues[rsiValues.length - 1];
  const prev = rsiValues[rsiValues.length - 2];

  let direction: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 0;
  let reason = `RSI: ${current?.toFixed(1)} (neutral)`;

  if (!isNaN(current) && !isNaN(prev)) {
    if (current <= config.oversoldThreshold && prev > config.oversoldThreshold) {
      direction = "BUY";
      confidence = Math.min(90, 50 + (config.oversoldThreshold - current) * 2);
      reason = `RSI crossed below oversold: ${current.toFixed(1)}`;
    } else if (current >= config.overboughtThreshold && prev < config.overboughtThreshold) {
      direction = "SELL";
      confidence = Math.min(90, 50 + (current - config.overboughtThreshold) * 2);
      reason = `RSI crossed above overbought: ${current.toFixed(1)}`;
    }
  }

  return { direction, confidence, strategy: "RSI_CROSSOVER", pair, indicators: { rsi: current, prevRsi: prev }, reason };
}

/** EMA Crossover strategy */
export async function runEMACrossover(
  coin: string,
  pair: string,
  config: { fastEma: number; slowEma: number; timeframe: string; confirmationCandles: number },
): Promise<Signal> {
  const candles = await fetchCandles(coin, config.timeframe, 100);
  const closes = candles.map((c) => c.close);
  const fastEMA = ema(closes, config.fastEma);
  const slowEMA = ema(closes, config.slowEma);

  const len = closes.length;
  const fastNow = fastEMA[len - 1];
  const slowNow = slowEMA[len - 1];
  const fastPrev = fastEMA[len - 2];
  const slowPrev = slowEMA[len - 2];

  let direction: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 0;
  let reason = "EMAs not crossed";

  if (fastNow > slowNow && fastPrev <= slowPrev) {
    direction = "BUY";
    const spread = ((fastNow - slowNow) / slowNow) * 100;
    confidence = Math.min(85, 50 + spread * 10);
    reason = `Golden cross: EMA${config.fastEma} > EMA${config.slowEma}`;
  } else if (fastNow < slowNow && fastPrev >= slowPrev) {
    direction = "SELL";
    const spread = ((slowNow - fastNow) / slowNow) * 100;
    confidence = Math.min(85, 50 + spread * 10);
    reason = `Death cross: EMA${config.fastEma} < EMA${config.slowEma}`;
  }

  return { direction, confidence, strategy: "EMA_CROSSOVER", pair, indicators: { fastEma: fastNow, slowEma: slowNow }, reason };
}

/** Breakout strategy */
export async function runBreakout(
  coin: string,
  pair: string,
  config: { lookbackPeriod: number; volumeMultiplier: number; breakoutThreshold: number; timeframe: string },
): Promise<Signal> {
  const candles = await fetchCandles(coin, config.timeframe || "1h", 100);
  const len = candles.length;

  if (len < config.lookbackPeriod + 1) {
    return { direction: "HOLD", confidence: 0, strategy: "BREAKOUT", pair, indicators: {}, reason: "Insufficient data" };
  }

  const lookback = candles.slice(len - config.lookbackPeriod - 1, len - 1);
  const current = candles[len - 1];
  const highestHigh = Math.max(...lookback.map((c) => c.high));
  const lowestLow = Math.min(...lookback.map((c) => c.low));
  const avgVolume = lookback.reduce((s, c) => s + c.volume, 0) / lookback.length;

  let direction: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 0;
  let reason = "No breakout detected";

  const volumeSpike = current.volume > avgVolume * config.volumeMultiplier;
  const breakoutPct = ((current.close - highestHigh) / highestHigh) * 100;

  if (current.close > highestHigh && breakoutPct >= config.breakoutThreshold && volumeSpike) {
    direction = "BUY";
    confidence = Math.min(90, 60 + breakoutPct * 5);
    reason = `Breakout above ${highestHigh.toFixed(2)} (+${breakoutPct.toFixed(2)}%) with ${(current.volume / avgVolume).toFixed(1)}x volume`;
  }

  return { direction, confidence, strategy: "BREAKOUT", pair, indicators: { highestHigh, lowestLow, currentClose: current.close, volumeRatio: current.volume / avgVolume }, reason };
}

/** Route to correct strategy runner */
export async function generateLiveSignal(
  strategy: string,
  coin: string,
  pair: string,
  config: Record<string, unknown>,
): Promise<Signal> {
  switch (strategy) {
    case "RSI_CROSSOVER":
      return runRSICrossover(coin, pair, config as Parameters<typeof runRSICrossover>[2]);
    case "EMA_CROSSOVER":
      return runEMACrossover(coin, pair, config as Parameters<typeof runEMACrossover>[2]);
    case "BREAKOUT":
      return runBreakout(coin, pair, config as Parameters<typeof runBreakout>[2]);
    default:
      return { direction: "HOLD", confidence: 0, strategy, pair, indicators: {}, reason: `Strategy ${strategy} not implemented` };
  }
}
