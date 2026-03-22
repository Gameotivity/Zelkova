import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { copyLeaders, copySubscriptions, sessions, users } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
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

const querySchema = z.object({
  sort: z.enum(["aiScore", "pnl", "winRate", "followers"]).default("aiScore"),
  limit: z.coerce.number().min(1).max(50).default(20),
});

/** GET: list copy trading leaders */
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { sort, limit } = parsed.data;

  const sortColumn = {
    aiScore: copyLeaders.aiScore,
    pnl: copyLeaders.totalPnl,
    winRate: copyLeaders.winRate,
    followers: copyLeaders.followerCount,
  }[sort];

  const leaders = await db
    .select()
    .from(copyLeaders)
    .where(eq(copyLeaders.isActive, true))
    .orderBy(desc(sortColumn))
    .limit(limit);

  return NextResponse.json({ leaders });
}

const subscribeSchema = z.object({
  leaderId: z.string().uuid(),
  allocationUsd: z.number().min(10).max(1000000),
  maxLeverage: z.number().int().min(1).max(50).default(5),
  riskScale: z.number().min(0.1).max(5).default(1),
});

/** POST: subscribe to a copy trading leader */
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { leaderId, allocationUsd, maxLeverage, riskScale } = parsed.data;

  // Check leader exists
  const [leader] = await db
    .select({ id: copyLeaders.id })
    .from(copyLeaders)
    .where(and(eq(copyLeaders.id, leaderId), eq(copyLeaders.isActive, true)))
    .limit(1);

  if (!leader) {
    return NextResponse.json({ error: "Leader not found" }, { status: 404 });
  }

  // Check not already subscribed
  const [existing] = await db
    .select({ id: copySubscriptions.id })
    .from(copySubscriptions)
    .where(
      and(
        eq(copySubscriptions.userId, userId),
        eq(copySubscriptions.leaderId, leaderId),
        eq(copySubscriptions.isActive, true)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Already subscribed to this leader" },
      { status: 409 }
    );
  }

  // Create subscription
  const [sub] = await db
    .insert(copySubscriptions)
    .values({
      userId,
      leaderId,
      allocationUsd,
      maxLeverage,
      riskScale,
    })
    .returning();

  // Increment follower count
  await db.execute(
    `UPDATE copy_leaders SET follower_count = follower_count + 1 WHERE id = '${leaderId}'`
  );

  return NextResponse.json({ subscription: sub }, { status: 201 });
}
