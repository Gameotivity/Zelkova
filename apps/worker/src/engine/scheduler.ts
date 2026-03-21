import { AgentRunner, type AgentConfig } from "./agent-runner";

interface ScheduledAgent {
  runner: AgentRunner;
  intervalMs: number;
  timer?: ReturnType<typeof setInterval>;
}

export class AgentScheduler {
  private agents = new Map<string, ScheduledAgent>();
  private running = false;

  private getIntervalMs(config: AgentConfig): number {
    if (config.type === "POLYMARKET") return 15 * 60 * 1000;

    const timeframe = config.strategyConfig?.timeframe || "1h";
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
    console.log("[AgentScheduler] Started. Waiting for agents...");
  }

  async stop() {
    this.running = false;
    for (const [, scheduled] of this.agents) {
      if (scheduled.timer) clearInterval(scheduled.timer);
      await scheduled.runner.stop();
    }
    this.agents.clear();
    console.log("[AgentScheduler] Stopped all agents.");
  }

  async addAgent(config: AgentConfig) {
    if (this.agents.has(config.id)) return;

    const runner = new AgentRunner(config);
    const intervalMs = this.getIntervalMs(config);

    await runner.start();

    const timer = setInterval(async () => {
      try {
        const signal = await runner.evaluate();
        if (signal && signal.direction !== "HOLD") {
          await runner.executeTrade(signal);
        }
      } catch (err) {
        console.error(`[AgentScheduler] Error evaluating agent ${config.id}:`, err);
      }
    }, intervalMs);

    this.agents.set(config.id, { runner, intervalMs, timer });
    console.log(`[AgentScheduler] Scheduled agent ${config.id} every ${intervalMs / 1000}s`);
  }

  async removeAgent(agentId: string) {
    const scheduled = this.agents.get(agentId);
    if (!scheduled) return;
    if (scheduled.timer) clearInterval(scheduled.timer);
    await scheduled.runner.stop();
    this.agents.delete(agentId);
  }

  async pauseAgent(agentId: string) {
    const scheduled = this.agents.get(agentId);
    if (scheduled) await scheduled.runner.pause();
  }

  getActiveCount(): number {
    return this.agents.size;
  }
}
