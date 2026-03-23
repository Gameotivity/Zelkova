/**
 * Referral API — Production-grade for scale.
 *
 * GET  /api/referral — Get user's referral code + stats
 * POST /api/referral — Apply a referral code during onboarding
 */

import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { referralCodes, referrals, users, sessions } from "@/lib/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { generateReferralCode, isValidCodeFormat, getReferralSummary, checkTierUpgrade } from "@/lib/gamification/referral-engine";

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("zelkora-session")?.value;
  if (!token) return null;
  try {
    const [session] = await db.select({ userId: sessions.userId }).from(sessions)
      .where(and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date()))).limit(1);
    return session?.userId ?? null;
  } catch { return null; }
}

/** GET: Get or create user's referral code + stats */
export async function GET(req: NextRequest) {
  const dbReady = await isDbAvailable();
  if (!dbReady) {
    return NextResponse.json({
      code: "ZELK-DEMO01",
      summary: { count: 0, commission: 0, tier: "FREE", nextTierThreshold: 3, progressToNextTier: 0, nextTierName: "Pro" },
      referrals: [],
    });
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get or create referral code
    let [existing] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);

    if (!existing) {
      // Generate unique code with retry
      let code = generateReferralCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          [existing] = await db.insert(referralCodes).values({ userId, code }).returning();
          break;
        } catch {
          code = generateReferralCode(); // collision, retry
        }
      }
    }

    if (!existing) return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });

    // Get referral stats
    const refs = await db.select({
      refereeId: referrals.refereeId,
      commission: referrals.totalCommissionEarned,
      status: referrals.status,
      createdAt: referrals.createdAt,
    }).from(referrals).where(eq(referrals.referrerId, userId));

    const totalCommission = refs.reduce((s, r) => s + (r.commission ?? 0), 0);
    const activeCount = refs.filter((r) => r.status === "active").length;

    // Get user tier
    const [user] = await db.select({ tier: users.subscriptionTier }).from(users).where(eq(users.id, userId)).limit(1);

    const summary = getReferralSummary(activeCount, totalCommission, user?.tier || "FREE");

    return NextResponse.json({
      code: existing.code,
      summary,
      referrals: refs.map((r) => ({
        status: r.status,
        commission: r.commission,
        joinedAt: r.createdAt,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

const applySchema = z.object({
  code: z.string().min(1).max(20),
  refereeUserId: z.string().uuid().optional(),
});

/** POST: Apply a referral code */
export async function POST(req: NextRequest) {
  const dbReady = await isDbAvailable();
  if (!dbReady) {
    return NextResponse.json({ success: true, message: "Referral recorded (demo mode)" });
  }

  const userId = await getUserId(req);
  const body = await req.json();
  const parsed = applySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { code } = parsed.data;
  const normalizedCode = code.toUpperCase().trim();

  if (!isValidCodeFormat(normalizedCode)) {
    return NextResponse.json({ error: "Invalid referral code format" }, { status: 400 });
  }

  const refereeId = userId || parsed.data.refereeUserId;
  if (!refereeId) {
    return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
  }

  try {
    // Find the referral code
    const [codeRecord] = await db.select().from(referralCodes).where(eq(referralCodes.code, normalizedCode)).limit(1);
    if (!codeRecord) {
      return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
    }

    // Can't refer yourself
    if (codeRecord.userId === refereeId) {
      return NextResponse.json({ error: "Cannot use your own referral code" }, { status: 400 });
    }

    // Check max uses
    if (codeRecord.maxUses && codeRecord.uses >= codeRecord.maxUses) {
      return NextResponse.json({ error: "Referral code has reached maximum uses" }, { status: 400 });
    }

    // Create referral (unique constraint on refereeId prevents duplicates)
    try {
      await db.insert(referrals).values({
        referrerId: codeRecord.userId,
        refereeId,
        code: normalizedCode,
      });
    } catch {
      return NextResponse.json({ error: "You've already used a referral code" }, { status: 409 });
    }

    // Increment uses
    await db.update(referralCodes).set({ uses: sql`${referralCodes.uses} + 1` }).where(eq(referralCodes.id, codeRecord.id));

    // Check tier upgrade for referrer
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(referrals).where(eq(referrals.referrerId, codeRecord.userId));
    const refCount = Number(countResult?.count ?? 0);

    const [referrerUser] = await db.select({ tier: users.subscriptionTier }).from(users).where(eq(users.id, codeRecord.userId)).limit(1);
    const upgrade = checkTierUpgrade(refCount, referrerUser?.tier || "FREE");

    if (upgrade.upgrade && upgrade.newTier) {
      await db.update(users).set({ subscriptionTier: upgrade.newTier as "FREE" | "PRO" | "ELITE", updatedAt: new Date() }).where(eq(users.id, codeRecord.userId));
    }

    return NextResponse.json({
      success: true,
      referrerName: `Trader #${codeRecord.userId.slice(0, 6)}`,
      tierUpgrade: upgrade.upgrade ? upgrade.newTier : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
