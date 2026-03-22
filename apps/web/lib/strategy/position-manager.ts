// ---------------------------------------------------------------------------
// Position management — opening, closing, and exit condition checks
// ---------------------------------------------------------------------------

import type { CandleData } from "@/lib/market/live-prices";
import type { BacktestConfig, TradeResult } from "./types";

// ---------------------------------------------------------------------------
// Open position state
// ---------------------------------------------------------------------------

export interface OpenPosition {
  side: "LONG" | "SHORT";
  entryBar: number;
  entryPrice: number;
  quantity: number;
  trailingStopPrice: number | null;
}

// ---------------------------------------------------------------------------
// Open a new position
// ---------------------------------------------------------------------------

export function openPosition(
  side: "LONG" | "SHORT",
  bar: number,
  price: number,
  capital: number,
  config: BacktestConfig,
  feeMult: number,
  slippageMult: number
): OpenPosition {
  const slippedPrice =
    side === "LONG" ? price * (1 + slippageMult) : price * (1 - slippageMult);
  const allocatedCapital = capital * (config.positionSizePct / 100);
  const entryFee = allocatedCapital * feeMult;
  const quantity = (allocatedCapital - entryFee) / slippedPrice;

  const trailingStopPrice = config.strategy.trailingStopPct
    ? side === "LONG"
      ? slippedPrice * (1 - config.strategy.trailingStopPct / 100)
      : slippedPrice * (1 + config.strategy.trailingStopPct / 100)
    : null;

  return {
    side,
    entryBar: bar,
    entryPrice: slippedPrice,
    quantity,
    trailingStopPrice,
  };
}

// ---------------------------------------------------------------------------
// Build a trade result from a position exit
// ---------------------------------------------------------------------------

function buildTrade(
  pos: OpenPosition,
  candle: CandleData,
  exitPrice: number,
  reason: TradeResult["exitReason"],
  feeMult: number,
  slippageMult: number
): TradeResult {
  const slippedExit =
    pos.side === "LONG"
      ? exitPrice * (1 - slippageMult)
      : exitPrice * (1 + slippageMult);
  const exitValue = pos.quantity * slippedExit;
  const entryValue = pos.quantity * pos.entryPrice;
  const fees = (entryValue + exitValue) * feeMult;
  const rawPnl =
    pos.side === "LONG"
      ? (slippedExit - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - slippedExit) * pos.quantity;

  return {
    entryTime: pos.entryBar,
    exitTime: candle.openTime,
    side: pos.side,
    entryPrice: pos.entryPrice,
    exitPrice: slippedExit,
    quantity: pos.quantity,
    pnl: rawPnl,
    pnlPct: entryValue === 0 ? 0 : (rawPnl / entryValue) * 100,
    fees,
    exitReason: reason,
  };
}

// ---------------------------------------------------------------------------
// Check stop-loss, take-profit, and trailing stop conditions
// ---------------------------------------------------------------------------

export function checkExitConditions(
  pos: OpenPosition,
  candle: CandleData,
  config: BacktestConfig,
  feeMult: number,
  slippageMult: number
): TradeResult | null {
  const { stopLossPct, takeProfitPct } = config.strategy;

  if (pos.side === "LONG") {
    const slPrice = pos.entryPrice * (1 - stopLossPct / 100);
    const tpPrice = pos.entryPrice * (1 + takeProfitPct / 100);

    if (candle.low <= slPrice) {
      return buildTrade(pos, candle, slPrice, "STOP_LOSS", feeMult, slippageMult);
    }
    if (candle.high >= tpPrice) {
      return buildTrade(pos, candle, tpPrice, "TAKE_PROFIT", feeMult, slippageMult);
    }
    if (pos.trailingStopPrice !== null && candle.low <= pos.trailingStopPrice) {
      return buildTrade(pos, candle, pos.trailingStopPrice, "TRAILING_STOP", feeMult, slippageMult);
    }
  } else {
    const slPrice = pos.entryPrice * (1 + stopLossPct / 100);
    const tpPrice = pos.entryPrice * (1 - takeProfitPct / 100);

    if (candle.high >= slPrice) {
      return buildTrade(pos, candle, slPrice, "STOP_LOSS", feeMult, slippageMult);
    }
    if (candle.low <= tpPrice) {
      return buildTrade(pos, candle, tpPrice, "TAKE_PROFIT", feeMult, slippageMult);
    }
    if (pos.trailingStopPrice !== null && candle.high >= pos.trailingStopPrice) {
      return buildTrade(pos, candle, pos.trailingStopPrice, "TRAILING_STOP", feeMult, slippageMult);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Close position at a given price (signal-based exit)
// ---------------------------------------------------------------------------

export function closePosition(
  pos: OpenPosition,
  price: number,
  reason: TradeResult["exitReason"],
  feeMult: number,
  slippageMult: number,
  candle: CandleData
): TradeResult {
  return buildTrade(pos, candle, price, reason, feeMult, slippageMult);
}

// ---------------------------------------------------------------------------
// Calculate unrealized PnL
// ---------------------------------------------------------------------------

export function getUnrealizedPnl(
  pos: OpenPosition,
  currentPrice: number
): number {
  return pos.side === "LONG"
    ? (currentPrice - pos.entryPrice) * pos.quantity
    : (pos.entryPrice - currentPrice) * pos.quantity;
}

// ---------------------------------------------------------------------------
// Update trailing stop price
// ---------------------------------------------------------------------------

export function updateTrailingStop(
  pos: OpenPosition,
  candle: CandleData,
  trailingPct: number
): number {
  const current = pos.trailingStopPrice ?? 0;
  if (pos.side === "LONG") {
    const newStop = candle.high * (1 - trailingPct / 100);
    return Math.max(current, newStop);
  }
  const newStop = candle.low * (1 + trailingPct / 100);
  return current === 0 ? newStop : Math.min(current, newStop);
}
