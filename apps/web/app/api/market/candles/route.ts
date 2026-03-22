import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const HL_INFO_URL = "https://api.hyperliquid.xyz/info";

const querySchema = z.object({
  coin: z.string().min(1),
  interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("1h"),
  limit: z.coerce.number().min(1).max(1000).default(200),
});

interface HLCandle {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { coin, interval, limit } = parsed.data;
  const now = Date.now();
  const intervalMs: Record<string, number> = {
    "1m": 60_000,
    "5m": 300_000,
    "15m": 900_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
  };
  const startTime = now - (intervalMs[interval] ?? 3_600_000) * limit;

  const res = await fetch(HL_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: { coin, interval, startTime, endTime: now },
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch candles from Hyperliquid" },
      { status: 502 },
    );
  }

  const raw: HLCandle[] = await res.json();

  const candles = raw.slice(-limit).map((c) => ({
    openTime: c.t,
    open: parseFloat(c.o),
    high: parseFloat(c.h),
    low: parseFloat(c.l),
    close: parseFloat(c.c),
    volume: parseFloat(c.v),
  }));

  return NextResponse.json({ candles });
}
