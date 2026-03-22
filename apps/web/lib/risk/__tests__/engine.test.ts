import { describe, it, expect } from "vitest";
import {
  preTradeCheck,
  shouldTriggerStopLoss,
  shouldTriggerTakeProfit,
  calculateStopLossPrice,
  calculateTakeProfitPrice,
  calculateTrailingStop,
  calculateUnrealizedPnl,
  globalCircuitBreaker,
  isAnomalousOrder,
} from "../engine";
import type { PositionState } from "../engine";

const defaultRiskConfig = {
  stopLossPct: 5,
  takeProfitPct: 15,
  maxPositionSizePct: 10,
  maxDailyLossPct: 5,
  trailingStop: false,
  cooldownMinutes: 5,
};

describe("preTradeCheck", () => {
  it("allows trade within all limits", () => {
    const result = preTradeCheck(
      defaultRiskConfig,
      500, // $500 position
      10000, // $10k capital (5% position)
      { totalPnl: 0, capitalBase: 10000 },
      undefined,
      true,
      false
    );
    expect(result.allowed).toBe(true);
  });

  it("blocks trade exceeding position size limit", () => {
    const result = preTradeCheck(
      defaultRiskConfig,
      2000, // $2000 position = 20% of $10k
      10000,
      { totalPnl: 0, capitalBase: 10000 },
      undefined,
      true,
      false
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Position size");
  });

  it("blocks trade when daily loss limit is hit", () => {
    const result = preTradeCheck(
      defaultRiskConfig,
      500,
      10000,
      { totalPnl: -600, capitalBase: 10000 }, // -6% daily loss
      undefined,
      true,
      false
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Daily loss");
  });

  it("blocks live trading without 2FA", () => {
    const result = preTradeCheck(
      defaultRiskConfig,
      500,
      10000,
      { totalPnl: 0, capitalBase: 10000 },
      undefined,
      false, // no 2FA
      true   // live trading
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("2FA");
  });

  it("allows paper trading without 2FA", () => {
    const result = preTradeCheck(
      defaultRiskConfig,
      500,
      10000,
      { totalPnl: 0, capitalBase: 10000 },
      undefined,
      false, // no 2FA
      false  // paper trading
    );
    expect(result.allowed).toBe(true);
  });

  it("blocks trade during cooldown period", () => {
    const lastTrade = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
    const result = preTradeCheck(
      defaultRiskConfig, // 5 min cooldown
      500,
      10000,
      { totalPnl: 0, capitalBase: 10000 },
      lastTrade,
      true,
      false
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Cooldown");
  });

  it("allows trade after cooldown expires", () => {
    const lastTrade = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const result = preTradeCheck(
      defaultRiskConfig, // 5 min cooldown
      500,
      10000,
      { totalPnl: 0, capitalBase: 10000 },
      lastTrade,
      true,
      false
    );
    expect(result.allowed).toBe(true);
  });

  // Edge cases
  it("handles zero capital gracefully", () => {
    expect(() =>
      preTradeCheck(defaultRiskConfig, 100, 0, { totalPnl: 0, capitalBase: 0 })
    ).not.toThrow();
  });

  it("handles negative P&L values", () => {
    const result = preTradeCheck(
      defaultRiskConfig,
      500,
      10000,
      { totalPnl: -10000, capitalBase: 10000 }, // -100% loss
      undefined,
      true,
      false
    );
    expect(result.allowed).toBe(false);
  });
});

describe("Stop Loss", () => {
  it("triggers stop loss for long position below threshold", () => {
    const position: PositionState = {
      pair: "BTC/USDT",
      entryPrice: 100,
      currentPrice: 94, // -6% (below 5% stop loss)
      quantity: 1,
      side: "LONG",
    };
    expect(shouldTriggerStopLoss(position, defaultRiskConfig)).toBe(true);
  });

  it("does not trigger stop loss when price is within range", () => {
    const position: PositionState = {
      pair: "BTC/USDT",
      entryPrice: 100,
      currentPrice: 97, // -3% (within 5% stop loss)
      quantity: 1,
      side: "LONG",
    };
    expect(shouldTriggerStopLoss(position, defaultRiskConfig)).toBe(false);
  });

  it("triggers stop loss for short position above threshold", () => {
    const position: PositionState = {
      pair: "BTC/USDT",
      entryPrice: 100,
      currentPrice: 106, // +6% (above 5% stop loss for short)
      quantity: 1,
      side: "SHORT",
    };
    expect(shouldTriggerStopLoss(position, defaultRiskConfig)).toBe(true);
  });

  it("uses custom stop loss price when provided", () => {
    const position: PositionState = {
      pair: "BTC/USDT",
      entryPrice: 100,
      currentPrice: 89,
      quantity: 1,
      side: "LONG",
      stopLoss: 90, // Custom stop at $90
    };
    expect(shouldTriggerStopLoss(position, defaultRiskConfig)).toBe(true);
  });
});

describe("Take Profit", () => {
  it("triggers take profit for long position above threshold", () => {
    const position: PositionState = {
      pair: "BTC/USDT",
      entryPrice: 100,
      currentPrice: 116, // +16% (above 15% take profit)
      quantity: 1,
      side: "LONG",
    };
    expect(shouldTriggerTakeProfit(position, defaultRiskConfig)).toBe(true);
  });

  it("does not trigger take profit when below threshold", () => {
    const position: PositionState = {
      pair: "BTC/USDT",
      entryPrice: 100,
      currentPrice: 110, // +10% (below 15% take profit)
      quantity: 1,
      side: "LONG",
    };
    expect(shouldTriggerTakeProfit(position, defaultRiskConfig)).toBe(false);
  });

  it("returns false when no take profit configured", () => {
    const position: PositionState = {
      pair: "BTC/USDT",
      entryPrice: 100,
      currentPrice: 200,
      quantity: 1,
      side: "LONG",
    };
    const noTpConfig = { ...defaultRiskConfig, takeProfitPct: undefined };
    expect(shouldTriggerTakeProfit(position, noTpConfig as any)).toBe(false);
  });
});

describe("Price Calculations", () => {
  it("calculates stop loss price for LONG correctly", () => {
    expect(calculateStopLossPrice(100, "LONG", 5)).toBeCloseTo(95);
    expect(calculateStopLossPrice(100, "LONG", 10)).toBeCloseTo(90);
  });

  it("calculates stop loss price for SHORT correctly", () => {
    expect(calculateStopLossPrice(100, "SHORT", 5)).toBeCloseTo(105);
  });

  it("calculates take profit price for LONG correctly", () => {
    expect(calculateTakeProfitPrice(100, "LONG", 15)).toBeCloseTo(115);
  });

  it("calculates take profit price for SHORT correctly", () => {
    expect(calculateTakeProfitPrice(100, "SHORT", 15)).toBeCloseTo(85);
  });

  it("calculates trailing stop for LONG", () => {
    const trailingStop = calculateTrailingStop(100, 120, "LONG", 5);
    expect(trailingStop).toBeCloseTo(114); // 120 * 0.95
  });

  it("calculates trailing stop for SHORT", () => {
    const trailingStop = calculateTrailingStop(100, 80, "SHORT", 5);
    expect(trailingStop).toBeCloseTo(84); // 80 * 1.05
  });
});

describe("Unrealized P&L", () => {
  it("calculates positive P&L for LONG", () => {
    expect(calculateUnrealizedPnl(100, 110, 2, "LONG")).toBeCloseTo(20);
  });

  it("calculates negative P&L for LONG", () => {
    expect(calculateUnrealizedPnl(100, 90, 2, "LONG")).toBeCloseTo(-20);
  });

  it("calculates positive P&L for SHORT", () => {
    expect(calculateUnrealizedPnl(100, 90, 2, "SHORT")).toBeCloseTo(20);
  });

  it("calculates negative P&L for SHORT", () => {
    expect(calculateUnrealizedPnl(100, 110, 2, "SHORT")).toBeCloseTo(-20);
  });

  it("handles zero quantity", () => {
    expect(calculateUnrealizedPnl(100, 110, 0, "LONG")).toBeCloseTo(0);
  });
});

describe("Global Circuit Breaker", () => {
  it("triggers when portfolio drops more than 15%", () => {
    const result = globalCircuitBreaker(8000, 10000); // -20%
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain("dropped");
  });

  it("does not trigger for small losses", () => {
    const result = globalCircuitBreaker(9500, 10000); // -5%
    expect(result.triggered).toBe(false);
  });

  it("does not trigger when portfolio is up", () => {
    const result = globalCircuitBreaker(11000, 10000); // +10%
    expect(result.triggered).toBe(false);
  });

  it("handles zero previous value", () => {
    const result = globalCircuitBreaker(5000, 0);
    expect(result.triggered).toBe(false);
  });

  it("handles negative portfolio value", () => {
    const result = globalCircuitBreaker(-1000, 10000);
    expect(result.triggered).toBe(true);
  });
});

describe("Anomaly Detection", () => {
  it("detects anomalously large orders", () => {
    expect(isAnomalousOrder(50000, 500, 10)).toBe(true); // 100x
  });

  it("allows normal-sized orders", () => {
    expect(isAnomalousOrder(1000, 500, 10)).toBe(false); // 2x
  });

  it("handles zero average gracefully", () => {
    expect(isAnomalousOrder(1000, 0, 10)).toBe(false);
  });

  it("handles exact threshold boundary", () => {
    expect(isAnomalousOrder(5000, 500, 10)).toBe(false); // Exactly 10x, not >
  });

  it("detects just above threshold", () => {
    expect(isAnomalousOrder(5001, 500, 10)).toBe(true); // Just over 10x
  });
});
