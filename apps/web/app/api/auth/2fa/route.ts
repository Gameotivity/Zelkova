import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import {
  generateTotpSecret,
  generateOtpauthUri,
  verifyTotpCode,
} from "@/lib/auth/totp";

// --- Auth helper ---

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

// --- Zod schemas ---

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({ action: z.literal("enable"), code: z.string().length(6) }),
  z.object({ action: z.literal("verify"), code: z.string().length(6) }),
  z.object({ action: z.literal("disable"), code: z.string().length(6) }),
]);

// --- POST: all 2FA actions ---

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = actionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Fetch user record
  const [user] = await db
    .select({
      email: users.email,
      totpSecret: users.totpSecret,
      is2FAEnabled: users.is2FAEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  switch (data.action) {
    case "setup": {
      const secret = generateTotpSecret();
      const otpauthUri = generateOtpauthUri(
        secret,
        user.email ?? userId
      );

      // Store secret (not yet enabled until user verifies)
      await db
        .update(users)
        .set({ totpSecret: secret, updatedAt: new Date() })
        .where(eq(users.id, userId));

      return NextResponse.json({ secret, otpauthUri });
    }

    case "enable": {
      if (!user.totpSecret) {
        return NextResponse.json(
          { error: "Run setup first to generate a TOTP secret" },
          { status: 400 }
        );
      }

      if (!verifyTotpCode(user.totpSecret, data.code)) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
      }

      await db
        .update(users)
        .set({ is2FAEnabled: true, updatedAt: new Date() })
        .where(eq(users.id, userId));

      return NextResponse.json({
        success: true,
        message: "2FA has been enabled",
      });
    }

    case "verify": {
      if (!user.is2FAEnabled || !user.totpSecret) {
        return NextResponse.json(
          { error: "2FA is not enabled for this account" },
          { status: 400 }
        );
      }

      const valid = verifyTotpCode(user.totpSecret, data.code);
      return NextResponse.json({ valid });
    }

    case "disable": {
      if (!user.is2FAEnabled || !user.totpSecret) {
        return NextResponse.json(
          { error: "2FA is not enabled for this account" },
          { status: 400 }
        );
      }

      if (!verifyTotpCode(user.totpSecret, data.code)) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
      }

      await db
        .update(users)
        .set({
          is2FAEnabled: false,
          totpSecret: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return NextResponse.json({
        success: true,
        message: "2FA has been disabled",
      });
    }
  }
}
