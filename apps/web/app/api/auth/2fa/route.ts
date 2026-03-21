import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import QRCode from "qrcode";

// GET: Generate 2FA setup (secret + QR code)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(
      session.user.email!,
      "Zelkora.ai",
      secret
    );
    const qrCode = await QRCode.toDataURL(otpauth);

    // Store secret temporarily (user must verify before it's active)
    await db
      .update(users)
      .set({ totpSecret: secret })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ qrCode, secret });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Verify 2FA code and enable
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const [user] = await db
      .select({ totpSecret: users.totpSecret })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user?.totpSecret) {
      return NextResponse.json(
        { error: "2FA not initialized. Generate a secret first." },
        { status: 400 }
      );
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    await db
      .update(users)
      .set({ is2FAEnabled: true })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true, message: "2FA enabled" });
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
