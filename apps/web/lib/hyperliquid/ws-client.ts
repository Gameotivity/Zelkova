/**
 * Hyperliquid WebSocket client for real-time market data.
 *
 * Connects to HL's WebSocket API and streams:
 *   - All mid prices (allMids subscription)
 *   - Individual trade feeds
 *   - Order book L2 snapshots
 *
 * Uses a singleton pattern with auto-reconnect.
 * Max 1000 subscriptions per IP (HL limit).
 */

import { HL_WS_URLS, MAX_WS_SUBSCRIPTIONS } from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WSMidPrice {
  coin: string;
  mid: string;
}

export interface WSTrade {
  coin: string;
  side: string;
  px: string;
  sz: string;
  time: number;
  hash: string;
}

export interface WSL2Book {
  coin: string;
  levels: Array<{
    px: string;
    sz: string;
    n: number;
  }>[];
  time: number;
}

type PriceCallback = (prices: Record<string, string>) => void;
type TradeCallback = (trade: WSTrade) => void;

// ---------------------------------------------------------------------------
// WebSocket Manager
// ---------------------------------------------------------------------------

class HLWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private priceListeners = new Set<PriceCallback>();
  private tradeListeners = new Map<string, Set<TradeCallback>>();
  private latestPrices: Record<string, string> = {};
  private connected = false;
  private subscriptionCount = 0;

  constructor(private testnet = false) {}

  private getUrl(): string {
    return this.testnet ? HL_WS_URLS.TESTNET : HL_WS_URLS.MAINNET;
  }

  /** Connect and subscribe to allMids */
  connect(): void {
    if (this.ws) return;

    try {
      this.ws = new WebSocket(this.getUrl());

      this.ws.onopen = () => {
        this.connected = true;
        // Subscribe to all mid prices
        this.send({
          method: 'subscribe',
          subscription: { type: 'allMids' },
        });
        this.subscriptionCount++;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data));
          this.handleMessage(data);
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(data: Record<string, unknown>): void {
    const channel = data.channel as string | undefined;

    if (channel === 'allMids') {
      const mids = (data.data as { mids: Record<string, string> })?.mids;
      if (mids) {
        this.latestPrices = { ...this.latestPrices, ...mids };
        for (const listener of this.priceListeners) {
          listener(this.latestPrices);
        }
      }
    }

    if (channel === 'trades') {
      const trades = data.data as WSTrade[];
      if (Array.isArray(trades)) {
        for (const trade of trades) {
          const listeners = this.tradeListeners.get(trade.coin);
          if (listeners) {
            for (const cb of listeners) {
              cb(trade);
            }
          }
        }
      }
    }
  }

  /** Subscribe to real-time price updates for all assets */
  onPriceUpdate(callback: PriceCallback): () => void {
    this.priceListeners.add(callback);
    // Immediately emit current prices if we have them
    if (Object.keys(this.latestPrices).length > 0) {
      callback(this.latestPrices);
    }
    if (!this.connected) {
      this.connect();
    }
    return () => {
      this.priceListeners.delete(callback);
    };
  }

  /** Subscribe to trades for a specific coin */
  onTrades(coin: string, callback: TradeCallback): () => void {
    if (!this.tradeListeners.has(coin)) {
      this.tradeListeners.set(coin, new Set());
      // Subscribe on the WebSocket
      if (this.subscriptionCount < MAX_WS_SUBSCRIPTIONS) {
        this.send({
          method: 'subscribe',
          subscription: { type: 'trades', coin },
        });
        this.subscriptionCount++;
      }
    }
    this.tradeListeners.get(coin)!.add(callback);

    if (!this.connected) {
      this.connect();
    }

    return () => {
      const listeners = this.tradeListeners.get(coin);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.tradeListeners.delete(coin);
          this.send({
            method: 'unsubscribe',
            subscription: { type: 'trades', coin },
          });
          this.subscriptionCount = Math.max(0, this.subscriptionCount - 1);
        }
      }
    };
  }

  /** Get latest cached prices */
  getLatestPrices(): Record<string, string> {
    return { ...this.latestPrices };
  }

  /** Check connection status */
  isConnected(): boolean {
    return this.connected;
  }

  /** Disconnect and clean up */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.priceListeners.clear();
    this.tradeListeners.clear();
    this.subscriptionCount = 0;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let wsManager: HLWebSocketManager | null = null;

export function getWSManager(testnet?: boolean): HLWebSocketManager {
  if (!wsManager) {
    const isTestnet = testnet ?? process.env.NEXT_PUBLIC_HL_TESTNET === 'true';
    wsManager = new HLWebSocketManager(isTestnet);
  }
  return wsManager;
}

export function resetWSManager(): void {
  wsManager?.disconnect();
  wsManager = null;
}
