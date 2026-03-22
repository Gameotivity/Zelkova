import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userProfiles, sessions } from "@/lib/db/schema";
import { eq, and, ne, gt } from "drizzle-orm";
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

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(280).optional(),
  country: z.string().max(50).optional(),
  twitter: z.string().max(50).optional(),
  telegram: z.string().max(50).optional(),
  website: z.string().url().max(200).optional().or(z.literal("")),
  tradingExperience: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .optional(),
  favoriteAssets: z.array(z.string()).max(10).optional(),
  isPublic: z.boolean().optional(),
  showOnLeaderboard: z.boolean().optional(),
  name: z.string().min(1).max(50).optional(),
});

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const [user] = await db
    .select({
      id: users.id,
      walletAddress: users.walletAddress,
      name: users.name,
      image: users.image,
      chainId: users.chainId,
      createdAt: users.createdAt,
      subscriptionTier: users.subscriptionTier,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return NextResponse.json({ user, profile });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.username) {
    const [existing] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.username, data.username),
          ne(userProfiles.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }
  }

  if (data.name) {
    await db
      .update(users)
      .set({ name: data.name, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  const profileData = {
    username: data.username,
    displayName: data.displayName,
    bio: data.bio,
    country: data.country,
    twitter: data.twitter,
    telegram: data.telegram,
    website: data.website || undefined,
    tradingExperience: data.tradingExperience,
    favoriteAssets: data.favoriteAssets,
    isPublic: data.isPublic,
    showOnLeaderboard: data.showOnLeaderboard,
    updatedAt: new Date(),
  };

  const cleanData = Object.fromEntries(
    Object.entries(profileData).filter(([, v]) => v !== undefined)
  );

  const [existing] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(userProfiles)
      .set(cleanData)
      .where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({
      userId,
      username:
        data.username ||
        `trader_${Math.random().toString(36).slice(2, 8)}`,
      ...cleanData,
    });
  }

  return NextResponse.json({ success: true });
}
