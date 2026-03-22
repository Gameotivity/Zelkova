// ---------------------------------------------------------------------------
// POST /api/telegram/link — Generate a 6-digit Telegram link code
// GET  /api/telegram/link — Check link status for current user
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessions, userProfiles } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import {
  linkCodes,
  pruneExpired,
  generateCode,
  CODE_TTL_MS,
  MAX_CODES,
} from "@/lib/telegram/link-store";

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
      and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date())),
    )
    .limit(1);

  return session?.userId ?? null;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const linkResponseSchema = z.object({
  code: z.string(),
  expiresIn: z.number(),
});

type LinkResponse = z.infer<typeof linkResponseSchema>;

// ---------------------------------------------------------------------------
// POST — Generate link code
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Prune expired codes periodically
  pruneExpired();

  if (linkCodes.size >= MAX_CODES) {
    return NextResponse.json(
      { error: "Too many pending codes. Try again later." },
      { status: 429 },
    );
  }

  // Remove any existing code for this user
  for (const [code, entry] of linkCodes) {
    if (entry.userId === userId) {
      linkCodes.delete(code);
    }
  }

  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL_MS;

  linkCodes.set(code, { userId, expiresAt });

  const response: LinkResponse = {
    code,
    expiresIn: CODE_TTL_MS / 1000,
  };

  return NextResponse.json(response);
}

// ---------------------------------------------------------------------------
// GET — Check if user has Telegram linked
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select({ telegram: userProfiles.telegram })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const linked = Boolean(profile?.telegram);

  return NextResponse.json({ linked, chatId: profile?.telegram ?? null });
}
