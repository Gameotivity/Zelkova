/**
 * Circuit Breaker Service for Zelkora.
 *
 * Tracks daily P&L per agent and enforces:
 *   - Per-agent circuit breaker: pause if daily loss > maxDailyLossPct
 *   - Global circuit breaker: pause ALL agents if portfolio drops > 15% in 24h
 *
 * State lives in-memory per process; in production this should be backed by
 * Redis or the database. The in-memory implementation is safe for single-node
 * deployments and paper trading.
 */

import { db } from "@/lib/db";
import { agents, trades } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { RISK_LIMITS } from "@zelkora/shared";

// ---------------------------------------------------------------------------
// In-memory daily P&L tracker (reset at midnight UTC)
// ---------------------------------------------------------------------------

interface DailyState {
  date: string; // YYYY-MM-DD
  pnlByAgent: Map<string, number>;
  totalPnl: number;
  portfolioValueStart: number;
}

let state: DailyState = {
  date: todayUTC(),
  pnlByAgent: new Map(),
  totalPnl: 0,
  portfolioValueStart: 0,
};

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureFreshDay(): void {
  const today = todayUTC();
  if (state.date !== today) {
    state = {
      date: today,
      pnlByAgent: new Map(),
      totalPnl: 0,
      portfolioValueStart: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CircuitBreakerResult {
  allowed: boolean;
  reason?: string;
  /** If true, ALL agents for this user should be paused */
  globalHalt?: boolean;
}

/**
 * Record a realized P&L for an agent.
 * Call this after every filled trade.
 */
export function recordPnl(agentId: string, pnl: number): void {
  ensureFreshDay();
  const current = state.pnlByAgent.get(agentId) ?? 0;
  state.pnlByAgent.set(agentId, current + pnl);
  state.totalPnl += pnl;
}

/**
 * Set the portfolio value at the start of the day.
 * Should be called once at the beginning of each trading day.
 */
export function setPortfolioStartValue(value: number): void {
  ensureFreshDay();
  state.portfolioValueStart = value;
}

/**
 * Check if a new trade is allowed for a given agent.
 *
 * Enforces:
 *   1. Per-agent daily loss limit (from agent's riskConfig.maxDailyLossPct)
 *   2. Global portfolio circuit breaker (15% drawdown in 24h)
 */
export function checkCircuitBreaker(
  agentId: string,
  maxDailyLossPct: number,
  capitalBase: number,
  currentPortfolioValue?: number,
): CircuitBreakerResult {
  ensureFreshDay();

  // 1. Per-agent daily loss check
  const agentDailyPnl = state.pnlByAgent.get(agentId) ?? 0;
  if (agentDailyPnl < 0 && capitalBase > 0) {
    const lossPct = (Math.abs(agentDailyPnl) / capitalBase) * 100;
    if (lossPct >= maxDailyLossPct) {
      return {
        allowed: false,
        reason: `Agent daily loss ${lossPct.toFixed(1)}% exceeds limit ${maxDailyLossPct}%. Agent paused.`,
      };
    }
  }

  // 2. Global portfolio circuit breaker
  if (
    currentPortfolioValue !== undefined &&
    state.portfolioValueStart > 0
  ) {
    const drawdownPct =
      ((state.portfolioValueStart - currentPortfolioValue) /
        state.portfolioValueStart) *
      100;

    if (drawdownPct >= RISK_LIMITS.GLOBAL_PORTFOLIO_STOP_PCT) {
      return {
        allowed: false,
        globalHalt: true,
        reason: `Portfolio dropped ${drawdownPct.toFixed(1)}% today (limit: ${RISK_LIMITS.GLOBAL_PORTFOLIO_STOP_PCT}%). ALL agents paused.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Pause an agent in the database by setting its status to PAUSED.
 */
export async function pauseAgent(agentId: string): Promise<void> {
  await db
    .update(agents)
    .set({ status: "PAUSED", updatedAt: new Date() })
    .where(eq(agents.id, agentId));
}

/**
 * Pause ALL agents for a user (global circuit breaker).
 */
export async function pauseAllAgents(userId: string): Promise<number> {
  const result = await db
    .update(agents)
    .set({ status: "PAUSED", updatedAt: new Date() })
    .where(
      and(
        eq(agents.userId, userId),
        sql`${agents.status} IN ('PAPER', 'LIVE')`
      )
    )
    .returning({ id: agents.id });

  return result.length;
}

/**
 * Get daily P&L summary from DB for a user (fallback for process restarts).
 */
export async function getDailyPnlFromDb(
  userId: string,
): Promise<{ totalPnl: number; tradeCount: number }> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [result] = await db
    .select({
      totalPnl: sql<number>`COALESCE(sum(${trades.pnl}), 0)`,
      tradeCount: sql<number>`count(*)`,
    })
    .from(trades)
    .where(
      and(
        eq(trades.userId, userId),
        gte(trades.createdAt, todayStart),
        sql`${trades.pnl} IS NOT NULL`
      )
    );

  return {
    totalPnl: Number(result.totalPnl),
    tradeCount: Number(result.tradeCount),
  };
}
