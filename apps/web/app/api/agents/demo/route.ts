// ---------------------------------------------------------------------------
// POST /api/agents/demo — Create a demo agent with simulated paper trades
// Uses real market data + strategy engine to generate realistic trades
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, trades, positions, signals, sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { fetchMajorTickers, fetchLiveCandles } from "@/lib/market/live-prices";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("zelkora-session")?.value;
  if (!token) return null;
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date())))
    .limit(1);
  return session?.userId ?? null;
}

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const demoSchema = z.object({
  template: z.enum(["alpha-hunter", "steady-grinder", "safe-harbor"]).default("alpha-hunter"),
});

// ---------------------------------------------------------------------------
// Demo bot configs
// ---------------------------------------------------------------------------

const DEMO_CONFIGS = {
  "alpha-hunter": {
    name: "Alpha Hunter Demo",
    strategy: "RSI + EMA Crossover",
    pairs: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    riskConfig: {
      stopLossPct: 3,
      takeProfitPct: 6,
      maxPositionSizePct: 20,
      maxDailyLossPct: 5,
      trailingStop: true,
      cooldownMinutes: 15,
    },
    strategyConfig: {
      strategies: [
        { name: "RSI Crossover", params: { rsiPeriod: 14, overbought: 70, oversold: 30 } },
        { name: "EMA Crossover", params: { fastPeriod: 9, slowPeriod: 21 } },
      ],
    },
  },
  "steady-grinder": {
    name: "Steady Grinder Demo",
    strategy: "EMA + DCA",
    pairs: ["BTCUSDT", "ETHUSDT"],
    riskConfig: {
      stopLossPct: 2,
      takeProfitPct: 4,
      maxPositionSizePct: 15,
      maxDailyLossPct: 3,
      trailingStop: false,
      cooldownMinutes: 30,
    },
    strategyConfig: {
      strategies: [
        { name: "EMA Crossover", params: { fastPeriod: 12, slowPeriod: 26 } },
        { name: "DCA Bot", params: { intervalHours: 4, amount: 100 } },
      ],
    },
  },
  "safe-harbor": {
    name: "Safe Harbor Demo",
    strategy: "DCA + Grid",
    pairs: ["BTCUSDT"],
    riskConfig: {
      stopLossPct: 1.5,
      takeProfitPct: 3,
      maxPositionSizePct: 10,
      maxDailyLossPct: 2,
      trailingStop: false,
      cooldownMinutes: 60,
    },
    strategyConfig: {
      strategies: [
        { name: "DCA Bot", params: { intervalHours: 6, amount: 50 } },
        { name: "Grid Bot", params: { gridLevels: 5, rangePercent: 2 } },
      ],
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Generate realistic demo trades from real candle data
// ---------------------------------------------------------------------------

interface DemoTrade {
  pair: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  pnl: number;
  fee: number;
  filledAt: Date;
}

interface DemoConfig {
  riskConfig: {
    readonly stopLossPct: number;
    readonly takeProfitPct: number;
    readonly maxPositionSizePct: number;
    readonly maxDailyLossPct: number;
    readonly trailingStop: boolean;
    readonly cooldownMinutes: number;
  };
}

async function generateDemoTrades(
  pairs: string[],
  config: DemoConfig
): Promise<DemoTrade[]> {
  const demoTrades: DemoTrade[] = [];
  const now = Date.now();

  for (const pair of pairs) {
    const candleResult = await fetchLiveCandles(pair, "1h", 200);
    if (!candleResult.ok) continue;

    const candles = candleResult.data;
    if (candles.length < 50) continue;

    // Simulate trades using simple RSI-like logic on real candle data
    let inPosition = false;
    let entryPrice = 0;
    let entryIdx = 0;

    for (let i = 30; i < candles.length; i++) {
      const c = candles[i];
      // Simple momentum detection from real data
      const shortMA = candles.slice(i - 9, i).reduce((s, x) => s + x.close, 0) / 9;
      const longMA = candles.slice(i - 21, i).reduce((s, x) => s + x.close, 0) / 21;
      const prevShortMA = candles.slice(i - 10, i - 1).reduce((s, x) => s + x.close, 0) / 9;
      const prevLongMA = candles.slice(i - 22, i - 1).reduce((s, x) => s + x.close, 0) / 21;

      if (!inPosition && prevShortMA <= prevLongMA && shortMA > longMA) {
        // Buy signal
        inPosition = true;
        entryPrice = c.close;
        entryIdx = i;
        const qty = (1000 * config.riskConfig.maxPositionSizePct / 100) / c.close;
        const fee = qty * c.close * 0.001;

        demoTrades.push({
          pair,
          side: "BUY",
          price: c.close,
          quantity: parseFloat(qty.toFixed(6)),
          pnl: 0,
          fee: parseFloat(fee.toFixed(4)),
          filledAt: new Date(c.openTime),
        });
      } else if (inPosition && (
        (prevShortMA >= prevLongMA && shortMA < longMA) ||
        (c.close <= entryPrice * (1 - config.riskConfig.stopLossPct / 100)) ||
        (c.close >= entryPrice * (1 + config.riskConfig.takeProfitPct / 100)) ||
        (i - entryIdx > 20)
      )) {
        // Sell signal
        const qty = demoTrades[demoTrades.length - 1].quantity;
        const pnl = (c.close - entryPrice) * qty;
        const fee = qty * c.close * 0.001;

        demoTrades.push({
          pair,
          side: "SELL",
          price: c.close,
          quantity: qty,
          pnl: parseFloat(pnl.toFixed(4)),
          fee: parseFloat(fee.toFixed(4)),
          filledAt: new Date(c.openTime),
        });
        inPosition = false;
      }
    }
  }

  return demoTrades;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = demoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }

  const template = parsed.data.template;
  const config = DEMO_CONFIGS[template];

  // Create the demo agent
  const [agent] = await db
    .insert(agents)
    .values({
      userId,
      name: config.name,
      status: "PAPER",
      pairs: [...config.pairs] as string[],
      strategy: config.strategy,
      strategyConfig: config.strategyConfig as Record<string, unknown>,
      riskConfig: { ...config.riskConfig, maxLeverage: 5 },
    })
    .returning();

  // Generate demo trades from real market data
  const demoTrades = await generateDemoTrades([...config.pairs], config);

  // Insert trades into DB
  if (demoTrades.length > 0) {
    await db.insert(trades).values(
      demoTrades.map((t) => ({
        agentId: agent.id,
        userId,
        coin: t.pair.replace("USDT", ""),
        pair: t.pair,
        side: t.side,
        type: "MARKET" as const,
        quantity: t.quantity,
        price: t.price,
        fee: t.fee,
        pnl: t.pnl,
        status: "FILLED" as const,
        isPaper: true,
        filledAt: t.filledAt,
      }))
    );
  }

  // Generate signals from trades
  const demoSignals = demoTrades.map((t) => ({
    agentId: agent.id,
    signalType: t.side === "BUY" ? "ENTRY" : "EXIT",
    pair: t.pair,
    direction: t.side === "BUY" ? "LONG" : "CLOSE",
    confidence: 0.65 + Math.random() * 0.3,
    indicators: {
      ema9: t.price * (1 + (Math.random() - 0.5) * 0.001),
      ema21: t.price * (1 + (Math.random() - 0.5) * 0.002),
      rsi: 30 + Math.random() * 40,
    },
    createdAt: t.filledAt,
  }));

  if (demoSignals.length > 0) {
    await db.insert(signals).values(demoSignals);
  }

  // Create an open position from latest ticker for the first pair
  const tickerResult = await fetchMajorTickers();
  if (tickerResult.ok) {
    const pair = config.pairs[0];
    const ticker = tickerResult.data.find((t) => t.symbol === pair);
    if (ticker) {
      const entryPx = ticker.lastPrice * (1 - 0.005);
      const qty = (1000 * config.riskConfig.maxPositionSizePct / 100) / entryPx;
      const unrealizedPnl = (ticker.lastPrice - entryPx) * qty;

      await db.insert(positions).values({
        agentId: agent.id,
        coin: pair.replace("USDT", ""),
        pair,
        side: "LONG",
        entryPrice: parseFloat(entryPx.toFixed(2)),
        currentPrice: ticker.lastPrice,
        quantity: parseFloat(qty.toFixed(6)),
        leverage: 1,
        unrealizedPnl: parseFloat(unrealizedPnl.toFixed(4)),
        stopLoss: parseFloat((entryPx * (1 - config.riskConfig.stopLossPct / 100)).toFixed(2)),
        takeProfit: parseFloat((entryPx * (1 + config.riskConfig.takeProfitPct / 100)).toFixed(2)),
        isOpen: true,
      });
    }
  }

  // Calculate totals
  const totalPnl = demoTrades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = demoTrades.filter((t) => t.side === "SELL" && t.pnl > 0).length;
  const sells = demoTrades.filter((t) => t.side === "SELL").length;
  const winRate = sells > 0 ? wins / sells : 0;

  return NextResponse.json({
    ok: true,
    agent: {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      strategy: agent.strategy,
      pairs: config.pairs,
    },
    stats: {
      totalTrades: demoTrades.length,
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      winRate: parseFloat((winRate * 100).toFixed(1)),
      openPositions: 1,
    },
  });
}
