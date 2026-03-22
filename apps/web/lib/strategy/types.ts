// ---------------------------------------------------------------------------
// Core strategy types for the Zelkora quantitative strategy engine
// ---------------------------------------------------------------------------

export type IndicatorType =
  | "SMA"
  | "EMA"
  | "RSI"
  | "MACD"
  | "BB"
  | "ATR"
  | "VWAP"
  | "OBV"
  | "ADX"
  | "STOCH";

export type ComparisonOp =
  | ">"
  | "<"
  | ">="
  | "<="
  | "crosses_above"
  | "crosses_below";

export type LogicOp = "AND" | "OR";

export interface IndicatorConfig {
  type: IndicatorType;
  params: Record<string, number>;
}

export interface Condition {
  indicator: IndicatorConfig;
  comparison: ComparisonOp;
  value: number | IndicatorConfig;
}

export interface ConditionGroup {
  logic: LogicOp;
  conditions: (Condition | ConditionGroup)[];
}

export interface StrategyDefinition {
  name: string;
  description: string;
  entryLong: ConditionGroup;
  entryShort?: ConditionGroup;
  exitLong: ConditionGroup;
  exitShort?: ConditionGroup;
  stopLossPct: number;
  takeProfitPct: number;
  trailingStopPct?: number;
  timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  cooldownBars: number;
}

export interface BacktestConfig {
  strategy: StrategyDefinition;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  positionSizePct: number;
  fees: number;
  slippage: number;
}

export interface TradeResult {
  entryTime: number;
  exitTime: number;
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPct: number;
  fees: number;
  exitReason: "SIGNAL" | "STOP_LOSS" | "TAKE_PROFIT" | "TRAILING_STOP";
}

export interface BacktestResult {
  trades: TradeResult[];
  metrics: PerformanceMetrics;
  equityCurve: { time: number; equity: number }[];
  drawdownCurve: { time: number; drawdown: number }[];
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPct: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  avgHoldingPeriod: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  calmarRatio: number;
}
