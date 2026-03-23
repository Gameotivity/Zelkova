import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, users, analysisRuns } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { z } from "zod";

async function getUser(req: NextRequest) {
  const token = req.cookies.get("zelkora-session")?.value;
  if (!token) return null;

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(
      and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date()))
    )
    .limit(1);

  if (!session) return null;

  const [user] = await db
    .select({
      id: users.id,
      walletAddress: users.walletAddress,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user ?? null;
}

const analysisRunSchema = z.object({
  ticker: z.string().min(1).max(20),
  action: z.enum(["long", "short", "hold", "close"]),
  confidence: z.number().min(0).max(1),
  entry_price: z.number().nullable().optional(),
  stop_loss: z.number().nullable().optional(),
  take_profit: z.number().nullable().optional(),
  size_usd: z.number().nullable().optional(),
  leverage: z.number().nullable().optional(),
  approved: z.boolean(),
  signal_alignment: z.number().int().default(0),
  risk_score: z.number().default(0),
  report: z.string().min(1),
  errors: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const offset = (page - 1) * limit;

  try {
    const runs = await db
      .select()
      .from(analysisRuns)
      .where(eq(analysisRuns.userId, user.id))
      .orderBy(desc(analysisRuns.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: analysisRuns.id })
      .from(analysisRuns)
      .where(eq(analysisRuns.userId, user.id));

    // count via length of a count query — Drizzle doesn't have count() helper in all versions
    const totalRuns = await db
      .select({ id: analysisRuns.id })
      .from(analysisRuns)
      .where(eq(analysisRuns.userId, user.id));

    return NextResponse.json({ runs, total: totalRuns.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch analysis runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = analysisRunSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const [run] = await db
      .insert(analysisRuns)
      .values({
        userId: user.id,
        ticker: data.ticker,
        action: data.action,
        confidence: data.confidence,
        entryPrice: data.entry_price ?? null,
        stopLoss: data.stop_loss ?? null,
        takeProfit: data.take_profit ?? null,
        sizeUsd: data.size_usd ?? null,
        leverage: data.leverage ?? null,
        approved: data.approved,
        signalAlignment: data.signal_alignment,
        riskScore: data.risk_score,
        report: data.report,
        errors: data.errors,
      })
      .returning();

    return NextResponse.json({ run }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save analysis run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
