/**
 * Fee Engine — Performance fee calculation and position sizing adjustment.
 *
 * How it works:
 * 1. Track gross P&L per user per period (weekly)
 * 2. Calculate performance fee: Pro = 15% of profits, Elite = 10%
 * 3. Adjust position sizes to embed the fee (user sees net-of-fee P&L)
 * 4. Builder fees (0.05% per trade) collected automatically by Hyperliquid
 *
 * The fee is "embedded" by reducing the effective position size:
 *   - If user allocates $1,000 and fee rate is 15%:
 *   - Effective capital = $1,000 * (1 - 0.15) = $850 trades for the user
 *   - The remaining $150 of any profit flows to the builder via larger builder fee
 *   - In practice: position sized at 85% of user capital (Pro) or 90% (Elite)
 */

import type { SubscriptionTier } from "@zelkora/shared";

// Fee rates by tier
const FEE_RATES: Record<string, number> = {
  FREE: 0,
  PRO: 15,
  ELITE: 10,
};

// Builder fee in basis points (0.05% = 5 bps)
const BUILDER_FEE_BPS = 5;

export interface FeeConfig {
  tier: string;
  feeRatePct: number;
  positionSizeMultiplier: number; // 1.0 for Free, 0.85 for Pro, 0.90 for Elite
  builderFeeBps: number;
}

/**
 * Get fee configuration for a subscription tier.
 */
export function getFeeConfig(tier: string): FeeConfig {
  const rate = FEE_RATES[tier] ?? FEE_RATES.PRO;
  return {
    tier,
    feeRatePct: rate,
    positionSizeMultiplier: rate > 0 ? (100 - rate) / 100 : 1.0,
    builderFeeBps: BUILDER_FEE_BPS,
  };
}

/**
 * Calculate fee-adjusted position size.
 *
 * The performance fee is embedded by reducing position size.
 * This means any profits are automatically split between user and platform.
 *
 * Example (Pro tier, 15% fee):
 *   User capital: $10,000
 *   Effective position capital: $8,500 (85%)
 *   If trade gains 5%: user makes $425, platform portion is $75
 *   User sees: $425 profit (already net of fee)
 */
export function adjustPositionForFee(
  capitalUsd: number,
  tier: string,
): { effectiveCapital: number; feeReserve: number; feeConfig: FeeConfig } {
  const config = getFeeConfig(tier);
  const effectiveCapital = capitalUsd * config.positionSizeMultiplier;
  const feeReserve = capitalUsd - effectiveCapital;

  return {
    effectiveCapital,
    feeReserve,
    feeConfig: config,
  };
}

/**
 * Calculate performance fee from a completed trade's P&L.
 *
 * Only charges fee on profitable trades (net positive P&L).
 * Losses carry forward — no fee charged until cumulative P&L is positive.
 */
export function calculatePerformanceFee(
  grossPnl: number,
  tier: string,
  cumulativePnlBeforeTrade: number = 0,
): { feeAmount: number; netPnl: number; newCumulativePnl: number } {
  const config = getFeeConfig(tier);
  const newCumulativePnl = cumulativePnlBeforeTrade + grossPnl;

  // Only charge fee if cumulative P&L is positive (high-water mark)
  if (newCumulativePnl <= 0 || config.feeRatePct === 0) {
    return {
      feeAmount: 0,
      netPnl: grossPnl,
      newCumulativePnl,
    };
  }

  // Fee is on the incremental profit above zero
  const taxableProfit = Math.min(grossPnl, newCumulativePnl);
  const feeAmount = taxableProfit > 0 ? taxableProfit * (config.feeRatePct / 100) : 0;

  return {
    feeAmount: Math.round(feeAmount * 100) / 100, // Round to cents
    netPnl: grossPnl - feeAmount,
    newCumulativePnl,
  };
}

/**
 * Calculate builder fee for a trade.
 * This is collected automatically by Hyperliquid on every order.
 */
export function calculateBuilderFee(notionalUsd: number): number {
  return notionalUsd * (BUILDER_FEE_BPS / 10000);
}

/**
 * Generate fee summary for a user's period.
 */
export function generateFeeSummary(
  trades: Array<{ pnl: number; fee: number; builderFee: number }>,
  tier: string,
): {
  totalTrades: number;
  grossPnl: number;
  totalBuilderFees: number;
  performanceFee: number;
  netPnl: number;
  effectiveFeeRate: number;
} {
  const grossPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalBuilderFees = trades.reduce((s, t) => s + (t.builderFee || 0), 0);

  const { feeAmount } = calculatePerformanceFee(grossPnl, tier);

  return {
    totalTrades: trades.length,
    grossPnl: Math.round(grossPnl * 100) / 100,
    totalBuilderFees: Math.round(totalBuilderFees * 100) / 100,
    performanceFee: feeAmount,
    netPnl: Math.round((grossPnl - feeAmount) * 100) / 100,
    effectiveFeeRate: grossPnl > 0
      ? Math.round((feeAmount / grossPnl) * 10000) / 100
      : 0,
  };
}
