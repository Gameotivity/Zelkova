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
  coin: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  fee: number;
  builderFee: number;
  isPaper: boolean;
  timestamp: Date;
  /** Present for live trades */
  hlOrderId?: number;
}

export interface PositionUpdate {
  coin: string;
  pair: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnl: number;
  stopLoss?: number;
  takeProfit?: number;
}
