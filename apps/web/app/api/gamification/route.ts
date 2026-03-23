/**
 * Gamification API — XP, quests, badges.
 *
 * GET  /api/gamification — Get user's XP, level, quests, badges
 * POST /api/gamification — Complete a quest + award XP (idempotent)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { userXp, xpEvents, sessions, userProfiles } from "@/lib/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getLevelForXp, getXpProgress, ALL_QUESTS, BADGES } from "@/lib/gamification/xp-engine";

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("zelkora-session")?.value;
  if (!token) return null;
  try {
    const [session] = await db.select({ userId: sessions.userId }).from(sessions)
      .where(and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date()))).limit(1);
    return session?.userId ?? null;
  } catch { return null; }
}

/** GET: User's gamification state */
export async function GET(req: NextRequest) {
  const dbReady = await isDbAvailable();
  if (!dbReady) {
    return NextResponse.json({
      xp: 0, level: 1, levelTitle: "Recruit",
      progress: { current: 0, needed: 100, percent: 0 },
      questsCompleted: [],
      badges: [],
    });
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let [xpRecord] = await db.select().from(userXp).where(eq(userXp.userId, userId)).limit(1);

    if (!xpRecord) {
      [xpRecord] = await db.insert(userXp).values({ userId }).returning();
    }

    const level = getLevelForXp(xpRecord.totalXp);
    const progress = getXpProgress(xpRecord.totalXp);

    // Get badges from profile
    const [profile] = await db.select({ badges: userProfiles.badges }).from(userProfiles)
      .where(eq(userProfiles.userId, userId)).limit(1);

    return NextResponse.json({
      xp: xpRecord.totalXp,
      level: level.level,
      levelTitle: level.title,
      levelColor: level.color,
      progress,
      questsCompleted: xpRecord.questsCompleted ?? [],
      badges: profile?.badges ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

const completeSchema = z.object({
  questId: z.string().min(1).max(50),
});

/** POST: Complete a quest + award XP (idempotent) */
export async function POST(req: NextRequest) {
  const dbReady = await isDbAvailable();
  if (!dbReady) {
    return NextResponse.json({ success: true, xpEarned: 0, totalXp: 0, level: 1, message: "Demo mode" });
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { questId } = parsed.data;

  // Find quest
  const quest = ALL_QUESTS.find((q) => q.id === questId);
  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  try {
    // Idempotent: try to insert XP event (unique on userId + eventType)
    try {
      await db.insert(xpEvents).values({
        userId,
        eventType: questId,
        xpEarned: quest.xp,
        metadata: { questTitle: quest.title },
      });
    } catch {
      // Already completed — return current state without error
      const [xpRecord] = await db.select().from(userXp).where(eq(userXp.userId, userId)).limit(1);
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        xpEarned: 0,
        totalXp: xpRecord?.totalXp ?? 0,
        level: getLevelForXp(xpRecord?.totalXp ?? 0).level,
      });
    }

    // Update user XP
    let [xpRecord] = await db.select().from(userXp).where(eq(userXp.userId, userId)).limit(1);

    if (!xpRecord) {
      [xpRecord] = await db.insert(userXp).values({ userId, totalXp: quest.xp, questsCompleted: [questId] }).returning();
    } else {
      const completed = [...(xpRecord.questsCompleted ?? []), questId];
      const newXp = xpRecord.totalXp + quest.xp;
      const newLevel = getLevelForXp(newXp).level;

      await db.update(userXp).set({
        totalXp: newXp,
        level: newLevel,
        questsCompleted: completed,
        updatedAt: new Date(),
      }).where(eq(userXp.userId, userId));

      xpRecord = { ...xpRecord, totalXp: newXp, level: newLevel, questsCompleted: completed };
    }

    // Check for badge awards
    const badgesToAward: string[] = [];
    const level = getLevelForXp(xpRecord.totalXp);

    if (questId === "DASHBOARD_ENTERED") badgesToAward.push("founder");
    if (questId === "FIRST_TRADE") badgesToAward.push("first_blood");
    if (questId === "STREAK_5") badgesToAward.push("streak_master");
    if (level.level >= 5) badgesToAward.push("elite_trader");

    if (badgesToAward.length > 0) {
      const [profile] = await db.select({ badges: userProfiles.badges }).from(userProfiles)
        .where(eq(userProfiles.userId, userId)).limit(1);

      const existingBadges = (profile?.badges ?? []) as Array<{ id: string; name: string; icon: string; earnedAt: string }>;
      const existingIds = new Set(existingBadges.map((b) => b.id));

      const newBadges = badgesToAward
        .filter((id) => !existingIds.has(id))
        .map((id) => {
          const badge = BADGES.find((b) => b.id === id);
          return badge ? { id: badge.id, name: badge.name, icon: badge.icon, earnedAt: new Date().toISOString() } : null;
        })
        .filter(Boolean);

      const validNewBadges = newBadges.filter((b): b is NonNullable<typeof b> => b !== null);
      if (validNewBadges.length > 0) {
        await db.update(userProfiles).set({
          badges: [...existingBadges, ...validNewBadges] as Array<{ id: string; name: string; icon: string; earnedAt: string }>,
          updatedAt: new Date(),
        }).where(eq(userProfiles.userId, userId));
      }
    }

    return NextResponse.json({
      success: true,
      xpEarned: quest.xp,
      totalXp: xpRecord.totalXp,
      level: level.level,
      levelTitle: level.title,
      levelUp: xpRecord.level !== level.level,
      badgesAwarded: badgesToAward,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
