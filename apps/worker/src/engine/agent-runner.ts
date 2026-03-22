import { executePaperTrade, fetchLivePrice } from "../executors/hl-executor";
import { db } from "../db";
import type { Signal, TradeResult } from "./types";

// Placeholder — new strategies will be plugged in here
async function generateLiveSignal(
  _strategy: string,
  _coin: string,
  _pair: string,
  _config: Record<string, unknown>,
): Promise<Signal> {
  return {
    direction: "HOLD",
    confidence: 0,
    strategy: _strategy,
    pair: _pair,
    indicators: {},
    reason: "Strategy not implemented yet",
  };
}

export interface AgentConfig {
  id: string;
  userId: string;
  status: "PAPER" | "LIVE" | "PAUSED";
  pairs: string[];
  strategy: string;
  strategyConfig: Record<string, unknown>;
  riskConfig: {
    stopLossPct: number;
    takeProfitPct?: number;
    maxPositionSizePct: number;
    maxDailyLossPct: number;
    trailingStop?: boolean;
    cooldownMinutes: number;
    maxLeverage: number;
  };
  capitalUsd: number;
}

interface OpenPosition {
  coin: string;
  pair: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  quantity: number;
  highestPrice: number;
  lowestPrice: number;
  orderId: string;
}

export class AgentRunner {
  private config: AgentConfig;
  private isRunning = false;
  private lastTradeTime?: Date;
  private dailyPnl = 0;
  private dailyPnlReset = new Date();
  private tradeCount = 0;
  private positions = new Map<string, OpenPosition>();
  private tradeLog: TradeResult[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
  }

  get agentId() { return this.config.id; }
  get status() { return this.config.status; }
  get stats() {
    return {
      tradeCount: this.tradeCount,
      dailyPnl: this.dailyPnl,
      openPositions: this.positions.size,
      isRunning: this.isRunning,
    };
  }

  async start() {
    this.isRunning = true;
    console.log(
      `[Agent ${this.config.id.slice(0, 8)}] Started — ${this.config.strategy} ` +
      `on ${this.config.pairs.join(", ")} (${this.config.status}, $${this.config.capitalUsd})`
    );
  }

  async stop() {
    this.isRunning = false;
    console.log(
      `[Agent ${this.config.id.slice(0, 8)}] Stopped — ` +
      `${this.tradeCount} trades, P&L: $${this.dailyPnl.toFixed(2)}`
    );
  }

  async pause(reason: string) {
    this.config.status = "PAUSED";
    // Persist pause to DB
    try {
      await db.execute(
        `UPDATE agents SET status = 'PAUSED', updated_at = NOW() WHERE id = '${this.config.id}'`
      );
    } catch { /* DB write is best-effort */ }
    console.log(`[Agent ${this.config.id.slice(0, 8)}] PAUSED: ${reason}`);
  }

  /** Main evaluation cycle */
  async evaluate(): Promise<void> {
    if (!this.isRunning || this.config.status === "PAUSED") return;

    const now = new Date();

    // Daily P&L reset at midnight UTC
    if (now.getUTCDate() !== this.dailyPnlReset.getUTCDate()) {
      console.log(
        `[Agent ${this.config.id.slice(0, 8)}] Daily reset — ` +
        `Yesterday P&L: $${this.dailyPnl.toFixed(2)}`
      );
      this.dailyPnl = 0;
      this.dailyPnlReset = now;
    }

    // Circuit breaker: daily loss limit
    const dailyLossPct =
      (Math.abs(Math.min(this.dailyPnl, 0)) / this.config.capitalUsd) * 100;
    if (dailyLossPct >= this.config.riskConfig.maxDailyLossPct) {
      await this.pause(
        `Daily loss limit hit: -${dailyLossPct.toFixed(1)}% ` +
        `(max ${this.config.riskConfig.maxDailyLossPct}%)`
      );
      return;
    }

    // Cooldown check
    if (this.lastTradeTime && this.config.riskConfig.cooldownMinutes > 0) {
      const elapsed = now.getTime() - this.lastTradeTime.getTime();
      if (elapsed < this.config.riskConfig.cooldownMinutes * 60 * 1000) return;
    }

    // Check stop-loss / take-profit on open positions
    await this.checkPositionExits();

    // Generate signals for each pair
    for (const pair of this.config.pairs) {
      const coin = pair.replace('-USD', '').replace('/USD', '');
      try {
        const signal = await generateLiveSignal(
          this.config.strategy,
          coin,
          pair,
          this.config.strategyConfig,
        );

        console.log(
          `[Agent ${this.config.id.slice(0, 8)}] ${coin} → ${signal.direction} ` +
          `(conf: ${signal.confidence.toFixed(0)}%) — ${signal.reason}`
        );

        if (signal.direction !== "HOLD" && signal.confidence >= 50) {
          await this.executeTrade(signal, coin);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[Agent ${this.config.id.slice(0, 8)}] Signal error ${coin}: ${msg}`
        );
      }
    }
  }

  private async checkPositionExits(): Promise<void> {
    for (const [coin, pos] of this.positions) {
      try {
        const currentPrice = await fetchLivePrice(coin);
        if (currentPrice <= 0) continue;

        // Track high/low for trailing stops
        if (pos.side === "LONG" && currentPrice > pos.highestPrice) {
          pos.highestPrice = currentPrice;
        }
        if (pos.side === "SHORT" && currentPrice < pos.lowestPrice) {
          pos.lowestPrice = currentPrice;
        }

        const pnlPct = pos.side === "LONG"
          ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
          : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;

        // Stop-loss
        if (pnlPct <= -this.config.riskConfig.stopLossPct) {
          console.log(
            `[Agent ${this.config.id.slice(0, 8)}] STOP-LOSS ${coin}: ${pnlPct.toFixed(2)}%`
          );
          await this.closePosition(coin, currentPrice, "STOP_LOSS");
          continue;
        }

        // Take-profit
        if (
          this.config.riskConfig.takeProfitPct &&
          pnlPct >= this.config.riskConfig.takeProfitPct
        ) {
          console.log(
            `[Agent ${this.config.id.slice(0, 8)}] TAKE-PROFIT ${coin}: +${pnlPct.toFixed(2)}%`
          );
          await this.closePosition(coin, currentPrice, "TAKE_PROFIT");
          continue;
        }

        // Trailing stop
        if (this.config.riskConfig.trailingStop) {
          if (pos.side === "LONG") {
            const trailingPrice = pos.highestPrice * (1 - this.config.riskConfig.stopLossPct / 100);
            if (currentPrice <= trailingPrice) {
              console.log(
                `[Agent ${this.config.id.slice(0, 8)}] TRAILING STOP ${coin}: ` +
                `$${currentPrice.toFixed(2)} < $${trailingPrice.toFixed(2)}`
              );
              await this.closePosition(coin, currentPrice, "TRAILING_STOP");
            }
          } else {
            const trailingPrice = pos.lowestPrice * (1 + this.config.riskConfig.stopLossPct / 100);
            if (currentPrice >= trailingPrice) {
              await this.closePosition(coin, currentPrice, "TRAILING_STOP");
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[Agent ${this.config.id.slice(0, 8)}] Position check error ${coin}: ${msg}`
        );
      }
    }
  }

  private async executeTrade(signal: Signal, coin: string): Promise<void> {
    if (signal.direction === "HOLD") return;

    // Don't open duplicate position
    if (signal.direction === "BUY" && this.positions.has(coin)) return;

    try {
      const result = await executePaperTrade(
        signal,
        this.config.capitalUsd,
        this.config.riskConfig.maxPositionSizePct,
      );

      this.tradeLog.push(result);
      this.tradeCount++;
      this.lastTradeTime = new Date();

      // Persist trade to DB
      await this.persistTrade(result);

      if (signal.direction === "BUY") {
        this.positions.set(coin, {
          coin,
          pair: signal.pair,
          side: "LONG",
          entryPrice: result.price,
          quantity: result.quantity,
          highestPrice: result.price,
          lowestPrice: result.price,
          orderId: result.orderId,
        });
      } else if (signal.direction === "SELL" && this.positions.has(coin)) {
        const pos = this.positions.get(coin)!;
        const pnl = (result.price - pos.entryPrice) * pos.quantity - result.fee;
        this.dailyPnl += pnl;
        this.positions.delete(coin);
        console.log(
          `[Agent ${this.config.id.slice(0, 8)}] Closed ${coin}: ` +
          `P&L $${pnl.toFixed(2)} (daily: $${this.dailyPnl.toFixed(2)})`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Agent ${this.config.id.slice(0, 8)}] Execution error: ${msg}`
      );
    }
  }

  private async closePosition(
    coin: string,
    currentPrice: number,
    reason: string,
  ): Promise<void> {
    const pos = this.positions.get(coin);
    if (!pos) return;

    const pnl =
      pos.side === "LONG"
        ? (currentPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - currentPrice) * pos.quantity;

    const fee = pos.quantity * currentPrice * 0.00035; // HL taker fee
    const netPnl = pnl - fee;

    this.dailyPnl += netPnl;
    this.positions.delete(coin);
    this.tradeCount++;

    console.log(
      `[Agent ${this.config.id.slice(0, 8)}] CLOSED ${coin} (${reason}): ` +
      `$${pos.entryPrice.toFixed(2)} → $${currentPrice.toFixed(2)}, ` +
      `P&L: $${netPnl.toFixed(2)} (daily: $${this.dailyPnl.toFixed(2)})`
    );
  }

  private async persistTrade(result: TradeResult): Promise<void> {
    try {
      await db.execute(`
        INSERT INTO trades (id, agent_id, user_id, coin, pair, side, type, quantity, price, fee, builder_fee, status, is_paper, hl_order_id, created_at)
        VALUES (
          gen_random_uuid(),
          '${this.config.id}',
          '${this.config.userId}',
          '${result.coin}',
          '${result.pair}',
          '${result.side}',
          'MARKET',
          ${result.quantity},
          ${result.price},
          ${result.fee},
          ${result.builderFee},
          'FILLED',
          ${result.isPaper},
          ${result.hlOrderId ? `'${result.hlOrderId}'` : 'NULL'},
          NOW()
        )
      `);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Agent ${this.config.id.slice(0, 8)}] DB persist error: ${msg}`);
    }
  }
}
