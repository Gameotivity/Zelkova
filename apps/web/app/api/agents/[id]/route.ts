// ---------------------------------------------------------------------------
// GET /api/agents/[id] — Fetch agent details with trades, signals, positions
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  agents,
  trades,
  positions,
  signals,
  sessions,
} from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentId = params.id;

  // Fetch agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
    .limit(1);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Fetch trades, signals, positions in parallel
  const [agentTrades, agentPositions, agentSignals] = await Promise.all([
    db
      .select()
      .from(trades)
      .where(eq(trades.agentId, agentId))
      .orderBy(desc(trades.createdAt))
      .limit(100),
    db
      .select()
      .from(positions)
      .where(eq(positions.agentId, agentId))
      .orderBy(desc(positions.openedAt)),
    db
      .select()
      .from(signals)
      .where(eq(signals.agentId, agentId))
      .orderBy(desc(signals.createdAt))
      .limit(50),
  ]);

  // Calculate summary stats
  const sellTrades = agentTrades.filter((t) => t.side === "SELL");
  const totalPnl = sellTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins = sellTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = sellTrades.length > 0 ? wins / sellTrades.length : 0;

  return NextResponse.json({
    ok: true,
    agent: {
      ...agent,
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      winRate: parseFloat((winRate * 100).toFixed(1)),
      totalTrades: agentTrades.length,
    },
    trades: agentTrades,
    positions: agentPositions,
    signals: agentSignals,
  });
}
