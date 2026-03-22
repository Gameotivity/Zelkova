export type AgentType = "PERPS";

export type AgentStatus = "DRAFT" | "PAPER" | "LIVE" | "PAUSED" | "STOPPED";

export type OrderSide = "BUY" | "SELL";

export type OrderType = "MARKET" | "LIMIT" | "TRIGGER";

export type TradeStatus = "PENDING" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED" | "FAILED";

export type PositionSide = "LONG" | "SHORT";

export type MarginMode = "CROSS" | "ISOLATED";

export type SubscriptionTier = "FREE" | "PRO" | "ELITE";

export type SignalDirection = "BUY" | "SELL" | "HOLD";

export type CryptoStrategy =
  | "GRID_BOT"
  | "DCA_BOT"
  | "RSI_CROSSOVER"
  | "EMA_CROSSOVER"
  | "BREAKOUT"
  | "MACD_TREND"
  | "BOLLINGER_MEAN_REVERSION";

export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface RiskConfig {
  stopLossPct: number;
  takeProfitPct?: number;
  maxPositionSizePct: number;
  maxDailyLossPct: number;
  trailingStop?: boolean;
  cooldownMinutes: number;
  maxLeverage: number;
}

export interface GridBotConfig {
  upperPrice: number;
  lowerPrice: number;
  gridCount: number;
  investmentAmount: number;
}

export interface DCABotConfig {
  interval: "hourly" | "daily" | "weekly";
  amountPerBuy: number;
  priceCondition?: "any" | "below_average" | "rsi_oversold";
}

export interface RSICrossoverConfig {
  rsiPeriod: number;
  oversoldThreshold: number;
  overboughtThreshold: number;
  timeframe: CandleInterval;
}

export interface EMACrossoverConfig {
  fastEma: number;
  slowEma: number;
  timeframe: CandleInterval;
  confirmationCandles: number;
}

export interface BreakoutConfig {
  lookbackPeriod: number;
  volumeMultiplier: number;
  breakoutThreshold: number;
}
