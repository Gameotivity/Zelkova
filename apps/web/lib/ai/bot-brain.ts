/**
 * Bot Brain — The autonomous intelligence layer that powers Zelkora bots.
 * Uses Groq (Llama 3.1 70B) to make real trading decisions.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-70b-versatile";

interface MarketSnapshot {
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  rsi: number;
  emaFast: number;
  emaSlow: number;
  macdHistogram: number;
  volatility: number;
}

interface BotDecision {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasoning: string;
  suggestedEntry: number;
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  riskRewardRatio: number;
  positionSizePct: number;
}

interface BotProfile {
  type: "ALPHA_HUNTER" | "STEADY_GRINDER" | "SAFE_HARBOR" | "CUSTOM";
  riskTolerance: "HIGH" | "MEDIUM" | "LOW";
  targetReturnPct: number;
  maxDrawdownPct: number;
}

async function queryGroq(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: 512,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractJSON(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/** Core decision engine — the bot's brain */
export async function makeTradingDecision(
  market: MarketSnapshot,
  profile: BotProfile,
  recentTrades: Array<{ side: string; pnl: number }>,
  currentPosition: { side: string; entryPrice: number; unrealizedPnl: number } | null
): Promise<BotDecision> {
  const winRate = recentTrades.length > 0
    ? (recentTrades.filter((t) => t.pnl > 0).length / recentTrades.length) * 100
    : 50;

  const systemPrompt = `You are an elite autonomous crypto trading bot. You analyze markets and make decisive trading calls.

Your profile: ${profile.type} (${profile.riskTolerance} risk)
Target: ${profile.targetReturnPct}% monthly return
Max drawdown: ${profile.maxDrawdownPct}%

Rules:
- ONLY respond with valid JSON
- confidence must be 0-100
- positionSizePct must be 1-${profile.riskTolerance === "HIGH" ? 25 : profile.riskTolerance === "MEDIUM" ? 15 : 8}
- If already in a position, evaluate whether to HOLD or SELL
- Never chase a pump. Wait for pullbacks.
- Risk/reward ratio must be >= 1.5 for entries
- Factor in recent win rate: ${winRate.toFixed(0)}%`;

  const userPrompt = `Market: ${market.pair}
Price: $${market.price.toFixed(2)}
24h Change: ${market.change24h.toFixed(2)}%
24h Volume: $${(market.volume24h / 1e6).toFixed(1)}M
24h Range: $${market.low24h.toFixed(2)} - $${market.high24h.toFixed(2)}
RSI(14): ${market.rsi.toFixed(1)}
EMA(9): $${market.emaFast.toFixed(2)}
EMA(21): $${market.emaSlow.toFixed(2)}
MACD Histogram: ${market.macdHistogram.toFixed(4)}
Volatility: ${market.volatility.toFixed(2)}%
${currentPosition ? `Current position: ${currentPosition.side} @ $${currentPosition.entryPrice.toFixed(2)} (P&L: $${currentPosition.unrealizedPnl.toFixed(2)})` : "No open position"}

Respond ONLY with JSON:
{"action":"BUY"|"SELL"|"HOLD","confidence":0-100,"reasoning":"brief reason","suggestedEntry":price,"suggestedStopLoss":price,"suggestedTakeProfit":price,"riskRewardRatio":number,"positionSizePct":number}`;

  const response = await queryGroq(systemPrompt, userPrompt);
  const parsed = extractJSON(response);

  if (!parsed) {
    return {
      action: "HOLD",
      confidence: 0,
      reasoning: "Failed to parse AI response",
      suggestedEntry: market.price,
      suggestedStopLoss: market.price * 0.95,
      suggestedTakeProfit: market.price * 1.1,
      riskRewardRatio: 2,
      positionSizePct: 5,
    };
  }

  return {
    action: (parsed.action as "BUY" | "SELL" | "HOLD") || "HOLD",
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
    reasoning: String(parsed.reasoning || "No reasoning provided"),
    suggestedEntry: Number(parsed.suggestedEntry) || market.price,
    suggestedStopLoss: Number(parsed.suggestedStopLoss) || market.price * 0.95,
    suggestedTakeProfit: Number(parsed.suggestedTakeProfit) || market.price * 1.1,
    riskRewardRatio: Number(parsed.riskRewardRatio) || 2,
    positionSizePct: Math.min(25, Math.max(1, Number(parsed.positionSizePct) || 5)),
  };
}

/** Multi-pair market scan — find the best opportunities */
export async function scanMarkets(
  markets: MarketSnapshot[],
  profile: BotProfile
): Promise<Array<{ pair: string; signal: string; confidence: number; reasoning: string }>> {
  const pairs = markets.map((m) => `${m.pair}: $${m.price.toFixed(2)} (${m.change24h > 0 ? "+" : ""}${m.change24h.toFixed(2)}%, RSI: ${m.rsi.toFixed(0)}, Vol: ${m.volatility.toFixed(1)}%)`).join("\n");

  const response = await queryGroq(
    `You are a market scanner for a ${profile.riskTolerance} risk crypto trading bot. Find the best 3 opportunities. Respond ONLY with a JSON array.`,
    `Scan these markets and rank the top 3 opportunities:\n${pairs}\n\nRespond with JSON array: [{"pair":"BTCUSDT","signal":"BUY"|"SELL","confidence":0-100,"reasoning":"brief"}]`,
    0.3
  );

  const match = response.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const results = JSON.parse(match[0]);
    return results.map((r: Record<string, unknown>) => ({
      pair: String(r.pair || ""),
      signal: String(r.signal || "HOLD"),
      confidence: Math.min(100, Math.max(0, Number(r.confidence) || 0)),
      reasoning: String(r.reasoning || ""),
    }));
  } catch {
    return [];
  }
}

/** Generate a bot strategy explanation for the UI */
export async function explainBotStrategy(
  botType: string,
  strategies: string[],
  riskLevel: string
): Promise<string> {
  const response = await queryGroq(
    "You are a trading advisor. Explain bot strategies in 2-3 clear, confident sentences. No jargon. Make it sound professional.",
    `Explain how the "${botType}" bot works. It uses: ${strategies.join(", ")}. Risk level: ${riskLevel}.`
  );
  return response;
}

/** Pre-built bot profiles */
export const BOT_PROFILES: Record<string, BotProfile> = {
  ALPHA_HUNTER: {
    type: "ALPHA_HUNTER",
    riskTolerance: "HIGH",
    targetReturnPct: 15,
    maxDrawdownPct: 8,
  },
  STEADY_GRINDER: {
    type: "STEADY_GRINDER",
    riskTolerance: "MEDIUM",
    targetReturnPct: 8,
    maxDrawdownPct: 5,
  },
  SAFE_HARBOR: {
    type: "SAFE_HARBOR",
    riskTolerance: "LOW",
    targetReturnPct: 4,
    maxDrawdownPct: 3,
  },
};
