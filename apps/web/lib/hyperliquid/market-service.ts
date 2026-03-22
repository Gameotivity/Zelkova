/**
 * Market Data Service for Zelkora Hyperliquid trading platform.
 *
 * Read-only queries for asset metadata, prices, order books,
 * candles, and funding rates. All data flows through the SDK's InfoAPI.
 */

import type {
  Meta,
  MetaAndAssetCtxs,
  AllMids,
  L2Book,
  CandleSnapshot,
  AssetCtx,
  PredictedFundings,
} from 'hyperliquid';

import { getInfo } from './client';
import type { HLAssetMeta, HLCandle, HLFundingRate } from './types';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface AssetMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

export interface OrderBookLevel {
  price: string;
  size: string;
  count: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface FundingRate {
  coin: string;
  currentFunding: string;
  markPrice: string;
  midPrice: string;
  openInterest: string;
  oraclePrice: string;
  premium: string;
  dayBaseVolume: string;
  dayNotionalVolume: string;
  previousDayPrice: string;
}

export interface PredictedFundingInfo {
  coin: string;
  venues: {
    venue: string;
    fundingRate: string;
    nextFundingTime: number;
  }[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapBookLevels(
  levels: { px: string; sz: string; n: number }[],
): OrderBookLevel[] {
  return levels.map((l) => ({
    price: l.px,
    size: l.sz,
    count: l.n,
  }));
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get metadata for all tradeable perpetual assets.
 */
export async function getAssetMeta(): Promise<AssetMeta[]> {
  const info = await getInfo();
  const meta: Meta = await info.perpetuals.getMeta(true);

  return meta.universe.map((u) => ({
    name: u.name,
    szDecimals: u.szDecimals,
    maxLeverage: u.maxLeverage,
    onlyIsolated: u.onlyIsolated ?? false,
  }));
}

/**
 * Get enriched asset metadata including live market context (prices, volume).
 */
export async function getAssetMetaWithCtx(): Promise<HLAssetMeta[]> {
  const info = await getInfo();
  const [meta, ctxs]: MetaAndAssetCtxs =
    await info.perpetuals.getMetaAndAssetCtxs(true);

  return meta.universe.map((u, idx) => {
    const ctx: AssetCtx = ctxs[idx];
    return {
      name: u.name,
      szDecimals: u.szDecimals,
      maxLeverage: u.maxLeverage,
      markPrice: ctx.markPx,
      midPrice: ctx.midPx,
      oraclePrice: ctx.oraclePx,
      dayVolume: ctx.dayNtlVlm,
      openInterest: ctx.openInterest,
      prevDayPrice: ctx.prevDayPx,
    };
  });
}

/**
 * Get current mid prices for all assets.
 * Returns a coin -> price string map.
 */
export async function getMidPrices(): Promise<Record<string, string>> {
  const info = await getInfo();
  const mids: AllMids = await info.getAllMids(true);
  return mids;
}

/**
 * Get L2 order book snapshot for a coin.
 */
export async function getOrderBook(coin: string): Promise<OrderBook> {
  const info = await getInfo();
  const book: L2Book = await info.getL2Book(coin, true);

  const [bids, asks] = book.levels;
  return {
    bids: mapBookLevels(bids),
    asks: mapBookLevels(asks),
  };
}

/**
 * Get OHLCV candle data for a coin.
 *
 * @param coin - Asset symbol, e.g. "BTC".
 * @param interval - Candle interval: "1m", "5m", "15m", "1h", "4h", "1d".
 * @param startTime - Start timestamp in milliseconds.
 * @param endTime - End timestamp in milliseconds.
 */
export async function getCandles(
  coin: string,
  interval: string,
  startTime: number,
  endTime: number,
): Promise<HLCandle[]> {
  const info = await getInfo();
  const raw: CandleSnapshot = await info.getCandleSnapshot(
    coin,
    interval,
    startTime,
    endTime,
    true,
  );

  return raw.map((c) => ({
    time: c.t,
    closeTime: c.T,
    coin: c.s,
    interval: c.i,
    open: c.o,
    close: c.c,
    high: c.h,
    low: c.l,
    volume: c.v,
    numTrades: c.n,
  }));
}

/**
 * Get current and predicted funding rates for all perpetual assets.
 *
 * Returns one entry per asset with the current funding from asset context
 * and enriched with market data (mark price, open interest, etc.).
 */
export async function getFundingRates(): Promise<FundingRate[]> {
  const info = await getInfo();
  const [meta, ctxs]: MetaAndAssetCtxs =
    await info.perpetuals.getMetaAndAssetCtxs(true);

  return meta.universe.map((u, idx) => {
    const ctx: AssetCtx = ctxs[idx];
    return {
      coin: u.name,
      currentFunding: ctx.funding,
      markPrice: ctx.markPx,
      midPrice: ctx.midPx,
      openInterest: ctx.openInterest,
      oraclePrice: ctx.oraclePx,
      premium: ctx.premium,
      dayBaseVolume: ctx.dayBaseVlm,
      dayNotionalVolume: ctx.dayNtlVlm,
      previousDayPrice: ctx.prevDayPx,
    };
  });
}

/**
 * Get predicted funding information from all venues.
 */
export async function getPredictedFundings(): Promise<PredictedFundingInfo[]> {
  const info = await getInfo();
  const raw: PredictedFundings = await info.perpetuals.getPredictedFundings(
    true,
  );

  const results: PredictedFundingInfo[] = [];

  for (const [coin, venueArr] of Object.entries(raw)) {
    const venues = venueArr.flatMap((venueMap) =>
      Object.entries(venueMap).map(([venue, data]) => ({
        venue,
        fundingRate: data.fundingRate,
        nextFundingTime: data.nextFundingTime,
      })),
    );

    results.push({ coin, venues });
  }

  return results;
}

/**
 * Get a single mid price for a specific coin.
 * Returns null if the coin is not found.
 */
export async function getMidPrice(coin: string): Promise<string | null> {
  const mids = await getMidPrices();
  return mids[coin] ?? null;
}
