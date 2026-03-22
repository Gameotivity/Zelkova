import { describe, it, expect } from "vitest";
import { sma, ema, rsi, macd, bollingerBands, vwap, atr } from "../indicators";
import type { Candle } from "../indicators";

describe("SMA (Simple Moving Average)", () => {
  it("calculates SMA correctly for a basic series", () => {
    const data = [10, 20, 30, 40, 50];
    const result = sma(data, 3);
    expect(result[2]).toBeCloseTo(20);
    expect(result[3]).toBeCloseTo(30);
    expect(result[4]).toBeCloseTo(40);
  });

  it("returns NaN for values before the period", () => {
    const data = [10, 20, 30];
    const result = sma(data, 3);
    expect(result[0]).toBeNaN();
    expect(result[1]).toBeNaN();
    expect(result[2]).toBeCloseTo(20);
  });

  it("handles single-element period", () => {
    const data = [5, 10, 15];
    const result = sma(data, 1);
    expect(result[0]).toBeCloseTo(5);
    expect(result[1]).toBeCloseTo(10);
    expect(result[2]).toBeCloseTo(15);
  });

  it("handles all identical values", () => {
    const data = [42, 42, 42, 42, 42];
    const result = sma(data, 3);
    expect(result[2]).toBeCloseTo(42);
    expect(result[4]).toBeCloseTo(42);
  });
});

describe("EMA (Exponential Moving Average)", () => {
  it("calculates EMA with correct weighting", () => {
    const data = [10, 20, 30, 40, 50];
    const result = ema(data, 3);
    expect(result.length).toBe(5);
    // EMA should be closer to recent values
    expect(result[4]).toBeGreaterThan(result[3]);
  });

  it("first EMA value equals the SMA for the period", () => {
    const data = [10, 20, 30, 40, 50];
    const result = ema(data, 3);
    // SMA of first 3: (10+20+30)/3 = 20
    expect(result[2]).toBeCloseTo(20);
  });

  it("handles negative values", () => {
    const data = [-10, -5, 0, 5, 10];
    const result = ema(data, 3);
    expect(result.length).toBe(5);
    expect(result[4]).toBeGreaterThan(0);
  });
});

describe("RSI (Relative Strength Index)", () => {
  it("returns values between 0 and 100", () => {
    const closes = [44, 44.25, 44.5, 43.75, 44.5, 44.25, 43.75, 44,
      44.5, 44.25, 43.5, 43.25, 44.25, 44.5, 44.25, 43.75, 44];
    const result = rsi(closes, 14);
    const validValues = result.filter((v) => !isNaN(v));
    for (const v of validValues) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("returns NaN for values before the period", () => {
    const closes = [10, 11, 12, 13, 14];
    const result = rsi(closes, 14);
    expect(result[0]).toBeNaN();
    expect(result[4]).toBeNaN();
  });

  it("returns 100 when all changes are positive (no losses)", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(closes, 14);
    const validValues = result.filter((v) => !isNaN(v));
    expect(validValues[0]).toBe(100);
  });

  it("handles zero price change", () => {
    const closes = Array.from({ length: 20 }, () => 50);
    const result = rsi(closes, 14);
    // No gains, no losses — RSI undefined but should not crash
    expect(result.length).toBe(20);
  });
});

describe("MACD", () => {
  it("returns macd, signal, and histogram arrays of same length", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.3) * 10);
    const result = macd(closes);
    expect(result.macd.length).toBe(50);
    expect(result.signal.length).toBe(50);
    expect(result.histogram.length).toBe(50);
  });

  it("histogram equals macd minus signal", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
    const result = macd(closes);
    for (let i = 0; i < 50; i++) {
      expect(result.histogram[i]).toBeCloseTo(result.macd[i] - result.signal[i]);
    }
  });
});

describe("Bollinger Bands", () => {
  it("middle band equals SMA", () => {
    const closes = [10, 12, 14, 13, 15, 16, 14, 17, 18, 19,
      20, 21, 19, 22, 23, 24, 25, 23, 26, 27];
    const result = bollingerBands(closes, 20);
    const smaResult = sma(closes, 20);
    expect(result.middle[19]).toBeCloseTo(smaResult[19]);
  });

  it("upper band is always above middle, lower always below", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 50 + Math.random() * 10);
    const result = bollingerBands(closes, 20);
    for (let i = 19; i < 30; i++) {
      expect(result.upper[i]).toBeGreaterThan(result.middle[i]);
      expect(result.lower[i]).toBeLessThan(result.middle[i]);
    }
  });

  it("returns NaN before the period", () => {
    const closes = Array.from({ length: 25 }, () => 100);
    const result = bollingerBands(closes, 20);
    expect(result.upper[0]).toBeNaN();
    expect(result.lower[18]).toBeNaN();
  });
});

describe("VWAP", () => {
  it("calculates VWAP correctly", () => {
    const candles: Candle[] = [
      { time: 1, open: 100, high: 110, low: 95, close: 105, volume: 1000 },
      { time: 2, open: 105, high: 115, low: 100, close: 110, volume: 1500 },
    ];
    const result = vwap(candles);
    expect(result.length).toBe(2);
    // First VWAP = typical price = (110 + 95 + 105) / 3 = 103.33
    expect(result[0]).toBeCloseTo(103.33, 1);
  });

  it("handles zero volume gracefully", () => {
    const candles: Candle[] = [
      { time: 1, open: 100, high: 110, low: 90, close: 100, volume: 0 },
    ];
    const result = vwap(candles);
    expect(result[0]).toBeCloseTo(100);
  });
});

describe("ATR (Average True Range)", () => {
  it("returns correct length", () => {
    const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
      time: i,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 1000,
    }));
    const result = atr(candles, 14);
    expect(result.length).toBe(20);
  });

  it("ATR is always non-negative", () => {
    const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100 + Math.sin(i) * 5,
      high: 105 + Math.sin(i) * 5,
      low: 95 + Math.sin(i) * 5,
      close: 100 + Math.sin(i) * 5,
      volume: 1000,
    }));
    const result = atr(candles, 14);
    const validValues = result.filter((v) => !isNaN(v));
    for (const v of validValues) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns NaN for insufficient data", () => {
    const candles: Candle[] = [
      { time: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
    ];
    const result = atr(candles, 14);
    expect(result[0]).toBeNaN();
  });
});
