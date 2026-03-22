import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, users, userProfiles } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("zelkora-session")?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.sessionToken, token),
          gt(sessions.expires, new Date())
        )
      )
      .limit(1);

    if (!session) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete("zelkora-session");
      return response;
    }

    const [user] = await db
      .select({
        id: users.id,
        walletAddress: users.walletAddress,
        name: users.name,
        chainId: users.chainId,
        image: users.image,
        subscriptionTier: users.subscriptionTier,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    return NextResponse.json({
      user,
      profile: profile
        ? {
            username: profile.username,
            displayName: profile.displayName,
            rank: profile.rank,
            totalPnl: profile.totalPnl,
            badges: profile.badges,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("zelkora-session")?.value;

  if (token) {
    await db
      .delete(sessions)
      .where(eq(sessions.sessionToken, token))
      .catch(() => { /* ignore */ });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("zelkora-session");
  return response;
}
