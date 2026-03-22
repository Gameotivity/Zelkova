import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  userProfiles,
  sessions,
  walletNonces,
} from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const nonceSchema = z.object({
  action: z.literal("nonce"),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const verifySchema = z.object({
  action: z.literal("verify"),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string(),
  signature: z.string(),
  chainId: z.number().optional(),
});

const requestSchema = z.discriminatedUnion("action", [
  nonceSchema,
  verifySchema,
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.action === "nonce") {
      const nonce = crypto.randomBytes(32).toString("hex");
      const address = data.address.toLowerCase();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const message = [
        "Welcome to Zelkora.ai!",
        "",
        "Sign this message to verify your wallet ownership.",
        "This does NOT trigger a blockchain transaction or cost gas.",
        "",
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join("\n");

      // Clean old nonces for this address + expired
      await db.delete(walletNonces).where(
        eq(walletNonces.address, address)
      ).catch(() => { /* ignore if table doesn't exist yet */ });
      await db.delete(walletNonces).where(
        lt(walletNonces.expiresAt, new Date())
      ).catch(() => { /* ignore */ });

      // Store nonce in DB (persists across serverless invocations)
      await db.insert(walletNonces).values({
        address,
        nonce,
        message,
        expiresAt,
      });

      return NextResponse.json({ message, nonce });
    }

    if (data.action === "verify") {
      const address = data.address.toLowerCase();

      // Look up nonce from DB
      const [stored] = await db
        .select()
        .from(walletNonces)
        .where(eq(walletNonces.address, address))
        .limit(1);

      if (!stored || stored.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Nonce expired. Please try again." },
          { status: 401 }
        );
      }

      if (!data.message.includes(stored.nonce)) {
        return NextResponse.json(
          { error: "Invalid nonce in message" },
          { status: 401 }
        );
      }

      // Clean up used nonce
      await db.delete(walletNonces).where(
        eq(walletNonces.address, address)
      ).catch(() => { /* ignore */ });

      // Find or create user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, address))
        .limit(1);

      if (!user) {
        const [newUser] = await db
          .insert(users)
          .values({
            walletAddress: address,
            chainId: data.chainId ?? 1,
            name: `${address.slice(0, 6)}...${address.slice(-4)}`,
          })
          .returning();

        user = newUser;

        const username = `wallet_${address.slice(2, 10).toLowerCase()}`;
        await db.insert(userProfiles).values({
          userId: user.id,
          username,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        }).onConflictDoNothing();
      } else if (data.chainId && data.chainId !== user.chainId) {
        await db
          .update(users)
          .set({ chainId: data.chainId, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }

      // Create session
      const sessionToken = crypto.randomBytes(48).toString("hex");
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(sessions).values({
        sessionToken,
        userId: user.id,
        expires,
      });

      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          name: user.name,
          chainId: user.chainId,
        },
        profile: profile
          ? {
              username: profile.username,
              displayName: profile.displayName,
              rank: profile.rank,
            }
          : null,
        sessionToken,
      });

      response.cookies.set("zelkora-session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires,
      });

      return response;
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Wallet auth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", debug: message },
      { status: 500 }
    );
  }
}
