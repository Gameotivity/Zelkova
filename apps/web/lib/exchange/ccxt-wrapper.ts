import ccxt, { type Exchange, type Order, type Ticker, type OHLCV } from "ccxt";
import { db } from "@/lib/db";
import { exchangeConnections } from "@/lib/db/schema";
import { encrypt, decrypt, maskApiKey } from "@/lib/auth/encryption";
import { eq, and } from "drizzle-orm";
import type {
  Exchange as ExchangeName,
  OrderSide,
  OrderType,
  CandleInterval,
} from "@zelkora/shared";

const RATE_LIMITS: Record<string, { tokens: number; interval: number }> = {
  binance: { tokens: 10, interval: 1000 },
  bybit: { tokens: 5, interval: 1000 },
};

const tokenBuckets = new Map<string, { tokens: number; lastRefill: number }>();

function checkRateLimit(exchangeName: string, userId: string): boolean {
  const key = `${exchangeName}:${userId}`;
  const limit = RATE_LIMITS[exchangeName] || { tokens: 10, interval: 1000 };
  const now = Date.now();

  let bucket = tokenBuckets.get(key);
  if (!bucket) {
    bucket = { tokens: limit.tokens, lastRefill: now };
    tokenBuckets.set(key, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  if (elapsed > limit.interval) {
    bucket.tokens = limit.tokens;
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) return false;
  bucket.tokens--;
  return true;
}

function createExchangeInstance(
  exchangeName: ExchangeName,
  apiKey: string,
  apiSecret: string,
  sandbox = false
): Exchange {
  const ExchangeClass = (ccxt as any)[exchangeName];
  if (!ExchangeClass) {
    throw new Error(`Unsupported exchange: ${exchangeName}`);
  }

  const instance = new ExchangeClass({
    apiKey,
    secret: apiSecret,
    enableRateLimit: true,
  });

  if (sandbox) {
    instance.setSandboxMode(true);
  }

  return instance;
}

/** Connect and validate an exchange, then encrypt + store credentials */
export async function connectExchange(
  userId: string,
  exchangeName: ExchangeName,
  apiKey: string,
  apiSecret: string,
  label?: string
): Promise<{ id: string; exchange: ExchangeName; maskedKey: string }> {
  // Validate keys by fetching balance
  const instance = createExchangeInstance(exchangeName, apiKey, apiSecret);
  try {
    await instance.fetchBalance();
  } catch (err: any) {
    throw new Error(`Invalid API keys: ${err.message}`);
  }

  // Encrypt credentials
  const encryptedKey = encrypt(apiKey);
  const encryptedSecret = encrypt(apiSecret);

  const [conn] = await db
    .insert(exchangeConnections)
    .values({
      userId,
      exchange: exchangeName,
      label: label || `${exchangeName} Account`,
      apiKeyEncrypted: encryptedKey.encrypted,
      apiKeyIv: encryptedKey.iv,
      apiKeyTag: encryptedKey.tag,
      apiSecretEncrypted: encryptedSecret.encrypted,
      apiSecretIv: encryptedSecret.iv,
      apiSecretTag: encryptedSecret.tag,
      permissions: ["spot"],
    })
    .returning({ id: exchangeConnections.id });

  return {
    id: conn.id,
    exchange: exchangeName,
    maskedKey: maskApiKey(apiKey),
  };
}

/** Get a live exchange instance for a user's stored connection */
async function getUserExchange(
  userId: string,
  exchangeName: ExchangeName,
  sandbox = false
): Promise<Exchange> {
  const [conn] = await db
    .select()
    .from(exchangeConnections)
    .where(
      and(
        eq(exchangeConnections.userId, userId),
        eq(exchangeConnections.exchange, exchangeName),
        eq(exchangeConnections.isActive, true)
      )
    )
    .limit(1);

  if (!conn) {
    throw new Error(`No active ${exchangeName} connection found`);
  }

  const apiKey = decrypt(conn.apiKeyEncrypted, conn.apiKeyIv, conn.apiKeyTag);
  const apiSecret = decrypt(
    conn.apiSecretEncrypted,
    conn.apiSecretIv,
    conn.apiSecretTag
  );

  return createExchangeInstance(exchangeName, apiKey, apiSecret, sandbox);
}

/** Fetch non-zero balances */
export async function getBalances(
  userId: string,
  exchangeName: ExchangeName
): Promise<Record<string, { free: number; used: number; total: number }>> {
  if (!checkRateLimit(exchangeName, userId)) {
    throw new Error("Rate limit exceeded. Try again shortly.");
  }

  const exchange = await getUserExchange(userId, exchangeName);
  const balance = await exchange.fetchBalance();

  const result: Record<string, { free: number; used: number; total: number }> =
    {};

  for (const [currency, data] of Object.entries(balance.total || {})) {
    const total = data as number;
    if (total > 0) {
      result[currency] = {
        free: ((balance.free as unknown as Record<string, number>)?.[currency]) || 0,
        used: ((balance.used as unknown as Record<string, number>)?.[currency]) || 0,
        total,
      };
    }
  }

  return result;
}

/** Fetch order book */
export async function getOrderBook(
  exchangeName: ExchangeName,
  pair: string,
  limit = 20
): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
  const ExchangeClass = (ccxt as any)[exchangeName];
  const exchange = new ExchangeClass({ enableRateLimit: true });
  const book = await exchange.fetchOrderBook(pair, limit);

  return {
    bids: book.bids.slice(0, limit) as [number, number][],
    asks: book.asks.slice(0, limit) as [number, number][],
  };
}

/** Place a limit order */
export async function placeLimitOrder(
  userId: string,
  exchangeName: ExchangeName,
  pair: string,
  side: OrderSide,
  amount: number,
  price: number,
  sandbox = false
): Promise<Order> {
  if (!checkRateLimit(exchangeName, userId)) {
    throw new Error("Rate limit exceeded. Try again shortly.");
  }

  const exchange = await getUserExchange(userId, exchangeName, sandbox);
  return exchange.createOrder(pair, "limit", side.toLowerCase(), amount, price);
}

/** Place a market order */
export async function placeMarketOrder(
  userId: string,
  exchangeName: ExchangeName,
  pair: string,
  side: OrderSide,
  amount: number,
  sandbox = false
): Promise<Order> {
  if (!checkRateLimit(exchangeName, userId)) {
    throw new Error("Rate limit exceeded. Try again shortly.");
  }

  const exchange = await getUserExchange(userId, exchangeName, sandbox);
  return exchange.createOrder(
    pair,
    "market",
    side.toLowerCase(),
    amount
  );
}

/** Cancel an open order */
export async function cancelOrder(
  userId: string,
  exchangeName: ExchangeName,
  orderId: string,
  pair: string
): Promise<void> {
  const exchange = await getUserExchange(userId, exchangeName);
  await exchange.cancelOrder(orderId, pair);
}

/** Fetch open orders */
export async function getOpenOrders(
  userId: string,
  exchangeName: ExchangeName,
  pair?: string
): Promise<Order[]> {
  if (!checkRateLimit(exchangeName, userId)) {
    throw new Error("Rate limit exceeded. Try again shortly.");
  }

  const exchange = await getUserExchange(userId, exchangeName);
  return exchange.fetchOpenOrders(pair);
}

/** Fetch trade history */
export async function getTradeHistory(
  userId: string,
  exchangeName: ExchangeName,
  pair?: string,
  limit = 50
): Promise<any[]> {
  if (!checkRateLimit(exchangeName, userId)) {
    throw new Error("Rate limit exceeded. Try again shortly.");
  }

  const exchange = await getUserExchange(userId, exchangeName);
  return exchange.fetchMyTrades(pair, undefined, limit);
}

/** Fetch OHLCV candles */
export async function fetchCandles(
  exchangeName: ExchangeName,
  pair: string,
  interval: CandleInterval,
  limit = 200,
  since?: number
): Promise<OHLCV[]> {
  const ExchangeClass = (ccxt as any)[exchangeName];
  const exchange = new ExchangeClass({ enableRateLimit: true });
  return exchange.fetchOHLCV(pair, interval, since, limit);
}

/** Fetch current ticker (price, volume, etc.) */
export async function getTicker(
  exchangeName: ExchangeName,
  pair: string
): Promise<Ticker> {
  const ExchangeClass = (ccxt as any)[exchangeName];
  const exchange = new ExchangeClass({ enableRateLimit: true });
  return exchange.fetchTicker(pair);
}
