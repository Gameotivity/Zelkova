/**
 * GET /api/fees — User's fee summary (their own fees).
 *
 * Returns the user's:
 * - Current subscription tier and fee rate
 * - Total gross P&L, net P&L, fees paid
 * - Current period fee accrual
 * - Fee history by period
 */

import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { sessions, users, trades, feeLedger } from "@/lib/db/schema";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import { getFeeConfig, generateFeeSummary } from "@/lib/fees/fee-engine";

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("zelkora-session")?.value;
  if (!token) return null;
  try {
    const [session] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date())))
      .limit(1);
    return session?.userId ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const dbReady = await isDbAvailable();

  if (!dbReady) {
    // Return demo fee summary when DB is unavailable
    return NextResponse.json({
      tier: "PRO",
      feeConfig: getFeeConfig("PRO"),
      summary: {
        totalTrades: 0,
        grossPnl: 0,
        totalBuilderFees: 0,
        performanceFee: 0,
        netPnl: 0,
        effectiveFeeRate: 0,
      },
      history: [],
      message: "Connect to database to see real fee data.",
    });
  }

  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's subscription tier
    const [user] = await db
      .select({ tier: users.subscriptionTier })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const tier = user?.tier || "FREE";
    const config = getFeeConfig(tier);

    // Get all user trades for fee calculation
    const userTrades = await db
      .select({
        pnl: trades.pnl,
        fee: trades.fee,
        builderFee: trades.builderFee,
      })
      .from(trades)
      .where(eq(trades.userId, userId));

    const tradeData = userTrades.map((t) => ({
      pnl: t.pnl ?? 0,
      fee: t.fee ?? 0,
      builderFee: t.builderFee ?? 0,
    }));

    const summary = generateFeeSummary(tradeData, tier);

    // Get fee history
    const history = await db
      .select()
      .from(feeLedger)
      .where(eq(feeLedger.userId, userId))
      .orderBy(desc(feeLedger.periodStart))
      .limit(12);

    return NextResponse.json({
      tier,
      feeConfig: config,
      summary,
      history,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
