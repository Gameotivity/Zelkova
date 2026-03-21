export class AgentScheduler {
  private running = false;

  async start() {
    this.running = true;
    console.log("[AgentScheduler] Started. Waiting for agents...");
  }

  async stop() {
    this.running = false;
    console.log("[AgentScheduler] Stopped.");
  }
}
