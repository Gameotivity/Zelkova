import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { copySubscriptions, copyLeaders, sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("zelkora-session")?.value;
  if (!token) return null;

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(
      and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date()))
    )
    .limit(1);

  return session?.userId ?? null;
}

/** GET: list user's active copy subscriptions */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await db
    .select({
      id: copySubscriptions.id,
      leaderId: copySubscriptions.leaderId,
      leaderName: copyLeaders.name,
      leaderWallet: copyLeaders.walletAddress,
      leaderPnl: copyLeaders.totalPnl,
      leaderWinRate: copyLeaders.winRate,
      allocationUsd: copySubscriptions.allocationUsd,
      maxLeverage: copySubscriptions.maxLeverage,
      riskScale: copySubscriptions.riskScale,
      isActive: copySubscriptions.isActive,
      totalPnl: copySubscriptions.totalPnl,
      createdAt: copySubscriptions.createdAt,
      updatedAt: copySubscriptions.updatedAt,
    })
    .from(copySubscriptions)
    .innerJoin(copyLeaders, eq(copyLeaders.id, copySubscriptions.leaderId))
    .where(eq(copySubscriptions.userId, userId));

  return NextResponse.json({ subscriptions: subs });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  allocationUsd: z.number().min(10).max(1000000).optional(),
  maxLeverage: z.number().int().min(1).max(50).optional(),
  riskScale: z.number().min(0.1).max(5).optional(),
  isActive: z.boolean().optional(),
});

/** PATCH: update a subscription */
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;

  const [updated] = await db
    .update(copySubscriptions)
    .set({ ...updates, updatedAt: new Date() })
    .where(
      and(
        eq(copySubscriptions.id, id),
        eq(copySubscriptions.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json({ subscription: updated });
}

const deleteSchema = z.object({
  id: z.string().uuid(),
});

/** DELETE: unsubscribe */
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Soft-delete: set isActive = false
  const [sub] = await db
    .update(copySubscriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(copySubscriptions.id, parsed.data.id),
        eq(copySubscriptions.userId, userId)
      )
    )
    .returning({ leaderId: copySubscriptions.leaderId });

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // Decrement follower count
  await db.execute(
    `UPDATE copy_leaders SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = '${sub.leaderId}'`
  );

  return NextResponse.json({ success: true });
}
