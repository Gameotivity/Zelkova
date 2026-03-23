/**
 * POST /api/ai/analyze — Proxy to HyperAlpha Python service.
 *
 * Forwards ticker analysis requests to the HyperAlpha FastAPI server
 * running on port 8001 and returns the formatted decision.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const HYPERALPHA_URL = process.env.HYPERALPHA_URL || "http://localhost:8001";

const analyzeSchema = z.object({
  ticker: z.string().min(1).max(10).transform((v) => v.toUpperCase()),
});

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const parsed = analyzeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { ticker } = parsed.data;

  try {
    const res = await fetch(`${HYPERALPHA_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
      signal: AbortSignal.timeout(300_000), // 5 minute timeout
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: `HyperAlpha error: ${res.status}`, details: error },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Analysis timed out (5 min limit)" },
        { status: 504 },
      );
    }

    // HyperAlpha service not running
    return NextResponse.json(
      {
        error: "HyperAlpha service unavailable",
        message: "The AI analysis engine is not running. Start it with: cd apps/hyperalpha && python -m hyperalpha.main --mode server",
      },
      { status: 503 },
    );
  }
}

export async function GET() {
  // Health check proxy
  try {
    const res = await fetch(`${HYPERALPHA_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      return NextResponse.json({ status: "degraded" }, { status: 503 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { status: "offline", message: "HyperAlpha service not running" },
      { status: 503 },
    );
  }
}
