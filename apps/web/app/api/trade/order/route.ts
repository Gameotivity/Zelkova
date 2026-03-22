import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, users, trades } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { createExchange } from "@/lib/hyperliquid/client";
import { placeOrder, cancelOrder } from "@/lib/hyperliquid/order-service";
import { decrypt } from "@/lib/crypto/encrypt";

async function getUser(req: NextRequest) {
  const token = req.cookies.get("zelkora-session")?.value;
  if (!token) return null;

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(
      and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date()))
    )
    .limit(1);

  if (!session) return null;

  const [user] = await db
    .select({
      id: users.id,
      walletAddress: users.walletAddress,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user ?? null;
}

const placeOrderSchema = z.object({
  coin: z.string().min(1).max(20),
  side: z.enum(["buy", "sell"]),
  size: z.string().min(1),
  price: z.string().nullable().default(null),
  orderType: z.enum(["limit", "market"]),
  tif: z.enum(["Gtc", "Ioc", "Alo"]).default("Gtc"),
  reduceOnly: z.boolean().default(false),
  leverage: z.number().int().min(1).max(50).optional(),
  cloid: z.string().optional(),
  /** Agent ID if the order is placed by an agent */
  agentId: z.string().uuid().optional(),
  /** API wallet private key (encrypted) — provided by agent runtime */
  apiWalletKey: z.string().optional(),
});

const cancelOrderSchema = z.object({
  coin: z.string().min(1).max(20),
  orderId: z.number().int().positive(),
  apiWalletKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = placeOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { coin, side, size, price, orderType, tif, reduceOnly, cloid, agentId, apiWalletKey } =
    parsed.data;

  if (!apiWalletKey) {
    return NextResponse.json(
      { error: "API wallet key required for trade execution" },
      { status: 400 }
    );
  }

  try {
    const exchange = await createExchange(apiWalletKey);

    const result = await placeOrder(exchange, {
      coin,
      side,
      size,
      price,
      orderType,
      tif,
      reduceOnly,
      cloid,
    });

    // Record trade in DB
    await db.insert(trades).values({
      userId: user.id,
      agentId: agentId ?? user.id,
      coin,
      pair: `${coin}-USD`,
      side: side === "buy" ? "BUY" : "SELL",
      type: orderType === "market" ? "MARKET" : "LIMIT",
      quantity: Number(size),
      price: result.avgPrice ? Number(result.avgPrice) : 0,
      status: result.status === "filled" ? "FILLED" : "PENDING",
      hlOrderId: String(result.orderId),
      hlCloid: cloid ?? null,
      isPaper: false,
      filledAt: result.status === "filled" ? new Date() : null,
    });

    return NextResponse.json({ ok: true, order: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Order execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = cancelOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { coin, orderId, apiWalletKey } = parsed.data;

  if (!apiWalletKey) {
    return NextResponse.json(
      { error: "API wallet key required for cancellation" },
      { status: 400 }
    );
  }

  try {
    const exchange = await createExchange(apiWalletKey);
    const success = await cancelOrder(exchange, coin, orderId);

    return NextResponse.json({ ok: success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cancel failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
