/** Technical indicator calculations for trading signals */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Simple Moving Average */
export function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

/** Exponential Moving Average */
export function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0]);
    } else if (i < period - 1) {
      // Use SMA for initial values
      const slice = data.slice(0, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / (i + 1));
    } else if (i === period - 1) {
      const slice = data.slice(0, period);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

/** Relative Strength Index */
export function rsi(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i + 1] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i + 1] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

/** MACD */
export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = ema(closes, fastPeriod);
  const slowEMA = ema(closes, slowPeriod);

  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);

  return { macd: macdLine, signal: signalLine, histogram };
}

/** Bollinger Bands */
export function bollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }

    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance =
      slice.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);

    upper.push(mean + stdDev * sd);
    lower.push(mean - stdDev * sd);
  }

  return { upper, middle, lower };
}

/** Volume Weighted Average Price */
export function vwap(candles: Candle[]): number[] {
  const result: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTPV += typicalPrice * c.volume;
    cumulativeVolume += c.volume;
    result.push(cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice);
  }

  return result;
}

/** Average True Range */
export function atr(candles: Candle[], period = 14): number[] {
  const result: number[] = new Array(candles.length).fill(NaN);
  if (candles.length < 2) return result;

  const trueRanges: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trueRanges.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      )
    );
  }

  // First ATR is SMA of true ranges
  if (trueRanges.length >= period) {
    let sum = 0;
    for (let i = 0; i < period; i++) sum += trueRanges[i];
    result[period - 1] = sum / period;

    for (let i = period; i < trueRanges.length; i++) {
      result[i] =
        (result[i - 1] * (period - 1) + trueRanges[i]) / period;
    }
  }

  return result;
}
