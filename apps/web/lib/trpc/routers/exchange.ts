import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPositions, getAccountSummary } from "@/lib/hyperliquid/portfolio-service";

export const exchangeRouter = router({
  /** Get wallet connection status */
  status: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select({
        walletAddress: users.walletAddress,
        builderFeeApproved: users.builderFeeApproved,
      })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    return {
      connected: !!user?.walletAddress,
      walletAddress: user?.walletAddress ?? null,
      builderFeeApproved: user?.builderFeeApproved ?? false,
    };
  }),

  /** Get account summary from Hyperliquid */
  getAccountSummary: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select({ walletAddress: users.walletAddress })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (!user?.walletAddress) {
      return null;
    }

    return getAccountSummary(user.walletAddress);
  }),

  /** Get open positions from Hyperliquid */
  getPositions: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select({ walletAddress: users.walletAddress })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (!user?.walletAddress) {
      return [];
    }

    return getPositions(user.walletAddress);
  }),
});
