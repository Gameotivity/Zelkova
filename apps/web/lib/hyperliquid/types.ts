/**
 * Zelkora-specific TypeScript types for the Hyperliquid integration.
 * These wrap/extend the SDK types for use in the platform's agent and strategy layers.
 */

import type { Tif, TriggerType } from 'hyperliquid';

// ---------------------------------------------------------------------------
// Order types
// ---------------------------------------------------------------------------

export type HLOrderSide = 'buy' | 'sell';

export type HLTimeInForce = Tif; // 'Alo' | 'Ioc' | 'Gtc'

export interface HLLimitOrderType {
  kind: 'limit';
  tif: HLTimeInForce;
}

export interface HLTriggerOrderType {
  kind: 'trigger';
  triggerPx: string;
  isMarket: boolean;
  tpsl: TriggerType; // 'tp' | 'sl'
}

export type HLOrderType = HLLimitOrderType | HLTriggerOrderType;

export interface HLOrderRequest {
  /** Coin symbol, e.g. "BTC" */
  coin: string;
  side: HLOrderSide;
  /** Price as string to avoid floating-point issues */
  price: string;
  /** Size as string to avoid floating-point issues */
  size: string;
  reduceOnly: boolean;
  orderType: HLOrderType;
  /** Optional client order ID */
  cloid?: string;
}

// ---------------------------------------------------------------------------
// Order response / fill
// ---------------------------------------------------------------------------

export interface HLOrderStatus {
  oid: number;
  totalSz: string;
  avgPx: string;
}

export interface HLOrderResponse {
  status: 'resting' | 'filled' | 'error';
  /** Present when status is 'resting' */
  restingOid?: number;
  /** Present when status is 'filled' */
  fill?: HLOrderStatus;
}

export interface HLFill {
  coin: string;
  price: string;
  size: string;
  side: string;
  time: number;
  closedPnl: string;
  hash: string;
  orderId: number;
  crossed: boolean;
  fee: string;
  feeToken: string;
  tid: number;
  direction: string;
  startPosition: string;
}

// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

export type HLMarginMode = 'cross' | 'isolated';

export interface HLPosition {
  coin: string;
  /** Signed size: positive = long, negative = short */
  size: string;
  entryPrice: string;
  leverage: number;
  marginMode: HLMarginMode;
  unrealizedPnl: string;
  liquidationPrice: string;
  returnOnEquity: string;
  marginUsed: string;
}

// ---------------------------------------------------------------------------
// Account state
// ---------------------------------------------------------------------------

export interface HLAccountState {
  equity: string;
  totalMarginUsed: string;
  totalUnrealizedPnl: string;
  crossMaintenanceMarginUsed: string;
  withdrawable: string;
  positions: HLPosition[];
}

// ---------------------------------------------------------------------------
// Asset metadata & market data
// ---------------------------------------------------------------------------

export interface HLAssetMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  markPrice: string;
  midPrice: string;
  oraclePrice: string;
  dayVolume: string;
  openInterest: string;
  prevDayPrice: string;
}

export interface HLFundingRate {
  coin: string;
  rate: string;
  predicted: string;
  nextFundingTime: number;
}

// ---------------------------------------------------------------------------
// Builder config
// ---------------------------------------------------------------------------

export interface HLBuilderConfig {
  /** Builder wallet address */
  address: string;
  /** Fee in basis points (e.g. 5 = 0.05%) */
  feeBps: number;
}

// ---------------------------------------------------------------------------
// Candle
// ---------------------------------------------------------------------------

export interface HLCandle {
  time: number;
  closeTime: number;
  coin: string;
  interval: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  numTrades: number;
}
