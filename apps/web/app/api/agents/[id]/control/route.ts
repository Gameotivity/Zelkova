/**
 * POST /api/agents/[id]/control — Start, stop, or pause an agent.
 *
 * The worker service polls the DB every 30s, so status changes here
 * are automatically picked up by the agent scheduler.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, sessions, users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
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

const controlSchema = z.object({
  action: z.enum(["start", "stop", "pause"]),
  /** Required when starting in LIVE mode */
  mode: z.enum(["PAPER", "LIVE"]).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = controlSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { action, mode } = parsed.data;
  const agentId = params.id;

  // Verify ownership
  const [agent] = await db
    .select({ id: agents.id, status: agents.status })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
    .limit(1);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let newStatus: "PAPER" | "LIVE" | "PAUSED" | "STOPPED";

  switch (action) {
    case "start": {
      // Check builder fee approval for LIVE mode
      if (mode === "LIVE") {
        const [user] = await db
          .select({ builderFeeApproved: users.builderFeeApproved })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user?.builderFeeApproved) {
          return NextResponse.json(
            { error: "Builder fee approval required for live trading. Go to Settings → Exchanges." },
            { status: 403 },
          );
        }
      }
      newStatus = mode === "LIVE" ? "LIVE" : "PAPER";
      break;
    }
    case "pause":
      newStatus = "PAUSED";
      break;
    case "stop":
      newStatus = "STOPPED";
      break;
  }

  const [updated] = await db
    .update(agents)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
    .returning();

  console.log(`[Agent Control] ${agentId.slice(0, 8)} → ${action} (${newStatus})`);

  return NextResponse.json({
    ok: true,
    agent: { id: updated.id, status: updated.status },
    message: `Agent ${action === "start" ? "started" : action === "pause" ? "paused" : "stopped"} successfully. Worker will pick up the change within 30 seconds.`,
  });
}
