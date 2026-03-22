// ---------------------------------------------------------------------------
// POST /api/strategy/backtest — Run a backtest on historical candle data
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { backtestConfigSchema } from "@/lib/strategy/validation";
import { runBacktest } from "@/lib/strategy/backtest-engine";
import { fetchLiveCandles } from "@/lib/market/live-prices";
import type { BacktestConfig } from "@/lib/strategy/types";

// ---------------------------------------------------------------------------
// Error response helper
// ---------------------------------------------------------------------------

interface ApiError {
  code: "VALIDATION_ERROR" | "FETCH_ERROR" | "BACKTEST_ERROR";
  message: string;
}

function errorResponse(error: ApiError, status: number): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      400
    );
  }

  // Validate with Zod
  const parsed = backtestConfigSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      400
    );
  }

  const config: BacktestConfig = parsed.data;

  // Validate date range
  const start = new Date(config.startDate).getTime();
  const end = new Date(config.endDate).getTime();
  if (start >= end) {
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "startDate must be before endDate" },
      400
    );
  }

  // Fetch candle data
  const candleResult = await fetchLiveCandles(
    config.symbol,
    config.strategy.timeframe,
    1000
  );

  if (!candleResult.ok) {
    return errorResponse(
      { code: "FETCH_ERROR", message: candleResult.error.message },
      502
    );
  }

  const candles = candleResult.data;
  if (candles.length < 10) {
    return errorResponse(
      {
        code: "FETCH_ERROR",
        message: `Insufficient candle data: got ${candles.length}, need at least 10`,
      },
      422
    );
  }

  // Filter candles to date range (if range overlaps with available data)
  const filtered = candles.filter(
    (c) => c.openTime >= start && c.openTime <= end
  );

  // Use filtered if we have enough, otherwise use all candles (Binance only returns recent)
  const backtestCandles = filtered.length >= 10 ? filtered : candles;

  if (backtestCandles.length < 10) {
    return errorResponse(
      {
        code: "FETCH_ERROR",
        message: `Only ${backtestCandles.length} candles available, need at least 10`,
      },
      422
    );
  }

  // Run backtest
  try {
    const result = runBacktest(config, backtestCandles);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown backtest error";
    return errorResponse(
      { code: "BACKTEST_ERROR", message },
      500
    );
  }
}
