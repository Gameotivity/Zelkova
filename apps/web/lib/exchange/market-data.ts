import { db } from "@/lib/db";
import { marketDataCandles } from "@/lib/db/schema";
import { fetchCandles } from "./ccxt-wrapper";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import type { Exchange, CandleInterval } from "@zelkora/shared";
import { MAJOR_PAIRS, CANDLE_INTERVALS } from "@zelkora/shared";

/** Store candles to TimescaleDB with upsert logic */
export async function storeCandles(
  exchange: Exchange,
  pair: string,
  interval: CandleInterval,
  candles: number[][]
): Promise<number> {
  if (candles.length === 0) return 0;

  const values = candles.map((c) => ({
    time: new Date(c[0]),
    exchange,
    pair,
    interval,
    open: c[1],
    high: c[2],
    low: c[3],
    close: c[4],
    volume: c[5],
  }));

  // Batch insert — duplicates handled by unique constraint on (time, exchange, pair, interval)
  let inserted = 0;
  const batchSize = 500;

  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    try {
      await db.insert(marketDataCandles).values(batch).onConflictDoNothing();
      inserted += batch.length;
    } catch {
      // Insert one by one on conflict
      for (const val of batch) {
        try {
          await db.insert(marketDataCandles).values(val).onConflictDoNothing();
          inserted++;
        } catch {
          // Skip duplicates
        }
      }
    }
  }

  return inserted;
}

/** Fetch and store candles for a pair */
export async function syncCandles(
  exchange: Exchange,
  pair: string,
  interval: CandleInterval,
  limit = 200
): Promise<number> {
  const candles = await fetchCandles(exchange, pair, interval, limit);
  return storeCandles(exchange, pair, interval, candles as number[][]);
}

/** Get candles from database */
export async function getStoredCandles(
  exchange: Exchange,
  pair: string,
  interval: CandleInterval,
  limit = 200,
  from?: Date,
  to?: Date
) {
  const conditions = [
    eq(marketDataCandles.exchange, exchange),
    eq(marketDataCandles.pair, pair),
    eq(marketDataCandles.interval, interval),
  ];

  if (from) conditions.push(gte(marketDataCandles.time, from));
  if (to) conditions.push(lte(marketDataCandles.time, to));

  return db
    .select()
    .from(marketDataCandles)
    .where(and(...conditions))
    .orderBy(desc(marketDataCandles.time))
    .limit(limit);
}

/** Sync all major pairs for an exchange across key intervals */
export async function syncAllPairs(
  exchange: Exchange,
  intervals: CandleInterval[] = ["1h", "4h", "1d"]
): Promise<{ synced: number; errors: string[] }> {
  let synced = 0;
  const errors: string[] = [];

  for (const pair of MAJOR_PAIRS) {
    for (const interval of intervals) {
      try {
        const count = await syncCandles(exchange, pair, interval);
        synced += count;
      } catch (err: any) {
        errors.push(`${pair}/${interval}: ${err.message}`);
      }
    }
  }

  return { synced, errors };
}
