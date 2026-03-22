// ---------------------------------------------------------------------------
// Technical indicator calculations — pure functions, no side effects
// All return arrays same length as input, padded with NaN for warmup period
// ---------------------------------------------------------------------------

/** Simple Moving Average */
export function sma(data: number[], period: number): number[] {
  const result = new Array<number>(data.length).fill(NaN);
  if (period > data.length || period < 1) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result[i] = sum / period;
  }
  return result;
}

/** Exponential Moving Average */
export function ema(data: number[], period: number): number[] {
  const result = new Array<number>(data.length).fill(NaN);
  if (period > data.length || period < 1) return result;

  const multiplier = 2 / (period + 1);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    result[i] = (data[i] - result[i - 1]) * multiplier + result[i - 1];
  }
  return result;
}

/** Relative Strength Index */
export function rsi(data: number[], period: number): number[] {
  const result = new Array<number>(data.length).fill(NaN);
  if (period >= data.length || period < 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/** MACD — returns { macdLine, signalLine, histogram } */
export interface MACDResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

export function macd(
  data: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): MACDResult {
  const fastEma = ema(data, fastPeriod);
  const slowEma = ema(data, slowPeriod);
  const len = data.length;

  const macdLine = new Array<number>(len).fill(NaN);
  for (let i = 0; i < len; i++) {
    if (!isNaN(fastEma[i]) && !isNaN(slowEma[i])) {
      macdLine[i] = fastEma[i] - slowEma[i];
    }
  }

  // Find first non-NaN in macdLine for signal EMA seed
  const validMacd = macdLine.filter((v) => !isNaN(v));
  const signalEma = ema(validMacd, signalPeriod);

  const signalLine = new Array<number>(len).fill(NaN);
  const histogram = new Array<number>(len).fill(NaN);
  let validIdx = 0;
  for (let i = 0; i < len; i++) {
    if (!isNaN(macdLine[i])) {
      if (validIdx < signalEma.length && !isNaN(signalEma[validIdx])) {
        signalLine[i] = signalEma[validIdx];
        histogram[i] = macdLine[i] - signalEma[validIdx];
      }
      validIdx++;
    }
  }

  return { macdLine, signalLine, histogram };
}

/** Bollinger Bands — returns { upper, middle, lower } */
export interface BBResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function bollingerBands(
  data: number[],
  period: number,
  stdDev: number
): BBResult {
  const middle = sma(data, period);
  const len = data.length;
  const upper = new Array<number>(len).fill(NaN);
  const lower = new Array<number>(len).fill(NaN);

  for (let i = period - 1; i < len; i++) {
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j] - middle[i];
      sumSq += diff * diff;
    }
    const sd = Math.sqrt(sumSq / period);
    upper[i] = middle[i] + stdDev * sd;
    lower[i] = middle[i] - stdDev * sd;
  }

  return { upper, middle, lower };
}

/** Average True Range */
export function atr(
  high: number[],
  low: number[],
  close: number[],
  period: number
): number[] {
  const len = high.length;
  const result = new Array<number>(len).fill(NaN);
  if (period >= len || period < 1) return result;

  const tr = new Array<number>(len).fill(0);
  tr[0] = high[0] - low[0];
  for (let i = 1; i < len; i++) {
    tr[i] = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  result[period - 1] = sum / period;

  for (let i = period; i < len; i++) {
    result[i] = (result[i - 1] * (period - 1) + tr[i]) / period;
  }
  return result;
}

/** Volume Weighted Average Price */
export function vwap(
  high: number[],
  low: number[],
  close: number[],
  volume: number[]
): number[] {
  const len = high.length;
  const result = new Array<number>(len).fill(NaN);
  let cumTPV = 0;
  let cumVol = 0;

  for (let i = 0; i < len; i++) {
    const tp = (high[i] + low[i] + close[i]) / 3;
    cumTPV += tp * volume[i];
    cumVol += volume[i];
    result[i] = cumVol === 0 ? NaN : cumTPV / cumVol;
  }
  return result;
}

/** On-Balance Volume */
export function obv(close: number[], volume: number[]): number[] {
  const len = close.length;
  const result = new Array<number>(len).fill(0);
  result[0] = volume[0];

  for (let i = 1; i < len; i++) {
    if (close[i] > close[i - 1]) result[i] = result[i - 1] + volume[i];
    else if (close[i] < close[i - 1]) result[i] = result[i - 1] - volume[i];
    else result[i] = result[i - 1];
  }
  return result;
}

// Re-export oscillator indicators from split module
export { adx, stochastic, type StochResult } from "./indicators-oscillators";
