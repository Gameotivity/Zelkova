import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, users, trades, paperAccounts } from "@/lib/db/schema";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getMidPrices } from "@/lib/hyperliquid/market-service";

// ---------------------------------------------------------------------------
// Auth helper (mirrors /api/trade/order pattern)
// ---------------------------------------------------------------------------

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
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user ?? null;
}

// ---------------------------------------------------------------------------
// Get or create paper account
// ---------------------------------------------------------------------------

async function getOrCreatePaperAccount(userId: string) {
  const [existing] = await db
    .select()
    .from(paperAccounts)
    .where(eq(paperAccounts.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(paperAccounts)
    .values({
      userId,
      startingBalance: 1000,
      currentBalance: 1000,
      totalPnl: 0,
      totalTrades: 0,
      resetCount: 0,
    })
    .returning();

  return created;
}

// ---------------------------------------------------------------------------
// GET — Demo account state + recent trades
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await getOrCreatePaperAccount(user.id);

  const recentTrades = await db
    .select()
    .from(trades)
    .where(and(eq(trades.userId, user.id), eq(trades.isPaper, true)))
    .orderBy(desc(trades.createdAt))
    .limit(50);

  return NextResponse.json({ account, trades: recentTrades });
}

// ---------------------------------------------------------------------------
// POST — Place a paper trade
// ---------------------------------------------------------------------------

const placeTradeSchema = z.object({
  coin: z.string().min(1).max(20),
  side: z.enum(["buy", "sell"]),
  sizeUsd: z.number().min(1),
  orderType: z.enum(["market", "limit"]),
  price: z.number().positive().optional(),
  stopLossPct: z.number().min(0).max(100).optional(),
  takeProfitPct: z.number().min(0).max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = placeTradeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { coin, side, sizeUsd, orderType, price: limitPrice } = parsed.data;

  const account = await getOrCreatePaperAccount(user.id);

  // Check sufficient balance
  if (sizeUsd > account.currentBalance) {
    return NextResponse.json(
      { error: "Insufficient demo balance" },
      { status: 400 }
    );
  }

  // Fetch live price from Hyperliquid
  const mids = await getMidPrices();
  const livePrice = parseFloat(mids[coin] || "0");

  if (livePrice <= 0) {
    return NextResponse.json(
      { error: `No market price available for ${coin}` },
      { status: 400 }
    );
  }

  // Determine execution price
  const basePrice = orderType === "limit" && limitPrice ? limitPrice : livePrice;

  // Simulate slippage (2-10 bps)
  const slippage = 0.0002 + Math.random() * 0.0008;
  const execPrice =
    side === "buy"
      ? basePrice * (1 + slippage)
      : basePrice * (1 - slippage);

  // Calculate quantity and fee
  const quantity = sizeUsd / execPrice;
  const fee = sizeUsd * 0.00035; // HL taker fee

  // Insert paper trade
  const [trade] = await db
    .insert(trades)
    .values({
      userId: user.id,
      agentId: user.id,
      coin,
      pair: `${coin}-USD`,
      side: side === "buy" ? "BUY" : "SELL",
      type: orderType === "market" ? "MARKET" : "LIMIT",
      quantity,
      price: execPrice,
      fee,
      status: "FILLED",
      isPaper: true,
      filledAt: new Date(),
    })
    .returning();

  // Update paper account
  await db
    .update(paperAccounts)
    .set({
      currentBalance: sql`${paperAccounts.currentBalance} - ${sizeUsd + fee}`,
      totalTrades: sql`${paperAccounts.totalTrades} + 1`,
      totalPnl: sql`${paperAccounts.totalPnl} - ${fee}`,
      updatedAt: new Date(),
    })
    .where(eq(paperAccounts.userId, user.id));

  return NextResponse.json({ ok: true, trade });
}

// ---------------------------------------------------------------------------
// DELETE — Reset demo account
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete all paper trades for this user
  await db
    .delete(trades)
    .where(and(eq(trades.userId, user.id), eq(trades.isPaper, true)));

  // Reset paper account
  await db
    .update(paperAccounts)
    .set({
      startingBalance: 1000,
      currentBalance: 1000,
      totalPnl: 0,
      totalTrades: 0,
      resetCount: sql`${paperAccounts.resetCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(paperAccounts.userId, user.id));

  return NextResponse.json({ ok: true });
}
