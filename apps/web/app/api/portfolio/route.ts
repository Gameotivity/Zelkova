import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

const HL_INFO_URL = "https://api.hyperliquid.xyz/info";

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

interface HlPosition {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  leverage: { type: string; value: number };
  liquidationPx: string | null;
  returnOnEquity: string;
}

interface HlClearinghouseState {
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  assetPositions: Array<{
    position: HlPosition;
  }>;
}

async function getWalletAddress(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ walletAddress: users.walletAddress })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.walletAddress ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const walletAddress = await getWalletAddress(userId);
  if (!walletAddress) {
    return NextResponse.json(
      { error: "No wallet address linked" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(HL_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "clearinghouseState",
        user: walletAddress,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch portfolio from Hyperliquid" },
        { status: 502 }
      );
    }

    const state = (await res.json()) as HlClearinghouseState;
    const margin = state.marginSummary;

    const positions = state.assetPositions
      .filter((ap) => parseFloat(ap.position.szi) !== 0)
      .map((ap) => ({
        coin: ap.position.coin,
        size: parseFloat(ap.position.szi),
        entryPrice: parseFloat(ap.position.entryPx),
        positionValue: parseFloat(ap.position.positionValue),
        unrealizedPnl: parseFloat(ap.position.unrealizedPnl),
        leverage: ap.position.leverage,
        liquidationPrice: ap.position.liquidationPx
          ? parseFloat(ap.position.liquidationPx)
          : null,
        returnOnEquity: parseFloat(ap.position.returnOnEquity),
      }));

    return NextResponse.json({
      accountValue: parseFloat(margin.accountValue),
      totalMarginUsed: parseFloat(margin.totalMarginUsed),
      totalNotionalPosition: parseFloat(margin.totalNtlPos),
      totalRawUsd: parseFloat(margin.totalRawUsd),
      positions,
    });
  } catch {
    return NextResponse.json(
      { error: "Hyperliquid API request failed" },
      { status: 502 }
    );
  }
}
