import ccxt from "ccxt";
import type { Signal, TradeResult } from "../engine/types";

/** Simulate slippage on paper trades (0.05% - 0.15%) */
function applySlippage(price: number, side: "BUY" | "SELL"): number {
  const slippagePct = 0.0005 + Math.random() * 0.001; // 0.05% - 0.15%
  return side === "BUY"
    ? price * (1 + slippagePct)
    : price * (1 - slippagePct);
}

/** Simulate exchange fee (Binance maker: 0.1%, taker: 0.1%) */
function calculateFee(quantity: number, price: number): number {
  return quantity * price * 0.001; // 0.1% taker fee
}

/** Execute a paper trade using real live prices from CCXT */
export async function executePaperTrade(
  exchangeName: string,
  signal: Signal,
  capitalUsd: number,
  positionSizePct: number
): Promise<TradeResult> {
  // Fetch real live price
  const ExchangeClass = (ccxt as Record<string, any>)[exchangeName];
  if (!ExchangeClass) {
    throw new Error(`Unsupported exchange: ${exchangeName}`);
  }

  const exchange = new ExchangeClass({ enableRateLimit: true });
  const ticker = await exchange.fetchTicker(signal.pair);
  const livePrice = ticker.last;

  if (!livePrice || livePrice <= 0) {
    throw new Error(`Could not fetch price for ${signal.pair}`);
  }

  // Calculate position size
  const positionUsd = capitalUsd * (positionSizePct / 100);
  const fillPrice = applySlippage(livePrice, signal.direction as "BUY" | "SELL");
  const quantity = positionUsd / fillPrice;
  const fee = calculateFee(quantity, fillPrice);

  const result: TradeResult = {
    orderId: `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    pair: signal.pair,
    side: signal.direction as "BUY" | "SELL",
    price: fillPrice,
    quantity,
    fee,
    isPaper: true,
    timestamp: new Date(),
  };

  console.log(
    `[Paper] ${result.side} ${result.quantity.toFixed(6)} ${result.pair} @ $${result.price.toFixed(2)} ` +
    `(live: $${livePrice.toFixed(2)}, slip: ${((Math.abs(result.price - livePrice) / livePrice) * 100).toFixed(3)}%, ` +
    `fee: $${result.fee.toFixed(4)})`
  );

  return result;
}

/** Fetch current live price for P&L tracking */
export async function fetchLivePrice(
  exchangeName: string,
  pair: string
): Promise<number> {
  const ExchangeClass = (ccxt as Record<string, any>)[exchangeName];
  const exchange = new ExchangeClass({ enableRateLimit: true });
  const ticker = await exchange.fetchTicker(pair);
  return ticker.last || 0;
}

/** Fetch live candles for signal generation */
export async function fetchLiveCandles(
  exchangeName: string,
  pair: string,
  timeframe: string,
  limit = 100
): Promise<Array<{
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>> {
  const ExchangeClass = (ccxt as Record<string, any>)[exchangeName];
  const exchange = new ExchangeClass({ enableRateLimit: true });
  const ohlcv = await exchange.fetchOHLCV(pair, timeframe, undefined, limit);

  return ohlcv.map((c: number[]) => ({
    time: c[0],
    open: c[1],
    high: c[2],
    low: c[3],
    close: c[4],
    volume: c[5],
  }));
}
