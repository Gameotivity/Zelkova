export interface Signal {
  direction: "BUY" | "SELL" | "HOLD";
  confidence: number;
  strategy: string;
  pair: string;
  indicators: Record<string, number | string>;
  reason: string;
}

export interface TradeResult {
  orderId: string;
  pair: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  fee: number;
  isPaper: boolean;
  timestamp: Date;
}

export interface PositionUpdate {
  pair: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnl: number;
  stopLoss?: number;
  takeProfit?: number;
}
