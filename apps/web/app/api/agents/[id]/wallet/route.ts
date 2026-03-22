/**
 * POST /api/agents/[id]/wallet — Set the API wallet for an agent.
 *
 * Hyperliquid allows delegating a sub-wallet (API wallet) that can
 * trade on behalf of the main wallet. This endpoint stores the
 * API wallet address on the agent record.
 *
 * The private key is NEVER stored on our servers — it stays in the
 * worker runtime memory only during execution.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, sessions } from "@/lib/db/schema";
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

const walletSchema = z.object({
  apiWalletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
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
  const parsed = walletSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { apiWalletAddress } = parsed.data;
  const agentId = params.id;

  const [updated] = await db
    .update(agents)
    .set({
      apiWalletAddress: apiWalletAddress.toLowerCase(),
      updatedAt: new Date(),
    })
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
    .returning({ id: agents.id, apiWalletAddress: agents.apiWalletAddress });

  if (!updated) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    agent: updated,
    message: "API wallet set. This wallet will be used for automated trading.",
  });
}
