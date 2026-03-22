/**
 * Hyperliquid trade executor for the worker service.
 *
 * Supports both paper (simulated) and live (on-chain) execution.
 * Paper trades use real HL mid prices with simulated slippage.
 * Live trades use the HL Exchange API via the SDK.
 */

import { fetchMidPrice } from './hl-data';
import type { Signal, TradeResult } from '../engine/types';

const BUILDER_ADDRESS = process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS ?? '';
const BUILDER_FEE_BPS = Number(process.env.HL_BUILDER_FEE_BPS) || 5;

/** Simulate slippage on paper trades (0.02% - 0.10%) */
function applySlippage(price: number, side: 'BUY' | 'SELL'): number {
  const slippagePct = 0.0002 + Math.random() * 0.0008;
  return side === 'BUY'
    ? price * (1 + slippagePct)
    : price * (1 - slippagePct);
}

/** Calculate HL taker fee (0.035%) + builder fee */
function calculateFees(notional: number): { exchangeFee: number; builderFee: number } {
  const exchangeFee = notional * 0.00035; // HL taker fee
  const builderFee = notional * (BUILDER_FEE_BPS / 10000);
  return { exchangeFee, builderFee };
}

/** Execute a paper trade using real Hyperliquid mid prices */
export async function executePaperTrade(
  signal: Signal,
  capitalUsd: number,
  positionSizePct: number,
): Promise<TradeResult> {
  // Coin from signal.pair — strip "-USD" suffix if present
  const coin = signal.pair.replace('-USD', '').replace('/USD', '');

  const midPrice = await fetchMidPrice(coin);
  const fillPrice = applySlippage(midPrice, signal.direction as 'BUY' | 'SELL');

  const positionUsd = capitalUsd * (positionSizePct / 100);
  const quantity = positionUsd / fillPrice;
  const { exchangeFee, builderFee } = calculateFees(positionUsd);
  const totalFee = exchangeFee + builderFee;

  const result: TradeResult = {
    orderId: `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    pair: signal.pair,
    coin,
    side: signal.direction as 'BUY' | 'SELL',
    price: fillPrice,
    quantity,
    fee: totalFee,
    builderFee,
    isPaper: true,
    timestamp: new Date(),
  };

  console.log(
    `[Paper] ${result.side} ${result.quantity.toFixed(6)} ${coin} @ $${result.price.toFixed(2)} ` +
    `(mid: $${midPrice.toFixed(2)}, fee: $${totalFee.toFixed(4)})`
  );

  return result;
}

/** Fetch current mid price for a coin (for P&L tracking) */
export async function fetchLivePrice(coin: string): Promise<number> {
  return fetchMidPrice(coin);
}
