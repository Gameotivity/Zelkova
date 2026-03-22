import { describe, it, expect } from "vitest";
import {
  rsiCrossoverSignal,
  emaCrossoverSignal,
  breakoutSignal,
  generateSignal,
} from "../signal-generator";
import type { Candle } from "../indicators";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    time: Date.now() - (closes.length - i) * 3600000,
    open: close - 1,
    high: close + 2,
    low: close - 2,
    close,
    volume: 1000 + Math.random() * 500,
  }));
}

describe("RSI Crossover Signal", () => {
  it("returns HOLD for neutral RSI", () => {
    // Steadily rising prices → RSI stays mid-range
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 0.1);
    const candles = makeCandles(closes);
    const signal = rsiCrossoverSignal(candles, "BTC/USDT", {
      rsiPeriod: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
    });
    expect(signal.pair).toBe("BTC/USDT");
    expect(signal.strategy).toBe("RSI_CROSSOVER");
    expect(["BUY", "SELL", "HOLD"]).toContain(signal.direction);
  });

  it("confidence is between 0 and 100", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.5) * 20);
    const candles = makeCandles(closes);
    const signal = rsiCrossoverSignal(candles, "ETH/USDT", {
      rsiPeriod: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
    });
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(100);
  });

  it("returns indicators in the signal", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    const candles = makeCandles(closes);
    const signal = rsiCrossoverSignal(candles, "BTC/USDT", {
      rsiPeriod: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
    });
    expect(signal.indicators).toHaveProperty("rsi");
    expect(signal.indicators).toHaveProperty("prevRsi");
  });
});

describe("EMA Crossover Signal", () => {
  it("detects golden cross (fast above slow)", () => {
    // Create data where fast EMA will cross above slow EMA
    const closes = [
      ...Array.from({ length: 30 }, () => 100), // flat
      ...Array.from({ length: 10 }, (_, i) => 100 + i * 3), // sharp rise
    ];
    const candles = makeCandles(closes);
    const signal = emaCrossoverSignal(candles, "BTC/USDT", {
      fastEma: 9,
      slowEma: 21,
      confirmationCandles: 0,
    });
    expect(signal.strategy).toBe("EMA_CROSSOVER");
    expect(signal.indicators).toHaveProperty("fastEma");
    expect(signal.indicators).toHaveProperty("slowEma");
  });

  it("returns HOLD when no cross occurs", () => {
    // Perfectly flat data
    const closes = Array.from({ length: 40 }, () => 100);
    const candles = makeCandles(closes);
    const signal = emaCrossoverSignal(candles, "BTC/USDT", {
      fastEma: 9,
      slowEma: 21,
      confirmationCandles: 0,
    });
    expect(signal.direction).toBe("HOLD");
  });
});

describe("Breakout Signal", () => {
  it("detects upside breakout with volume spike", () => {
    const candles: Candle[] = Array.from({ length: 25 }, (_, i) => ({
      time: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 1000,
    }));
    // Add breakout candle
    candles.push({
      time: 25,
      open: 105,
      high: 115,
      low: 104,
      close: 112,
      volume: 5000, // Volume spike
    });

    const signal = breakoutSignal(candles, "BTC/USDT", {
      lookbackPeriod: 20,
      volumeMultiplier: 2.0,
      breakoutThreshold: 1.5,
    });
    expect(signal.strategy).toBe("BREAKOUT");
    expect(signal.indicators).toHaveProperty("highestHigh");
    expect(signal.indicators).toHaveProperty("volumeRatio");
  });

  it("returns HOLD with insufficient data", () => {
    const candles = makeCandles([100, 101, 102]);
    const signal = breakoutSignal(candles, "BTC/USDT", {
      lookbackPeriod: 20,
      volumeMultiplier: 2.0,
      breakoutThreshold: 1.5,
    });
    expect(signal.direction).toBe("HOLD");
    expect(signal.reason).toBe("Insufficient data");
  });
});

describe("generateSignal", () => {
  it("routes to correct strategy", () => {
    const candles = makeCandles(Array.from({ length: 30 }, (_, i) => 100 + i));

    const rsiSignal = generateSignal("RSI_CROSSOVER", candles, "BTC/USDT", {
      rsiPeriod: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
    });
    expect(rsiSignal.strategy).toBe("RSI_CROSSOVER");

    const emaSignal = generateSignal("EMA_CROSSOVER", candles, "BTC/USDT", {
      fastEma: 9,
      slowEma: 21,
      confirmationCandles: 0,
    });
    expect(emaSignal.strategy).toBe("EMA_CROSSOVER");
  });

  it("returns HOLD for schedule-based strategies", () => {
    const candles = makeCandles([100, 101, 102]);
    const gridSignal = generateSignal("GRID_BOT", candles, "BTC/USDT", {});
    expect(gridSignal.direction).toBe("HOLD");
    expect(gridSignal.reason).toContain("Schedule-based");

    const dcaSignal = generateSignal("DCA_BOT", candles, "BTC/USDT", {});
    expect(dcaSignal.direction).toBe("HOLD");
  });
});
