import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, sessions } from "@/lib/db/schema";
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

/** GET /api/agents — List user's agents */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, userId))
    .orderBy(desc(agents.createdAt));

  return NextResponse.json({ ok: true, agents: userAgents });
}

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  pairs: z.array(z.string()).min(1),
  strategy: z.string().min(1),
  strategyConfig: z.record(z.unknown()),
  riskConfig: z.object({
    stopLossPct: z.number().min(0.5).max(50),
    takeProfitPct: z.number().min(0.5).max(500).optional(),
    maxPositionSizePct: z.number().min(1).max(100),
    maxDailyLossPct: z.number().min(0.5).max(25),
    trailingStop: z.boolean().optional(),
    cooldownMinutes: z.number().min(0).max(1440),
    maxLeverage: z.number().int().min(1).max(50).default(1),
  }),
  mode: z.enum(["PAPER", "LIVE"]).default("PAPER"),
});

/** POST /api/agents — Create a new agent */
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = createAgentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, pairs, strategy, strategyConfig, riskConfig, mode } = parsed.data;

  const [agent] = await db
    .insert(agents)
    .values({
      userId,
      name,
      pairs,
      strategy,
      strategyConfig,
      riskConfig,
      defaultLeverage: riskConfig.maxLeverage,
      status: mode === "LIVE" ? "LIVE" : "PAPER",
    })
    .returning();

  return NextResponse.json({ ok: true, agent }, { status: 201 });
}
