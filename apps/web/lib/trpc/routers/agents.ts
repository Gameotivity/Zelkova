import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import { agents, trades, positions, signals } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createAgentSchema } from "@zelkora/shared";

export const agentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(agents)
      .where(eq(agents.userId, ctx.userId))
      .orderBy(desc(agents.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [agent] = await db
        .select()
        .from(agents)
        .where(
          and(eq(agents.id, input.id), eq(agents.userId, ctx.userId))
        )
        .limit(1);

      if (!agent) return null;
      return agent;
    }),

  create: protectedProcedure
    .input(createAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const [agent] = await db
        .insert(agents)
        .values({
          userId: ctx.userId,
          name: input.name,
          type: input.type,
          exchange: input.exchange,
          pairs: input.pairs,
          strategy: input.strategy,
          strategyConfig: input.strategyConfig,
          riskConfig: input.riskConfig,
          status: input.mode === "LIVE" ? "LIVE" : "PAPER",
        })
        .returning();

      return agent;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["PAPER", "LIVE", "PAUSED", "STOPPED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(agents)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(eq(agents.id, input.id), eq(agents.userId, ctx.userId))
        )
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(agents)
        .where(
          and(eq(agents.id, input.id), eq(agents.userId, ctx.userId))
        );
      return { success: true };
    }),

  getTrades: protectedProcedure
    .input(z.object({ agentId: z.string().uuid(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(trades)
        .where(
          and(
            eq(trades.agentId, input.agentId),
            eq(trades.userId, ctx.userId)
          )
        )
        .orderBy(desc(trades.createdAt))
        .limit(input.limit);
    }),

  getPositions: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(positions)
        .where(
          and(
            eq(positions.agentId, input.agentId),
            eq(positions.isOpen, true)
          )
        );
    }),

  getSignals: protectedProcedure
    .input(z.object({ agentId: z.string().uuid(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(signals)
        .where(eq(signals.agentId, input.agentId))
        .orderBy(desc(signals.createdAt))
        .limit(input.limit);
    }),
});
