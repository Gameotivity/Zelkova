import type { Signal } from "./types";

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
}

export class AgentRunner {
  private config: AgentConfig;
  private isRunning = false;
  private lastTradeTime?: Date;
  private dailyPnl = 0;
  private dailyPnlReset = new Date();

  constructor(config: AgentConfig) {
    this.config = config;
  }

  get agentId() {
    return this.config.id;
  }

  get status() {
    return this.config.status;
  }

  async start() {
    this.isRunning = true;
    console.log(`[Agent ${this.config.id}] Started (${this.config.strategy} on ${this.config.pairs?.join(", ")})`);
  }

  async stop() {
    this.isRunning = false;
    console.log(`[Agent ${this.config.id}] Stopped`);
  }

  async pause() {
    this.config.status = "PAUSED";
    console.log(`[Agent ${this.config.id}] Paused`);
  }

  /** Main evaluation cycle — called by scheduler */
  async evaluate(): Promise<Signal | null> {
    if (!this.isRunning || this.config.status === "PAUSED") return null;

    // Reset daily P&L at midnight
    const now = new Date();
    if (now.getDate() !== this.dailyPnlReset.getDate()) {
      this.dailyPnl = 0;
      this.dailyPnlReset = now;
    }

    // Check daily loss limit
    // In a full implementation, this would query actual P&L from the database
    if (Math.abs(this.dailyPnl) > 0) {
      const dailyLossPct = (Math.abs(Math.min(this.dailyPnl, 0)) / 10000) * 100;
      if (dailyLossPct >= this.config.riskConfig.maxDailyLossPct) {
        console.log(`[Agent ${this.config.id}] Daily loss limit hit. Auto-pausing.`);
        await this.pause();
        return null;
      }
    }

    // Check cooldown
    if (this.lastTradeTime && this.config.riskConfig.cooldownMinutes > 0) {
      const elapsed = now.getTime() - this.lastTradeTime.getTime();
      if (elapsed < this.config.riskConfig.cooldownMinutes * 60 * 1000) {
        return null;
      }
    }

    // Generate signal based on strategy
    // In full implementation, this fetches candles and runs signal generator
    return null;
  }

  /** Execute a trade (paper or live) */
  async executeTrade(signal: Signal): Promise<void> {
    if (signal.direction === "HOLD") return;

    if (this.config.status === "PAPER") {
      await this.executePaperTrade(signal);
    } else if (this.config.status === "LIVE") {
      await this.executeLiveTrade(signal);
    }

    this.lastTradeTime = new Date();
  }

  private async executePaperTrade(signal: Signal): Promise<void> {
    console.log(
      `[Agent ${this.config.id}] PAPER ${signal.direction} ${signal.pair} ` +
      `(confidence: ${signal.confidence}%, reason: ${signal.reason})`
    );
    // In full implementation: simulate fill at current price + slippage, store in DB
  }

  private async executeLiveTrade(signal: Signal): Promise<void> {
    console.log(
      `[Agent ${this.config.id}] LIVE ${signal.direction} ${signal.pair} ` +
      `(confidence: ${signal.confidence}%, reason: ${signal.reason})`
    );
    // In full implementation: submit order via CCXT, track fills, update positions
  }
}
