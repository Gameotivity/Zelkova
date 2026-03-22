import { NextRequest, NextResponse } from "next/server";
import { makeTradingDecision, scanMarkets, explainBotStrategy, BOT_PROFILES } from "@/lib/ai/bot-brain";
import { z } from "zod";

const decisionSchema = z.object({
  action: z.literal("decide"),
  market: z.object({
    pair: z.string(),
    price: z.number(),
    change24h: z.number(),
    volume24h: z.number(),
    high24h: z.number(),
    low24h: z.number(),
    rsi: z.number(),
    emaFast: z.number(),
    emaSlow: z.number(),
    macdHistogram: z.number(),
    volatility: z.number(),
  }),
  botProfile: z.enum(["ALPHA_HUNTER", "STEADY_GRINDER", "SAFE_HARBOR"]),
  recentTrades: z.array(z.object({ side: z.string(), pnl: z.number() })).default([]),
  currentPosition: z.object({
    side: z.string(),
    entryPrice: z.number(),
    unrealizedPnl: z.number(),
  }).nullable().default(null),
});

const scanSchema = z.object({
  action: z.literal("scan"),
  botProfile: z.enum(["ALPHA_HUNTER", "STEADY_GRINDER", "SAFE_HARBOR"]),
  markets: z.array(z.object({
    pair: z.string(),
    price: z.number(),
    change24h: z.number(),
    volume24h: z.number(),
    high24h: z.number(),
    low24h: z.number(),
    rsi: z.number(),
    emaFast: z.number(),
    emaSlow: z.number(),
    macdHistogram: z.number(),
    volatility: z.number(),
  })),
});

const explainSchema = z.object({
  action: z.literal("explain"),
  botType: z.string(),
  strategies: z.array(z.string()),
  riskLevel: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "decide") {
      const parsed = decisionSchema.parse(body);
      const profile = BOT_PROFILES[parsed.botProfile];
      const decision = await makeTradingDecision(
        parsed.market,
        profile,
        parsed.recentTrades,
        parsed.currentPosition
      );
      return NextResponse.json({ decision });
    }

    if (body.action === "scan") {
      const parsed = scanSchema.parse(body);
      const profile = BOT_PROFILES[parsed.botProfile];
      const opportunities = await scanMarkets(parsed.markets, profile);
      return NextResponse.json({ opportunities });
    }

    if (body.action === "explain") {
      const parsed = explainSchema.parse(body);
      const explanation = await explainBotStrategy(
        parsed.botType,
        parsed.strategies,
        parsed.riskLevel
      );
      return NextResponse.json({ explanation });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Bot brain error:", message);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
