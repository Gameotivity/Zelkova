import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { createExchange } from "@/lib/hyperliquid/client";
import { setLeverage } from "@/lib/hyperliquid/portfolio-service";

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

const setLeverageSchema = z.object({
  coin: z.string().min(1).max(20),
  leverage: z.number().int().min(1).max(50),
  isCross: z.boolean().default(false),
  apiWalletKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = setLeverageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { coin, leverage, isCross, apiWalletKey } = parsed.data;

  try {
    const exchange = await createExchange(apiWalletKey);
    const success = await setLeverage(exchange, coin, leverage, isCross);

    return NextResponse.json({
      ok: success,
      leverage: {
        coin,
        leverage,
        marginMode: isCross ? "cross" : "isolated",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Leverage update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
