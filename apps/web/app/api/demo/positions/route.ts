import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sessions,
  users,
  trades,
  paperAccounts,
} from "@/lib/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
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
// Position calculation types
// ---------------------------------------------------------------------------

interface OpenPosition {
  coin: string;
  side: "LONG" | "SHORT";
  netQuantity: number;
  avgEntryPrice: number;
  totalCostBasis: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

// ---------------------------------------------------------------------------
// Build net positions from paper trades
// ---------------------------------------------------------------------------

interface CoinAccumulator {
  buyQty: number;
  sellQty: number;
  buyCost: number; // sum of (qty * price) for buys
  sellCost: number; // sum of (qty * price) for sells
}

function buildPositions(
  paperTrades: Array<{
    coin: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
  }>,
  livePrices: Record<string, string>
): OpenPosition[] {
  const coinMap = new Map<string, CoinAccumulator>();

  for (const t of paperTrades) {
    const acc = coinMap.get(t.coin) ?? {
      buyQty: 0,
      sellQty: 0,
      buyCost: 0,
      sellCost: 0,
    };

    if (t.side === "BUY") {
      acc.buyQty += t.quantity;
      acc.buyCost += t.quantity * t.price;
    } else {
      acc.sellQty += t.quantity;
      acc.sellCost += t.quantity * t.price;
    }

    coinMap.set(t.coin, acc);
  }

  const positions: OpenPosition[] = [];

  for (const [coin, acc] of Array.from(coinMap.entries())) {
    const netQty = acc.buyQty - acc.sellQty;
    if (Math.abs(netQty) < 1e-10) continue; // no open position

    const currentPrice = parseFloat(livePrices[coin] || "0");
    if (currentPrice <= 0) continue;

    const isLong = netQty > 0;
    const absQty = Math.abs(netQty);

    // Weighted average entry price
    const avgEntryPrice = isLong
      ? acc.buyCost / acc.buyQty
      : acc.sellCost / acc.sellQty;

    const totalCostBasis = absQty * avgEntryPrice;

    // Unrealized P&L
    const unrealizedPnl = isLong
      ? absQty * (currentPrice - avgEntryPrice)
      : absQty * (avgEntryPrice - currentPrice);

    const unrealizedPnlPct =
      totalCostBasis > 0 ? (unrealizedPnl / totalCostBasis) * 100 : 0;

    positions.push({
      coin,
      side: isLong ? "LONG" : "SHORT",
      netQuantity: absQty,
      avgEntryPrice,
      totalCostBasis,
      currentPrice,
      unrealizedPnl,
      unrealizedPnlPct,
    });
  }

  return positions;
}

// ---------------------------------------------------------------------------
// GET — Open paper positions with live prices
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all filled paper trades
  const paperTrades = await db
    .select({
      coin: trades.coin,
      side: trades.side,
      quantity: trades.quantity,
      price: trades.price,
    })
    .from(trades)
    .where(
      and(
        eq(trades.userId, user.id),
        eq(trades.isPaper, true),
        eq(trades.status, "FILLED")
      )
    );

  if (paperTrades.length === 0) {
    return NextResponse.json({ positions: [] });
  }

  // Fetch live prices from Hyperliquid
  const mids = await getMidPrices();

  const positions = buildPositions(paperTrades, mids);

  return NextResponse.json({ positions });
}

// ---------------------------------------------------------------------------
// POST — Close a paper position
// ---------------------------------------------------------------------------

const closePositionSchema = z.object({
  coin: z.string().min(1).max(20),
});

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = closePositionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { coin } = parsed.data;

  // Fetch all filled paper trades for this coin
  const paperTrades = await db
    .select({
      coin: trades.coin,
      side: trades.side,
      quantity: trades.quantity,
      price: trades.price,
    })
    .from(trades)
    .where(
      and(
        eq(trades.userId, user.id),
        eq(trades.isPaper, true),
        eq(trades.status, "FILLED"),
        eq(trades.coin, coin)
      )
    );

  // Build position for just this coin
  const mids = await getMidPrices();
  const positions = buildPositions(paperTrades, mids);
  const position = positions.find((p) => p.coin === coin);

  if (!position) {
    return NextResponse.json(
      { error: `No open position for ${coin}` },
      { status: 404 }
    );
  }

  const currentPrice = parseFloat(mids[coin] || "0");
  if (currentPrice <= 0) {
    return NextResponse.json(
      { error: `No market price available for ${coin}` },
      { status: 400 }
    );
  }

  // Apply slippage to close price
  const slippage = 0.0002 + Math.random() * 0.0008;
  const closeSide = position.side === "LONG" ? "SELL" : "BUY";
  const closePrice =
    closeSide === "SELL"
      ? currentPrice * (1 - slippage)
      : currentPrice * (1 + slippage);

  const sizeUsd = position.netQuantity * closePrice;
  const fee = sizeUsd * 0.00035;

  // Calculate realized P&L
  const pnl =
    position.side === "LONG"
      ? position.netQuantity * (closePrice - position.avgEntryPrice)
      : position.netQuantity * (position.avgEntryPrice - closePrice);

  // Insert closing trade
  await db.insert(trades).values({
    userId: user.id,
    agentId: user.id,
    coin,
    pair: `${coin}-USD`,
    side: closeSide === "SELL" ? "SELL" : "BUY",
    type: "MARKET",
    quantity: position.netQuantity,
    price: closePrice,
    fee,
    pnl,
    status: "FILLED",
    isPaper: true,
    filledAt: new Date(),
  });

  // Update paper account: return original cost basis + P&L - fee
  await db
    .update(paperAccounts)
    .set({
      currentBalance: sql`${paperAccounts.currentBalance} + ${sizeUsd + pnl - fee}`,
      totalPnl: sql`${paperAccounts.totalPnl} + ${pnl - fee}`,
      totalTrades: sql`${paperAccounts.totalTrades} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(paperAccounts.userId, user.id));

  return NextResponse.json({
    ok: true,
    pnl,
    closePrice,
    fee,
    side: closeSide,
    quantity: position.netQuantity,
  });
}
