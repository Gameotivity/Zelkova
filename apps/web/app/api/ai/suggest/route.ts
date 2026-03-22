import { NextRequest, NextResponse } from "next/server";
import { suggestStrategyParams, analyzeMarket } from "@/lib/ai/groq-client";
import { z } from "zod";

const suggestSchema = z.object({
  strategy: z.string(),
  pair: z.string(),
  currentPrice: z.number(),
  volatility24h: z.number().default(5),
});

const analyzeSchema = z.object({
  pair: z.string(),
  candles: z.array(z.object({
    close: z.number(),
    volume: z.number(),
    time: z.number(),
  })),
  rsi: z.number(),
  macdHistogram: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "suggest") {
      const parsed = suggestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }
      const params = await suggestStrategyParams(
        parsed.data.strategy,
        parsed.data.pair,
        parsed.data.currentPrice,
        parsed.data.volatility24h
      );
      return NextResponse.json({ params });
    }

    if (action === "analyze") {
      const parsed = analyzeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }
      const analysis = await analyzeMarket(
        parsed.data.pair,
        parsed.data.candles,
        parsed.data.rsi,
        parsed.data.macdHistogram
      );
      return NextResponse.json({ analysis });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("AI API error:", error);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 500 }
    );
  }
}
