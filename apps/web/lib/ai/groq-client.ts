/**
 * Groq AI client — uses Llama 3.1 70B (free tier)
 * OpenAI-compatible API for strategy suggestions and market analysis
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-70b-versatile";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage: { total_tokens: number };
}

async function groqChat(
  messages: ChatMessage[],
  temperature = 0.3,
  maxTokens = 1024
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
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data: GroqResponse = await res.json();
  return data.choices[0]?.message?.content || "";
}

/** Get AI strategy parameter suggestions based on market conditions */
export async function suggestStrategyParams(
  strategy: string,
  pair: string,
  currentPrice: number,
  volatility24h: number
): Promise<Record<string, any>> {
  const response = await groqChat([
    {
      role: "system",
      content:
        "You are a quantitative trading assistant. Return ONLY valid JSON with suggested parameters. No explanations.",
    },
    {
      role: "user",
      content: `Suggest optimal parameters for a ${strategy} strategy on ${pair}.
Current price: $${currentPrice}
24h volatility: ${volatility24h.toFixed(2)}%

Return JSON with the strategy parameters. For RSI_CROSSOVER: {rsiPeriod, oversoldThreshold, overboughtThreshold, timeframe}.
For EMA_CROSSOVER: {fastEma, slowEma, timeframe, confirmationCandles}.
For BREAKOUT: {lookbackPeriod, volumeMultiplier, breakoutThreshold}.
For GRID_BOT: {upperPrice, lowerPrice, gridCount, investmentAmount}.
For DCA_BOT: {interval, amountPerBuy, priceCondition}.`,
    },
  ]);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    return {};
  }
}

/** AI market analysis for a trading pair */
export async function analyzeMarket(
  pair: string,
  recentCandles: Array<{ close: number; volume: number; time: number }>,
  rsi: number,
  macdHistogram: number
): Promise<{
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  summary: string;
}> {
  const closes = recentCandles.map((c) => c.close);
  const priceChange =
    closes.length > 1
      ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100
      : 0;

  const response = await groqChat([
    {
      role: "system",
      content:
        'You are a crypto market analyst. Respond ONLY with JSON: {"sentiment": "BULLISH"|"BEARISH"|"NEUTRAL", "confidence": 0-100, "summary": "one sentence"}',
    },
    {
      role: "user",
      content: `Analyze ${pair}:
- Price change (period): ${priceChange.toFixed(2)}%
- Current RSI: ${rsi.toFixed(1)}
- MACD Histogram: ${macdHistogram.toFixed(4)}
- Current price: $${closes[closes.length - 1]?.toFixed(2)}
- Volume trend: ${recentCandles[recentCandles.length - 1]?.volume > recentCandles[0]?.volume ? "increasing" : "decreasing"}`,
    },
  ]);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sentiment: parsed.sentiment || "NEUTRAL",
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        summary: parsed.summary || "Unable to analyze",
      };
    }
  } catch {
    // fallback
  }

  return { sentiment: "NEUTRAL", confidence: 50, summary: "Analysis unavailable" };
}

/** Generate a plain-english explanation of an agent's performance */
export async function explainPerformance(
  agentName: string,
  strategy: string,
  totalTrades: number,
  winRate: number,
  totalPnl: number,
  avgHoldTime: string
): Promise<string> {
  const response = await groqChat(
    [
      {
        role: "system",
        content:
          "You are a trading performance analyst. Give a brief, actionable 2-3 sentence analysis.",
      },
      {
        role: "user",
        content: `Agent "${agentName}" using ${strategy}:
- Total trades: ${totalTrades}
- Win rate: ${winRate.toFixed(1)}%
- Total P&L: $${totalPnl.toFixed(2)}
- Avg hold time: ${avgHoldTime}

What's the assessment and one improvement suggestion?`,
      },
    ],
    0.5,
    200
  );

  return response;
}
