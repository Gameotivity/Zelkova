import type { RiskConfig } from "@zelkora/shared";
import { RISK_LIMITS } from "@zelkora/shared";

export interface PreTradeCheck {
  allowed: boolean;
  reason?: string;
}

export interface PositionState {
  pair: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  side: "LONG" | "SHORT";
  stopLoss?: number;
  takeProfit?: number;
}

export interface DailyPnL {
  totalPnl: number;
  capitalBase: number;
}

/** Pre-trade risk check — must pass before executing any trade */
export function preTradeCheck(
  riskConfig: RiskConfig,
  positionSizeUsd: number,
  totalCapitalUsd: number,
  dailyPnl: DailyPnL,
  lastTradeTime?: Date,
  is2FAVerified = false,
  isLive = false
): PreTradeCheck {
  // Live trading requires 2FA
  if (isLive && !is2FAVerified) {
    return { allowed: false, reason: "2FA verification required for live trading" };
  }

  // Check position size limit
  const positionPct = (positionSizeUsd / totalCapitalUsd) * 100;
  if (positionPct > riskConfig.maxPositionSizePct) {
    return {
      allowed: false,
      reason: `Position size ${positionPct.toFixed(1)}% exceeds max ${riskConfig.maxPositionSizePct}%`,
    };
  }

  // Check daily loss limit
  const dailyLossPct = (Math.abs(Math.min(dailyPnl.totalPnl, 0)) / dailyPnl.capitalBase) * 100;
  if (dailyLossPct >= riskConfig.maxDailyLossPct) {
    return {
      allowed: false,
      reason: `Daily loss ${dailyLossPct.toFixed(1)}% exceeds max ${riskConfig.maxDailyLossPct}%`,
    };
  }

  // Check cooldown
  if (lastTradeTime && riskConfig.cooldownMinutes > 0) {
    const cooldownMs = riskConfig.cooldownMinutes * 60 * 1000;
    const elapsed = Date.now() - lastTradeTime.getTime();
    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 60000);
      return {
        allowed: false,
        reason: `Cooldown active. ${remaining} minute(s) remaining`,
      };
    }
  }

  return { allowed: true };
}

/** Check if stop-loss should trigger */
export function shouldTriggerStopLoss(
  position: PositionState,
  riskConfig: RiskConfig
): boolean {
  const stopLossPrice = position.stopLoss || calculateStopLossPrice(
    position.entryPrice,
    position.side,
    riskConfig.stopLossPct
  );

  if (position.side === "LONG") {
    return position.currentPrice <= stopLossPrice;
  } else {
    return position.currentPrice >= stopLossPrice;
  }
}

/** Check if take-profit should trigger */
export function shouldTriggerTakeProfit(
  position: PositionState,
  riskConfig: RiskConfig
): boolean {
  if (!riskConfig.takeProfitPct) return false;

  const takeProfitPrice = position.takeProfit || calculateTakeProfitPrice(
    position.entryPrice,
    position.side,
    riskConfig.takeProfitPct
  );

  if (position.side === "LONG") {
    return position.currentPrice >= takeProfitPrice;
  } else {
    return position.currentPrice <= takeProfitPrice;
  }
}

/** Calculate stop-loss price */
export function calculateStopLossPrice(
  entryPrice: number,
  side: "LONG" | "SHORT",
  stopLossPct: number
): number {
  if (side === "LONG") {
    return entryPrice * (1 - stopLossPct / 100);
  }
  return entryPrice * (1 + stopLossPct / 100);
}

/** Calculate take-profit price */
export function calculateTakeProfitPrice(
  entryPrice: number,
  side: "LONG" | "SHORT",
  takeProfitPct: number
): number {
  if (side === "LONG") {
    return entryPrice * (1 + takeProfitPct / 100);
  }
  return entryPrice * (1 - takeProfitPct / 100);
}

/** Calculate trailing stop price */
export function calculateTrailingStop(
  entryPrice: number,
  highestPrice: number,
  side: "LONG" | "SHORT",
  trailingPct: number
): number {
  if (side === "LONG") {
    return highestPrice * (1 - trailingPct / 100);
  }
  // For short, track lowest price
  return highestPrice * (1 + trailingPct / 100);
}

/** Calculate unrealized P&L */
export function calculateUnrealizedPnl(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  side: "LONG" | "SHORT"
): number {
  if (side === "LONG") {
    return (currentPrice - entryPrice) * quantity;
  }
  return (entryPrice - currentPrice) * quantity;
}

/** Global circuit breaker — check if all agents should be paused */
export function globalCircuitBreaker(
  totalPortfolioValue: number,
  portfolioValue24hAgo: number
): { triggered: boolean; reason?: string } {
  if (portfolioValue24hAgo <= 0) return { triggered: false };

  const drawdownPct =
    ((portfolioValue24hAgo - totalPortfolioValue) / portfolioValue24hAgo) * 100;

  if (drawdownPct >= RISK_LIMITS.GLOBAL_PORTFOLIO_STOP_PCT) {
    return {
      triggered: true,
      reason: `Portfolio dropped ${drawdownPct.toFixed(1)}% in 24h (limit: ${RISK_LIMITS.GLOBAL_PORTFOLIO_STOP_PCT}%)`,
    };
  }

  return { triggered: false };
}

/** Anomaly detection — block orders that are abnormally large */
export function isAnomalousOrder(
  orderSizeUsd: number,
  avgOrderSizeUsd: number,
  multiplierThreshold = 10
): boolean {
  if (avgOrderSizeUsd <= 0) return false;
  return orderSizeUsd > avgOrderSizeUsd * multiplierThreshold;
}
