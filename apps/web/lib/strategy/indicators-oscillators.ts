// ---------------------------------------------------------------------------
// Oscillator-type indicators — ADX, Stochastic
// Split from indicators.ts to stay under 300-line limit
// ---------------------------------------------------------------------------

import { sma } from "./indicators";

/** Average Directional Index */
export function adx(
  high: number[],
  low: number[],
  close: number[],
  period: number
): number[] {
  const len = high.length;
  const result = new Array<number>(len).fill(NaN);
  if (2 * period >= len || period < 1) return result;

  const trArr = new Array<number>(len).fill(0);
  const plusDM = new Array<number>(len).fill(0);
  const minusDM = new Array<number>(len).fill(0);

  for (let i = 1; i < len; i++) {
    trArr[i] = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  let smoothTR = 0;
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;
  for (let i = 1; i <= period; i++) {
    smoothTR += trArr[i];
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
  }

  const dx = new Array<number>(len).fill(NaN);
  for (let i = period; i < len; i++) {
    if (i > period) {
      smoothTR = smoothTR - smoothTR / period + trArr[i];
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    }
    const plusDI = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
    const minusDI = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
    const diSum = plusDI + minusDI;
    dx[i] = diSum === 0 ? 0 : (Math.abs(plusDI - minusDI) / diSum) * 100;
  }

  // Smooth DX into ADX
  let adxSum = 0;
  for (let i = period; i < 2 * period; i++) {
    adxSum += isNaN(dx[i]) ? 0 : dx[i];
  }
  result[2 * period - 1] = adxSum / period;

  for (let i = 2 * period; i < len; i++) {
    const dxVal = isNaN(dx[i]) ? 0 : dx[i];
    result[i] = (result[i - 1] * (period - 1) + dxVal) / period;
  }
  return result;
}

/** Stochastic Oscillator — returns { k, d } */
export interface StochResult {
  k: number[];
  d: number[];
}

export function stochastic(
  high: number[],
  low: number[],
  close: number[],
  kPeriod: number,
  dPeriod: number
): StochResult {
  const len = high.length;
  const k = new Array<number>(len).fill(NaN);

  for (let i = kPeriod - 1; i < len; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (high[j] > highest) highest = high[j];
      if (low[j] < lowest) lowest = low[j];
    }
    const range = highest - lowest;
    k[i] = range === 0 ? 50 : ((close[i] - lowest) / range) * 100;
  }

  const d = sma(
    k.map((v) => (isNaN(v) ? 0 : v)),
    dPeriod
  );
  // Re-NaN the warmup for d
  for (let i = 0; i < kPeriod - 1 + dPeriod - 1; i++) {
    d[i] = NaN;
  }

  return { k, d };
}
