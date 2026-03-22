// Demo data for agent detail page when no real data is available

interface DemoTrade {
  id: string;
  pair: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  pnl: number | null;
  fee: number | null;
  status: "PENDING" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED" | "FAILED";
  createdAt: string;
}

interface DemoSignal {
  id: string;
  signalType: string;
  pair: string;
  direction: "BUY" | "SELL" | "LONG" | "SHORT";
  confidence: number;
  indicators: Record<string, unknown> | null;
  createdAt: string;
}

interface DemoPosition {
  id: string;
  pair: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnl: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string;
}

interface DemoAgent {
  id: string;
  name: string;
  status: "DRAFT" | "PAPER" | "LIVE" | "PAUSED" | "STOPPED";
  strategy: string;
  pairs: string[];
  createdAt: string;
  totalPnl: number;
  totalPnlPercent: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  pnlHistory: number[];
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

export function generateDemoAgent(id: string): DemoAgent {
  return {
    id,
    name: "Alpha Momentum Bot",
    status: "LIVE",
    strategy: "macd_crossover",
    pairs: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    createdAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
    totalPnl: 1847.32,
    totalPnlPercent: 8.42,
    winRate: 67.3,
    sharpeRatio: 1.84,
    maxDrawdown: -4.21,
    pnlHistory: [0, 120, 95, 210, 340, 280, 450, 620, 580, 750, 920, 1100, 1050, 1280, 1450, 1620, 1540, 1720, 1847],
  };
}

export function generateDemoTrades(): DemoTrade[] {
  const pairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  return Array.from({ length: 24 }).map((_, i) => {
    const isBuy = i % 3 !== 0;
    const pair = pairs[i % 3];
    const basePrice = pair === "BTCUSDT" ? 67000 : pair === "ETHUSDT" ? 3400 : 145;
    const price = basePrice + (Math.random() - 0.5) * basePrice * 0.02;
    const qty = pair === "BTCUSDT" ? 0.015 : pair === "ETHUSDT" ? 0.3 : 5;
    const pnl = i > 2 ? (Math.random() - 0.35) * 120 : null;
    return {
      id: `trade-${i}`,
      pair,
      side: isBuy ? ("BUY" as const) : ("SELL" as const),
      price: Math.round(price * 100) / 100,
      quantity: qty,
      pnl: pnl !== null ? Math.round(pnl * 100) / 100 : null,
      fee: Math.round(price * qty * 0.001 * 100) / 100,
      status: "FILLED" as const,
      createdAt: hoursAgo(i * 2.5),
    };
  });
}

export function generateDemoSignals(): DemoSignal[] {
  const types = ["MACD Cross", "RSI Oversold", "BB Squeeze", "Volume Spike", "EMA Cross"];
  const pairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  const dirs: DemoSignal["direction"][] = ["BUY", "SELL", "LONG", "SHORT"];

  return Array.from({ length: 15 }).map((_, i) => ({
    id: `signal-${i}`,
    signalType: types[i % types.length],
    pair: pairs[i % pairs.length],
    direction: dirs[i % dirs.length],
    confidence: 0.45 + Math.random() * 0.5,
    indicators: i % 2 === 0 ? { RSI: 32, MACD: "bullish", Volume: "high" } : { BB: "squeeze", EMA: "cross" },
    createdAt: hoursAgo(i * 1.2),
  }));
}

export function generateDemoPositions(): DemoPosition[] {
  return [
    {
      id: "pos-1",
      pair: "BTCUSDT",
      side: "LONG",
      entryPrice: 66450,
      currentPrice: 67120,
      quantity: 0.025,
      unrealizedPnl: 16.75,
      stopLoss: 65800,
      takeProfit: 68500,
      openedAt: hoursAgo(6),
    },
    {
      id: "pos-2",
      pair: "ETHUSDT",
      side: "LONG",
      entryPrice: 3380,
      currentPrice: 3425,
      quantity: 0.5,
      unrealizedPnl: 22.5,
      stopLoss: 3320,
      takeProfit: 3550,
      openedAt: hoursAgo(3),
    },
    {
      id: "pos-3",
      pair: "SOLUSDT",
      side: "SHORT",
      entryPrice: 148.5,
      currentPrice: 146.2,
      quantity: 8,
      unrealizedPnl: 18.4,
      stopLoss: 152,
      takeProfit: 140,
      openedAt: hoursAgo(1.5),
    },
  ];
}
