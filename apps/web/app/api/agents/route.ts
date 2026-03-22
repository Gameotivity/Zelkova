// ---------------------------------------------------------------------------
// GET /api/agents — List user's agents
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, sessions } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

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
