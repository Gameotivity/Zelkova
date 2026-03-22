import { AgentRunner, type AgentConfig } from "./agent-runner";
import { db } from "../db";

interface ScheduledAgent {
  runner: AgentRunner;
  intervalMs: number;
  timer?: ReturnType<typeof setInterval>;
}

export class AgentScheduler {
  private agents = new Map<string, ScheduledAgent>();
  private running = false;
  private pollTimer?: ReturnType<typeof setInterval>;

  private getIntervalMs(config: AgentConfig): number {
    const timeframe = (config.strategyConfig?.timeframe as string) || "1h";
    switch (timeframe) {
      case "1m": return 60 * 1000;
      case "5m": return 5 * 60 * 1000;
      case "15m": return 5 * 60 * 1000;
      case "1h": return 5 * 60 * 1000;
      case "4h": return 15 * 60 * 1000;
      case "1d": return 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  }

  async start() {
    this.running = true;
    console.log("[AgentScheduler] Starting...");

    // Load active agents from DB
    await this.loadAgentsFromDb();

    // Poll for new/changed agents every 30 seconds
    this.pollTimer = setInterval(async () => {
      try {
        await this.syncAgents();
      } catch (err) {
        console.error("[AgentScheduler] Sync error:", err);
      }
    }, 30_000);

    console.log(`[AgentScheduler] Running with ${this.agents.size} agent(s).`);
  }

  async stop() {
    this.running = false;
    if (this.pollTimer) clearInterval(this.pollTimer);
    for (const [, scheduled] of this.agents) {
      if (scheduled.timer) clearInterval(scheduled.timer);
      await scheduled.runner.stop();
    }
    this.agents.clear();
    console.log("[AgentScheduler] Stopped all agents.");
  }

  /** Load active agents from the database */
  private async loadAgentsFromDb(): Promise<void> {
    try {
      const rows = await db.execute(`
        SELECT id, user_id, status, pairs, strategy, strategy_config,
               risk_config, default_leverage
        FROM agents
        WHERE status IN ('PAPER', 'LIVE')
        ORDER BY created_at ASC
      `);

      const agents = rows as unknown as Array<Record<string, unknown>>;

      for (const row of agents) {
        const config = this.rowToConfig(row);
        if (config) {
          await this.addAgent(config);
        }
      }

      console.log(`[AgentScheduler] Loaded ${agents.length} agent(s) from DB.`);
    } catch (err) {
      console.error("[AgentScheduler] Failed to load agents from DB:", err);
    }
  }

  /** Sync agents: add new ones, remove stopped ones */
  private async syncAgents(): Promise<void> {
    try {
      const rows = await db.execute(`
        SELECT id, status FROM agents WHERE status IN ('PAPER', 'LIVE', 'PAUSED', 'STOPPED')
      `);

      const dbAgents = rows as unknown as Array<{ id: string; status: string }>;
      const activeIds = new Set<string>();

      for (const row of dbAgents) {
        if (row.status === "PAPER" || row.status === "LIVE") {
          activeIds.add(row.id);
          // If not already running, load full config and add
          if (!this.agents.has(row.id)) {
            const fullRows = await db.execute(
              `SELECT id, user_id, status, pairs, strategy, strategy_config, risk_config, default_leverage FROM agents WHERE id = '${row.id}'`
            );
            const fullAgents = fullRows as unknown as Array<Record<string, unknown>>;
            if (fullAgents[0]) {
              const config = this.rowToConfig(fullAgents[0]);
              if (config) await this.addAgent(config);
            }
          }
        } else {
          // Agent was paused/stopped — remove if running
          if (this.agents.has(row.id)) {
            await this.removeAgent(row.id);
          }
        }
      }

      // Remove agents that were deleted from DB
      for (const id of this.agents.keys()) {
        if (!activeIds.has(id)) {
          await this.removeAgent(id);
        }
      }
    } catch {
      // Sync is best-effort
    }
  }

  private rowToConfig(row: Record<string, unknown>): AgentConfig | null {
    try {
      const riskConfig = typeof row.risk_config === "string"
        ? JSON.parse(row.risk_config)
        : row.risk_config;
      const strategyConfig = typeof row.strategy_config === "string"
        ? JSON.parse(row.strategy_config)
        : row.strategy_config;
      const pairs = typeof row.pairs === "string"
        ? JSON.parse(row.pairs)
        : row.pairs;

      return {
        id: row.id as string,
        userId: row.user_id as string,
        status: row.status as "PAPER" | "LIVE",
        pairs: (pairs as string[]) ?? ["BTC-USD"],
        strategy: row.strategy as string,
        strategyConfig: strategyConfig ?? {},
        riskConfig: {
          stopLossPct: riskConfig?.stopLossPct ?? 5,
          takeProfitPct: riskConfig?.takeProfitPct,
          maxPositionSizePct: riskConfig?.maxPositionSizePct ?? 10,
          maxDailyLossPct: riskConfig?.maxDailyLossPct ?? 5,
          trailingStop: riskConfig?.trailingStop ?? false,
          cooldownMinutes: riskConfig?.cooldownMinutes ?? 5,
          maxLeverage: riskConfig?.maxLeverage ?? 1,
        },
        capitalUsd: 1000, // Default paper capital; live agents use wallet balance
      };
    } catch {
      return null;
    }
  }

  async addAgent(config: AgentConfig) {
    if (this.agents.has(config.id)) return;

    const runner = new AgentRunner(config);
    const intervalMs = this.getIntervalMs(config);

    await runner.start();

    const timer = setInterval(async () => {
      try {
        await runner.evaluate();
      } catch (err) {
        console.error(`[AgentScheduler] Error evaluating agent ${config.id.slice(0, 8)}:`, err);
      }
    }, intervalMs);

    this.agents.set(config.id, { runner, intervalMs, timer });
    console.log(`[AgentScheduler] Scheduled agent ${config.id.slice(0, 8)} every ${intervalMs / 1000}s`);
  }

  async removeAgent(agentId: string) {
    const scheduled = this.agents.get(agentId);
    if (!scheduled) return;
    if (scheduled.timer) clearInterval(scheduled.timer);
    await scheduled.runner.stop();
    this.agents.delete(agentId);
    console.log(`[AgentScheduler] Removed agent ${agentId.slice(0, 8)}`);
  }

  getActiveCount(): number {
    return this.agents.size;
  }

  getStats() {
    const stats: Record<string, unknown> = {};
    for (const [id, scheduled] of this.agents) {
      stats[id] = scheduled.runner.stats;
    }
    return stats;
  }
}
