import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

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

/** GET: wallet connection status */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      walletAddress: users.walletAddress,
      builderFeeApproved: users.builderFeeApproved,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return NextResponse.json({
    connected: !!user?.walletAddress,
    walletAddress: user?.walletAddress ?? null,
    builderFeeApproved: user?.builderFeeApproved ?? false,
    exchange: "hyperliquid",
  });
}
