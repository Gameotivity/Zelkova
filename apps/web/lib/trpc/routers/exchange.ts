import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import { exchangeConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  connectExchange,
  getBalances,
} from "@/lib/exchange/ccxt-wrapper";
import { maskApiKey } from "@/lib/auth/encryption";
import { exchangeConnectionSchema } from "@zelkora/shared";

export const exchangeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const connections = await db
      .select({
        id: exchangeConnections.id,
        exchange: exchangeConnections.exchange,
        label: exchangeConnections.label,
        isActive: exchangeConnections.isActive,
        createdAt: exchangeConnections.createdAt,
      })
      .from(exchangeConnections)
      .where(eq(exchangeConnections.userId, ctx.userId));

    return connections;
  }),

  connect: protectedProcedure
    .input(exchangeConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      return connectExchange(
        ctx.userId,
        input.exchange,
        input.apiKey,
        input.apiSecret,
        input.label
      );
    }),

  getBalances: protectedProcedure
    .input(z.object({ exchange: z.enum(["binance", "bybit"]) }))
    .query(async ({ ctx, input }) => {
      return getBalances(ctx.userId, input.exchange);
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(exchangeConnections)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(exchangeConnections.id, input.id),
            eq(exchangeConnections.userId, ctx.userId)
          )
        );
      return { success: true };
    }),
});
