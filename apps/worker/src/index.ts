import { AgentScheduler } from "./engine/scheduler";

async function main() {
  console.log("[Zelkora Worker] Starting agent execution service...");

  const scheduler = new AgentScheduler();
  await scheduler.start();

  process.on("SIGTERM", async () => {
    console.log("[Zelkora Worker] Shutting down gracefully...");
    await scheduler.stop();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[Zelkora Worker] Shutting down gracefully...");
    await scheduler.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[Zelkora Worker] Fatal error:", err);
  process.exit(1);
});
