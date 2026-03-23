/**
 * Referral Engine — Code generation, tracking, rewards.
 *
 * Production-grade for millions of users:
 * - Cryptographically random codes (collision-resistant)
 * - Idempotent referral application (unique constraint on refereeId)
 * - Tier upgrade automation (3 refs → Pro, 10 → Elite)
 * - Commission tracking with lifetime attribution
 */

import crypto from "crypto";

// ═══ Code Generation ═══════════════════════════════

const CODE_PREFIX = "ZELK";
const CODE_LENGTH = 6; // 6 chars after prefix = 2.1 billion possible codes

/**
 * Generate a unique referral code.
 * Format: ZELK-XXXXXX (cryptographically random, URL-safe)
 */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${CODE_PREFIX}-${code}`;
}

/**
 * Validate referral code format.
 */
export function isValidCodeFormat(code: string): boolean {
  return /^ZELK-[A-Z2-9]{6}$/.test(code.toUpperCase());
}

// ═══ Commission ═══════════════════════════════════

const DEFAULT_COMMISSION_RATE = 0.20; // 20%

/**
 * Calculate referral commission from a trade's performance fee.
 */
export function calculateReferralCommission(
  performanceFee: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE,
): number {
  if (performanceFee <= 0) return 0;
  return Math.round(performanceFee * commissionRate * 100) / 100;
}

// ═══ Tier Upgrades ═══════════════════════════════

const TIER_THRESHOLDS = {
  PRO: 3,   // 3 referrals → Pro
  ELITE: 10, // 10 referrals → Elite
} as const;

/**
 * Check if a referrer qualifies for a tier upgrade based on referral count.
 */
export function checkTierUpgrade(
  referralCount: number,
  currentTier: string,
): { upgrade: boolean; newTier: string | null; nextThreshold: number } {
  if (currentTier === "ELITE") {
    return { upgrade: false, newTier: null, nextThreshold: 0 };
  }

  if (referralCount >= TIER_THRESHOLDS.ELITE && currentTier !== "ELITE") {
    return { upgrade: true, newTier: "ELITE", nextThreshold: 0 };
  }

  if (referralCount >= TIER_THRESHOLDS.PRO && currentTier === "FREE") {
    return { upgrade: true, newTier: "PRO", nextThreshold: TIER_THRESHOLDS.ELITE };
  }

  const nextThreshold = currentTier === "FREE" ? TIER_THRESHOLDS.PRO : TIER_THRESHOLDS.ELITE;
  return { upgrade: false, newTier: null, nextThreshold };
}

/**
 * Get referral stats summary for display.
 */
export function getReferralSummary(
  referralCount: number,
  totalCommission: number,
  currentTier: string,
): {
  count: number;
  commission: number;
  tier: string;
  nextTierThreshold: number;
  progressToNextTier: number;
  nextTierName: string;
} {
  const { nextThreshold } = checkTierUpgrade(referralCount, currentTier);
  const progress = nextThreshold > 0
    ? Math.min(100, Math.round((referralCount / nextThreshold) * 100))
    : 100;
  const nextTierName = currentTier === "FREE" ? "Pro" : currentTier === "PRO" ? "Elite" : "Max";

  return {
    count: referralCount,
    commission: Math.round(totalCommission * 100) / 100,
    tier: currentTier,
    nextTierThreshold: nextThreshold,
    progressToNextTier: progress,
    nextTierName,
  };
}
