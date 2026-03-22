import { generateLiveSignal } from "../signals/strategy-runner";
import { executePaperTrade, fetchLivePrice } from "../executors/paper-executor";
import type { Signal, TradeResult } from "./types";

export interface AgentConfig {
  id: string;
  userId: string;
  type: "CRYPTO" | "POLYMARKET";
  status: "PAPER" | "LIVE" | "PAUSED";
  exchange?: string;
  pairs?: string[];
  strategy: string;
  strategyConfig: Record<string, any>;
  riskConfig: {
    stopLossPct: number;
    takeProfitPct?: number;
    maxPositionSizePct: number;
    maxDailyLossPct: number;
    trailingStop?: boolean;
    cooldownMinutes: number;
  };
  capitalUsd: number;
}

interface OpenPosition {
  pair: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  quantity: number;
  highestPrice: number;
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
      `on ${this.config.pairs?.join(", ")} (${this.config.status}, $${this.config.capitalUsd})`
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
    const exchange = this.config.exchange || "binance";
    for (const pair of this.config.pairs || []) {
      try {
        const signal = await generateLiveSignal(
          this.config.strategy,
          exchange,
          pair,
          this.config.strategyConfig
        );

        console.log(
          `[Agent ${this.config.id.slice(0, 8)}] ${pair} → ${signal.direction} ` +
          `(conf: ${signal.confidence.toFixed(0)}%) — ${signal.reason}`
        );

        if (signal.direction !== "HOLD" && signal.confidence >= 50) {
          await this.executeTrade(signal);
        }
      } catch (err: any) {
        console.error(
          `[Agent ${this.config.id.slice(0, 8)}] Signal error ${pair}: ${err.message}`
        );
      }
    }
  }

  private async checkPositionExits(): Promise<void> {
    const exchange = this.config.exchange || "binance";

    for (const [pair, pos] of this.positions) {
      try {
        const currentPrice = await fetchLivePrice(exchange, pair);
        if (currentPrice <= 0) continue;

        if (pos.side === "LONG" && currentPrice > pos.highestPrice) {
          pos.highestPrice = currentPrice;
        }

        const pnlPct = pos.side === "LONG"
          ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
          : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;

        // Stop-loss
        if (pnlPct <= -this.config.riskConfig.stopLossPct) {
          console.log(
            `[Agent ${this.config.id.slice(0, 8)}] STOP-LOSS ${pair}: ${pnlPct.toFixed(2)}%`
          );
          await this.closePosition(pair, currentPrice, "STOP_LOSS");
          continue;
        }

        // Take-profit
        if (
          this.config.riskConfig.takeProfitPct &&
          pnlPct >= this.config.riskConfig.takeProfitPct
        ) {
          console.log(
            `[Agent ${this.config.id.slice(0, 8)}] TAKE-PROFIT ${pair}: +${pnlPct.toFixed(2)}%`
          );
          await this.closePosition(pair, currentPrice, "TAKE_PROFIT");
          continue;
        }

        // Trailing stop
        if (this.config.riskConfig.trailingStop && pos.side === "LONG") {
          const trailingPrice =
            pos.highestPrice * (1 - this.config.riskConfig.stopLossPct / 100);
          if (currentPrice <= trailingPrice) {
            console.log(
              `[Agent ${this.config.id.slice(0, 8)}] TRAILING STOP ${pair}: ` +
              `$${currentPrice.toFixed(2)} < $${trailingPrice.toFixed(2)}`
            );
            await this.closePosition(pair, currentPrice, "TRAILING_STOP");
          }
        }
      } catch (err: any) {
        console.error(
          `[Agent ${this.config.id.slice(0, 8)}] Position check error ${pair}: ${err.message}`
        );
      }
    }
  }

  private async executeTrade(signal: Signal): Promise<void> {
    if (signal.direction === "HOLD") return;

    const exchange = this.config.exchange || "binance";

    if (signal.direction === "BUY" && this.positions.has(signal.pair)) return;

    try {
      const result = await executePaperTrade(
        exchange,
        signal,
        this.config.capitalUsd,
        this.config.riskConfig.maxPositionSizePct
      );

      this.tradeLog.push(result);
      this.tradeCount++;
      this.lastTradeTime = new Date();

      if (signal.direction === "BUY") {
        this.positions.set(signal.pair, {
          pair: signal.pair,
          side: "LONG",
          entryPrice: result.price,
          quantity: result.quantity,
          highestPrice: result.price,
          orderId: result.orderId,
        });
      } else if (signal.direction === "SELL" && this.positions.has(signal.pair)) {
        const pos = this.positions.get(signal.pair)!;
        const pnl = (result.price - pos.entryPrice) * pos.quantity - result.fee;
        this.dailyPnl += pnl;
        this.positions.delete(signal.pair);
        console.log(
          `[Agent ${this.config.id.slice(0, 8)}] Closed ${signal.pair}: ` +
          `P&L $${pnl.toFixed(2)} (daily: $${this.dailyPnl.toFixed(2)})`
        );
      }
    } catch (err: any) {
      console.error(
        `[Agent ${this.config.id.slice(0, 8)}] Execution error: ${err.message}`
      );
    }
  }

  private async closePosition(
    pair: string,
    currentPrice: number,
    reason: string
  ): Promise<void> {
    const pos = this.positions.get(pair);
    if (!pos) return;

    const pnl =
      pos.side === "LONG"
        ? (currentPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - currentPrice) * pos.quantity;

    const fee = pos.quantity * currentPrice * 0.001;
    const netPnl = pnl - fee;

    this.dailyPnl += netPnl;
    this.positions.delete(pair);
    this.tradeCount++;

    console.log(
      `[Agent ${this.config.id.slice(0, 8)}] CLOSED ${pair} (${reason}): ` +
      `$${pos.entryPrice.toFixed(2)} → $${currentPrice.toFixed(2)}, ` +
      `P&L: $${netPnl.toFixed(2)} (daily: $${this.dailyPnl.toFixed(2)})`
    );
  }
}
