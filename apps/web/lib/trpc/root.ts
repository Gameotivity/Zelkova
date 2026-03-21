import { router } from "./trpc";
import { agentsRouter } from "./routers/agents";
import { exchangeRouter } from "./routers/exchange";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  agents: agentsRouter,
  exchange: exchangeRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
