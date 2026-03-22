import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userProfiles } from "@/lib/db/schema";
import { registerSchema } from "@zelkora/shared";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const extendedRegisterSchema = registerSchema.extend({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores"
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = extendedRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name, username } = parsed.data;

    // Check if user exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Check if username is taken
    if (username) {
      const [existingUsername] = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.username, username))
        .limit(1);

      if (existingUsername) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    // Create user profile
    const finalUsername =
      username ||
      `${name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 16)}_${Math.random().toString(36).slice(2, 6)}`;

    await db.insert(userProfiles).values({
      userId: user.id,
      username: finalUsername,
      displayName: name,
    });

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
