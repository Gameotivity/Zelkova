import { NextRequest, NextResponse } from "next/server";
import { getStoredCandles } from "@/lib/exchange/market-data";
import { z } from "zod";
import type { Exchange, CandleInterval } from "@zelkora/shared";

const querySchema = z.object({
  pair: z.string().min(1),
  exchange: z.enum(["binance", "bybit"]).default("binance"),
  interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("1h"),
  limit: z.coerce.number().min(1).max(1000).default(200),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = querySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { pair, exchange, interval, limit } = parsed.data;

    const candles = await getStoredCandles(
      exchange as Exchange,
      pair,
      interval as CandleInterval,
      limit
    );

    return NextResponse.json({ candles });
  } catch (error: any) {
    console.error("Market data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch candles" },
      { status: 500 }
    );
  }
}
