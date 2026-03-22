import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userProfiles, users } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  sort: z.enum(["pnl", "winRate", "trades", "streak"]).default("pnl"),
  period: z.enum(["all", "month", "week"]).default("all"),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params" },
      { status: 400 }
    );
  }

  const { sort, limit, offset } = parsed.data;

  const sortColumn = {
    pnl: userProfiles.totalPnl,
    winRate: userProfiles.winRate,
    trades: userProfiles.totalTrades,
    streak: userProfiles.bestStreak,
  }[sort];

  const rows = await db
    .select({
      username: userProfiles.username,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
      country: userProfiles.country,
      totalPnl: userProfiles.totalPnl,
      totalTrades: userProfiles.totalTrades,
      winRate: userProfiles.winRate,
      bestStreak: userProfiles.bestStreak,
      currentStreak: userProfiles.currentStreak,
      badges: userProfiles.badges,
      rank: userProfiles.rank,
      tradingExperience: userProfiles.tradingExperience,
      memberSince: users.createdAt,
    })
    .from(userProfiles)
    .innerJoin(users, eq(users.id, userProfiles.userId))
    .where(
      and(
        eq(userProfiles.showOnLeaderboard, true),
        eq(userProfiles.isPublic, true)
      )
    )
    .orderBy(desc(sortColumn))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userProfiles)
    .where(
      and(
        eq(userProfiles.showOnLeaderboard, true),
        eq(userProfiles.isPublic, true)
      )
    );

  return NextResponse.json({
    traders: rows,
    total: countResult?.count ?? 0,
    sort,
    limit,
    offset,
  });
}
