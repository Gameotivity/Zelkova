export interface PrebuiltBot {
  id: string;
  name: string;
  tagline: string;
  description: string;
  riskLevel: 1 | 2 | 3 | 4 | 5;
  riskLabel: string;
  monthlyReturnRange: string;
  strategies: string[];
  supportedPairs: string[];
  targetPct: number;
  stopLossPct: number;
  icon: string;
  gradient: string;
  borderColor: string;
  liveUsers: number;
  winRate: number;
  defaultConfig: BotConfig;
}

export interface BotConfig {
  strategies: StrategyParam[];
  stopLossPct: number;
  takeProfitPct: number;
  maxPositionSizePct: number;
  maxDailyLossPct: number;
  trailingStop: boolean;
  cooldownMinutes: number;
  capitalAllocation: number;
}

export interface StrategyParam {
  id: string;
  name: string;
  description: string;
  params: Record<string, number | string | boolean>;
  aiExplanation: string;
}

export const PREBUILT_BOTS: PrebuiltBot[] = [
  {
    id: "alpha-hunter",
    name: "Alpha Hunter",
    tagline: "Aggressive returns for bold traders",
    description:
      "Combines RSI momentum, EMA trend confirmation, and breakout detection to catch explosive moves early. Designed for traders who want maximum upside and can handle higher drawdowns.",
    riskLevel: 5,
    riskLabel: "Aggressive",
    monthlyReturnRange: "8-15%",
    strategies: ["RSI Crossover", "EMA Crossover", "Breakout"],
    supportedPairs: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
    targetPct: 15,
    stopLossPct: 8,
    icon: "bolt",
    gradient: "from-rose-500/20 via-orange-500/10 to-transparent",
    borderColor: "border-rose-500/30",
    liveUsers: 342,
    winRate: 64,
    defaultConfig: {
      strategies: [
        {
          id: "RSI_CROSSOVER",
          name: "RSI Crossover",
          description: "Enters on RSI oversold bounces, exits on overbought",
          params: { rsiPeriod: 14, oversoldThreshold: 25, overboughtThreshold: 75, timeframe: "15m" },
          aiExplanation: "Aggressive RSI thresholds (25/75) catch sharper reversals with higher conviction.",
        },
        {
          id: "EMA_CROSSOVER",
          name: "EMA Crossover",
          description: "Fast/slow EMA crossover for trend direction",
          params: { fastEma: 9, slowEma: 21, timeframe: "15m", confirmationCandles: 1 },
          aiExplanation: "Short EMAs (9/21) on 15m timeframe react quickly to emerging trends.",
        },
        {
          id: "BREAKOUT",
          name: "Breakout",
          description: "Detects price breakouts with volume confirmation",
          params: { lookbackPeriod: 20, volumeMultiplier: 2.0, breakoutThreshold: 1.5 },
          aiExplanation: "2x volume spike + 1.5% breakout threshold filters out false breakouts.",
        },
      ],
      stopLossPct: 8,
      takeProfitPct: 15,
      maxPositionSizePct: 20,
      maxDailyLossPct: 5,
      trailingStop: true,
      cooldownMinutes: 3,
      capitalAllocation: 5000,
    },
  },
  {
    id: "steady-grinder",
    name: "Steady Grinder",
    tagline: "Consistent gains, controlled risk",
    description:
      "Blends EMA trend-following with dollar-cost averaging to build positions methodically. Ideal for traders who want reliable returns without wild swings.",
    riskLevel: 3,
    riskLabel: "Balanced",
    monthlyReturnRange: "4-8%",
    strategies: ["EMA Crossover", "DCA Bot"],
    supportedPairs: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"],
    targetPct: 8,
    stopLossPct: 5,
    icon: "chart",
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    borderColor: "border-cyan-500/30",
    liveUsers: 891,
    winRate: 72,
    defaultConfig: {
      strategies: [
        {
          id: "EMA_CROSSOVER",
          name: "EMA Crossover",
          description: "Medium-term trend following with EMA signals",
          params: { fastEma: 12, slowEma: 26, timeframe: "1h", confirmationCandles: 2 },
          aiExplanation: "Classic 12/26 EMAs on 1h provide reliable trend signals with fewer whipsaws.",
        },
        {
          id: "DCA_BOT",
          name: "DCA Bot",
          description: "Systematic dollar-cost averaging on dips",
          params: { interval: "4h", amountPerBuy: 200, priceCondition: "below_ema" },
          aiExplanation: "DCA triggers only below EMA, buying dips rather than at any price.",
        },
      ],
      stopLossPct: 5,
      takeProfitPct: 8,
      maxPositionSizePct: 15,
      maxDailyLossPct: 3,
      trailingStop: true,
      cooldownMinutes: 10,
      capitalAllocation: 3000,
    },
  },
  {
    id: "safe-harbor",
    name: "Safe Harbor",
    tagline: "Capital preservation first",
    description:
      "Uses grid trading for range-bound markets and DCA for steady accumulation. Tight risk controls ensure minimal drawdowns. Built for long-term wealth building.",
    riskLevel: 1,
    riskLabel: "Conservative",
    monthlyReturnRange: "2-4%",
    strategies: ["DCA Bot", "Grid Bot"],
    supportedPairs: ["BTC/USDT", "ETH/USDT"],
    targetPct: 4,
    stopLossPct: 3,
    icon: "shield",
    gradient: "from-emerald-500/20 via-green-500/10 to-transparent",
    borderColor: "border-emerald-500/30",
    liveUsers: 1247,
    winRate: 81,
    defaultConfig: {
      strategies: [
        {
          id: "DCA_BOT",
          name: "DCA Bot",
          description: "Steady accumulation with scheduled buys",
          params: { interval: "daily", amountPerBuy: 100, priceCondition: "any" },
          aiExplanation: "Daily buys smooth out volatility. Works best over 3+ month horizons.",
        },
        {
          id: "GRID_BOT",
          name: "Grid Bot",
          description: "Profits from sideways price action",
          params: { upperPrice: 70000, lowerPrice: 60000, gridCount: 15, investmentAmount: 2000 },
          aiExplanation: "15 grid levels across a 15% range captures micro-profits in consolidation.",
        },
      ],
      stopLossPct: 3,
      takeProfitPct: 4,
      maxPositionSizePct: 10,
      maxDailyLossPct: 2,
      trailingStop: false,
      cooldownMinutes: 30,
      capitalAllocation: 2000,
    },
  },
];

export const TRADING_PAIRS = [
  "BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD", "AVAX-USD",
  "ARB-USD", "OP-USD", "SUI-USD", "APT-USD", "INJ-USD",
  "SEI-USD", "TIA-USD", "LINK-USD", "WIF-USD", "PEPE-USD",
];
