import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchMajorTickers,
  fetchTicker,
  fetchLiveCandles,
  fetchOrderBook,
  candleQuerySchema,
  depthQuerySchema,
  tickerQuerySchema,
} from "@/lib/market/live-prices";

const actionSchema = z.enum(["tickers", "candles", "depth"]).default("tickers");

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const actionParsed = actionSchema.safeParse(params.action);

  if (!actionParsed.success) {
    return NextResponse.json(
      { error: "Invalid action. Use: tickers, candles, or depth" },
      { status: 400 }
    );
  }

  const action = actionParsed.data;

  // -----------------------------------------------------------------------
  // Candles
  // -----------------------------------------------------------------------
  if (action === "candles") {
    const parsed = candleQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await fetchLiveCandles(
      parsed.data.pair,
      parsed.data.interval,
      parsed.data.limit
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: 502 }
      );
    }

    return NextResponse.json({ candles: result.data });
  }

  // -----------------------------------------------------------------------
  // Order book depth
  // -----------------------------------------------------------------------
  if (action === "depth") {
    const parsed = depthQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await fetchOrderBook(parsed.data.pair, parsed.data.limit);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: 502 }
      );
    }

    return NextResponse.json({ orderBook: result.data });
  }

  // -----------------------------------------------------------------------
  // Tickers (default)
  // -----------------------------------------------------------------------
  const tickerParsed = tickerQuerySchema.safeParse(params);
  if (!tickerParsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: tickerParsed.error.flatten() },
      { status: 400 }
    );
  }

  const { pair } = tickerParsed.data;

  if (pair) {
    const result = await fetchTicker(pair);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: 502 }
      );
    }
    return NextResponse.json({ ticker: result.data });
  }

  const result = await fetchMajorTickers();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: 502 }
    );
  }

  return NextResponse.json({ tickers: result.data });
}
