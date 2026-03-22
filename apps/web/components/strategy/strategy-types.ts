export type IndicatorCategory = "Trend" | "Momentum" | "Volatility" | "Volume";

export interface IndicatorDef {
  id: string;
  name: string;
  category: IndicatorCategory;
  description: string;
  params: IndicatorParam[];
}

export interface IndicatorParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface ConditionRow {
  id: string;
  indicatorId: string;
  indicatorParams: Record<string, number>;
  operator: ComparisonOperator;
  compareType: "value" | "indicator";
  compareValue: number;
  compareIndicatorId: string;
  compareIndicatorParams: Record<string, number>;
}

export interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: ConditionRow[];
  groups: ConditionGroup[];
}

export type ComparisonOperator =
  | ">"
  | "<"
  | ">="
  | "<="
  | "crosses_above"
  | "crosses_below";

export interface RiskParams {
  stopLossPct: number;
  takeProfitPct: number;
  trailingStop: boolean;
  trailingStopPct: number;
}

export interface StrategyConfig {
  name: string;
  entryConditions: ConditionGroup;
  exitConditions: ConditionGroup;
  risk: RiskParams;
}

export interface PresetStrategy {
  id: string;
  name: string;
  description: string;
  indicators: string[];
  winRate: number;
  category: string;
}

export interface BacktestResult {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWinLoss: number;
  totalTrades: number;
  calmarRatio: number;
  equityCurve: EquityPoint[];
  drawdownCurve: DrawdownPoint[];
  trades: TradeRecord[];
}

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface DrawdownPoint {
  date: string;
  drawdown: number;
}

export interface TradeRecord {
  id: string;
  entryTime: string;
  exitTime: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  exitReason: "TP" | "SL" | "Signal" | "Trailing";
}

export const COMPARISON_OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
  { value: "crosses_above", label: "Crosses Above" },
  { value: "crosses_below", label: "Crosses Below" },
];
