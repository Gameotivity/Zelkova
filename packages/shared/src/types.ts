export type Exchange = "binance" | "bybit";

export type AgentType = "CRYPTO" | "POLYMARKET";

export type AgentStatus = "DRAFT" | "PAPER" | "LIVE" | "PAUSED" | "STOPPED";

export type OrderSide = "BUY" | "SELL";

export type OrderType = "MARKET" | "LIMIT";

export type TradeStatus = "PENDING" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED" | "FAILED";

export type PositionSide = "LONG" | "SHORT";

export type SubscriptionTier = "FREE" | "PRO" | "ELITE";

export type SignalDirection = "BUY" | "SELL" | "HOLD";

export type CryptoStrategy =
  | "GRID_BOT"
  | "DCA_BOT"
  | "RSI_CROSSOVER"
  | "EMA_CROSSOVER"
  | "BREAKOUT";

export type PolymarketStrategy =
  | "ODDS_DIVERGENCE"
  | "MOMENTUM"
  | "MEAN_REVERSION"
  | "SENTIMENT";

export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface RiskConfig {
  stopLossPct: number;
  takeProfitPct?: number;
  maxPositionSizePct: number;
  maxDailyLossPct: number;
  trailingStop?: boolean;
  cooldownMinutes: number;
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

export interface PolymarketOddsDivergenceConfig {
  targetDivergencePct: number;
}

export interface PolymarketMomentumConfig {
  oddsChangeThreshold: number;
  lookbackHours: number;
  confirmationTicks: number;
}

export interface PolymarketMeanReversionConfig {
  historicalAvgOdds: number;
  deviationThreshold: number;
  positionSize: number;
}

export interface PolymarketSentimentConfig {
  newsSentimentThreshold: number;
  socialVolumeSpike: number;
  minConfidence: number;
}
