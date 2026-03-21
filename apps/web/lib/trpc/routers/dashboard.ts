import { router, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import { agents, trades, positions } from "@/lib/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Active agents count
    const activeAgents = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(
        and(
          eq(agents.userId, ctx.userId),
          sql`${agents.status} IN ('PAPER', 'LIVE')`
        )
      );

    // Total P&L
    const totalPnl = await db
      .select({ total: sql<number>`COALESCE(sum(${trades.pnl}), 0)` })
      .from(trades)
      .where(eq(trades.userId, ctx.userId));

    // Today's P&L
    const todayPnl = await db
      .select({ total: sql<number>`COALESCE(sum(${trades.pnl}), 0)` })
      .from(trades)
      .where(
        and(
          eq(trades.userId, ctx.userId),
          gte(trades.createdAt, todayStart)
        )
      );

    // Win rate
    const winLoss = await db
      .select({
        wins: sql<number>`COALESCE(sum(CASE WHEN ${trades.pnl} > 0 THEN 1 ELSE 0 END), 0)`,
        total: sql<number>`count(*)`,
      })
      .from(trades)
      .where(
        and(
          eq(trades.userId, ctx.userId),
          sql`${trades.pnl} IS NOT NULL`
        )
      );

    const winRate =
      winLoss[0].total > 0
        ? (winLoss[0].wins / winLoss[0].total) * 100
        : 0;

    return {
      activeAgents: Number(activeAgents[0].count),
      totalPnl: Number(totalPnl[0].total),
      todayPnl: Number(todayPnl[0].total),
      winRate: Math.round(winRate * 10) / 10,
    };
  }),

  recentTrades: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(trades)
      .where(eq(trades.userId, ctx.userId))
      .orderBy(desc(trades.createdAt))
      .limit(20);
  }),
});
