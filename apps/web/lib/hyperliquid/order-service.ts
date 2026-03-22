/**
 * Order Management Service for Zelkora Hyperliquid trading platform.
 *
 * Handles the full order lifecycle: place, cancel, modify, and query.
 * Every order includes the Zelkora builder code so the platform collects fees.
 */

import type { HLExchangeAPI } from './client';
import { getInfo, getBuilderInfo } from './client';
import type {
  HLOrderSide,
  HLTimeInForce,
  HLFill,
} from './types';

// ---------------------------------------------------------------------------
// Params & result types
// ---------------------------------------------------------------------------

export type OrderKind = 'limit' | 'market';

export interface OrderParams {
  coin: string;
  side: HLOrderSide;
  size: string;
  /** Limit price as string. Pass null for market orders. */
  price: string | null;
  orderType: OrderKind;
  tif: HLTimeInForce;
  reduceOnly: boolean;
  leverage?: number;
  cloid?: string;
}

export interface OrderResult {
  orderId: number;
  status: 'resting' | 'filled';
  filledSize?: string;
  avgPrice?: string;
}

export interface OpenOrder {
  coin: string;
  side: string;
  price: string;
  size: string;
  orderId: number;
  timestamp: number;
  originalSize: string;
  reduceOnly: boolean;
  orderType: string;
  triggerPrice: string;
  isTrigger: boolean;
  isPositionTpsl: boolean;
  triggerCondition: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface BuilderParam {
  address: string;
  fee: number;
}

function buildBuilder(): BuilderParam {
  const cfg = getBuilderInfo();
  return { address: cfg.address, fee: cfg.feeBps };
}

/**
 * For market orders we send an aggressive limit price with IOC so the order
 * fills immediately. We use a 3% slippage band around current mid price.
 */
const MARKET_SLIPPAGE = 0.03;

async function getMarketPrice(coin: string, side: HLOrderSide): Promise<string> {
  const info = await getInfo();
  const mids = await info.getAllMids(true);
  const mid = mids[coin];
  if (!mid) {
    throw new Error(`No mid price found for ${coin}`);
  }
  const midNum = Number(mid);
  const slipped = side === 'buy'
    ? midNum * (1 + MARKET_SLIPPAGE)
    : midNum * (1 - MARKET_SLIPPAGE);
  return slipped.toString();
}

interface OrderStatusEntry {
  filled?: { oid: number; totalSz: string; avgPx: string };
  resting?: { oid: number };
}

interface SDKOrderResponse {
  status: string;
  response?: {
    data?: {
      statuses?: OrderStatusEntry[];
    };
  };
}

function parseOrderResponse(resp: SDKOrderResponse): OrderResult {
  const statuses = resp.response?.data?.statuses ?? [];
  const first = statuses[0];

  if (!first) {
    throw new Error(`Order rejected: ${resp.status}`);
  }

  if (first.filled) {
    return {
      orderId: first.filled.oid,
      status: 'filled',
      filledSize: first.filled.totalSz,
      avgPrice: first.filled.avgPx,
    };
  }

  if (first.resting) {
    return {
      orderId: first.resting.oid,
      status: 'resting',
    };
  }

  throw new Error(`Unexpected order status: ${JSON.stringify(first)}`);
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Place an order on Hyperliquid with the Zelkora builder fee attached.
 */
export async function placeOrder(
  exchange: HLExchangeAPI,
  params: OrderParams,
): Promise<OrderResult> {
  const isBuy = params.side === 'buy';

  const limitPx = params.orderType === 'market'
    ? await getMarketPrice(params.coin, params.side)
    : params.price;

  if (limitPx === null) {
    throw new Error('Limit price is required for limit orders');
  }

  const orderType = params.orderType === 'market'
    ? { limit: { tif: 'Ioc' as const } }
    : { limit: { tif: params.tif } };

  const resp = await exchange.placeOrder({
    coin: params.coin,
    is_buy: isBuy,
    sz: params.size,
    limit_px: limitPx,
    order_type: orderType,
    reduce_only: params.reduceOnly,
    cloid: params.cloid,
    builder: buildBuilder(),
  });

  return parseOrderResponse(resp as SDKOrderResponse);
}

/**
 * Cancel an open order by coin and numeric order ID.
 */
export async function cancelOrder(
  exchange: HLExchangeAPI,
  coin: string,
  orderId: number,
): Promise<boolean> {
  const resp = await exchange.cancelOrder({
    coin,
    o: orderId,
  });

  const typedResp = resp as SDKOrderResponse;
  const statuses = typedResp.response?.data?.statuses ?? [];
  return statuses.length > 0;
}

/**
 * Modify an existing order's price and/or size.
 */
export async function modifyOrder(
  exchange: HLExchangeAPI,
  orderId: number,
  coin: string,
  newPrice: string,
  newSize: string,
  isBuy: boolean,
  tif: HLTimeInForce = 'Gtc',
  reduceOnly = false,
): Promise<boolean> {
  const resp = await exchange.modifyOrder(orderId, {
    coin,
    is_buy: isBuy,
    sz: newSize,
    limit_px: newPrice,
    order_type: { limit: { tif } },
    reduce_only: reduceOnly,
    builder: buildBuilder(),
  });

  return (resp as SDKOrderResponse)?.status === 'ok';
}

/**
 * Get all open orders for a wallet (includes trigger/TP-SL info).
 */
export async function getOpenOrders(
  walletAddress: string,
): Promise<OpenOrder[]> {
  const info = await getInfo();
  const raw = await info.getFrontendOpenOrders(walletAddress, true);

  return (raw as Array<Record<string, unknown>>).map((o) => ({
    coin: o.coin as string,
    side: o.side as string,
    price: o.limitPx as string,
    size: o.sz as string,
    orderId: o.oid as number,
    timestamp: o.timestamp as number,
    originalSize: o.origSz as string,
    reduceOnly: o.reduceOnly as boolean,
    orderType: o.orderType as string,
    triggerPrice: (o.triggerPx ?? '') as string,
    isTrigger: (o.isTrigger ?? false) as boolean,
    isPositionTpsl: (o.isPositionTpsl ?? false) as boolean,
    triggerCondition: (o.triggerCondition ?? '') as string,
  }));
}

/**
 * Get recent fills for a wallet address.
 */
export async function getUserFills(
  walletAddress: string,
  limit = 100,
): Promise<HLFill[]> {
  const info = await getInfo();
  const raw = await info.getUserFills(walletAddress, true);

  const fills: HLFill[] = (raw as Array<Record<string, unknown>>).map((f) => ({
    coin: f.coin as string,
    price: f.px as string,
    size: f.sz as string,
    side: f.side as string,
    time: f.time as number,
    closedPnl: f.closedPnl as string,
    hash: f.hash as string,
    orderId: f.oid as number,
    crossed: f.crossed as boolean,
    fee: f.fee as string,
    feeToken: f.feeToken as string,
    tid: f.tid as number,
    direction: (f.dir ?? '') as string,
    startPosition: (f.startPosition ?? '0') as string,
  }));

  return fills.slice(0, limit);
}
