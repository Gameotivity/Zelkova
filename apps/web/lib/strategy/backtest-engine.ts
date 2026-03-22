// ---------------------------------------------------------------------------
// Core backtesting engine — evaluates strategies bar-by-bar on candle data
// ---------------------------------------------------------------------------

import type { CandleData } from "@/lib/market/live-prices";
import type {
  BacktestConfig,
  BacktestResult,
  Condition,
  ConditionGroup,
  IndicatorConfig,
} from "./types";
import {
  evaluateConditionGroup,
  indicatorKey,
  type IndicatorCache,
} from "./condition-evaluator";
import { computeIndicator } from "./indicator-resolver";
import { calculateMetrics } from "./metrics";
import {
  checkExitConditions,
  closePosition,
  getUnrealizedPnl,
  openPosition,
  updateTrailingStop,
  type OpenPosition,
} from "./position-manager";

// ---------------------------------------------------------------------------
// Collect all unique indicator configs from a condition group tree
// ---------------------------------------------------------------------------

function isConditionGroup(
  item: Condition | ConditionGroup
): item is ConditionGroup {
  return "logic" in item && "conditions" in item;
}

function collectIndicators(group: ConditionGroup): IndicatorConfig[] {
  const configs: IndicatorConfig[] = [];
  for (const item of group.conditions) {
    if (isConditionGroup(item)) {
      configs.push(...collectIndicators(item));
    } else {
      configs.push(item.indicator);
      if (typeof item.value !== "number") {
        configs.push(item.value);
      }
    }
  }
  return configs;
}

function deduplicateConfigs(configs: IndicatorConfig[]): IndicatorConfig[] {
  const seen = new Set<string>();
  const unique: IndicatorConfig[] = [];
  for (const cfg of configs) {
    const key = indicatorKey(cfg);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(cfg);
    }
  }
  return unique;
}

// ---------------------------------------------------------------------------
// Build indicator cache from candle data
// ---------------------------------------------------------------------------

function buildIndicatorCache(
  config: BacktestConfig,
  candles: CandleData[]
): IndicatorCache {
  const groups: ConditionGroup[] = [
    config.strategy.entryLong,
    config.strategy.exitLong,
  ];
  if (config.strategy.entryShort) groups.push(config.strategy.entryShort);
  if (config.strategy.exitShort) groups.push(config.strategy.exitShort);

  const allConfigs = groups.flatMap(collectIndicators);
  const unique = deduplicateConfigs(allConfigs);

  const cache: IndicatorCache = new Map();
  for (const cfg of unique) {
    const key = indicatorKey(cfg);
    cache.set(key, computeIndicator(cfg, candles));
  }
  return cache;
}

// ---------------------------------------------------------------------------
// Run backtest
// ---------------------------------------------------------------------------

export function runBacktest(
  config: BacktestConfig,
  candles: CandleData[]
): BacktestResult {
  const cache = buildIndicatorCache(config, candles);
  const trades: import("./types").TradeResult[] = [];
  const equityCurve: { time: number; equity: number }[] = [];
  const drawdownCurve: { time: number; drawdown: number }[] = [];

  let capital = config.initialCapital;
  let position: OpenPosition | null = null;
  let lastTradeBar = -config.strategy.cooldownBars;
  let peakEquity = capital;

  const feeMult = config.fees / 100;
  const slippageMult = config.slippage / 100;

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];

    // Check stop-loss / take-profit / trailing stop
    if (position) {
      const exitResult = checkExitConditions(
        position, candle, config, feeMult, slippageMult
      );
      if (exitResult) {
        capital += exitResult.pnl - exitResult.fees;
        trades.push(exitResult);
        position = null;
        lastTradeBar = i;
      }
    }

    // Check signal-based exit
    if (position) {
      const exitGroup =
        position.side === "LONG"
          ? config.strategy.exitLong
          : config.strategy.exitShort;
      if (exitGroup && evaluateConditionGroup(exitGroup, i, cache)) {
        const trade = closePosition(
          position, candle.close, "SIGNAL", feeMult, slippageMult, candle
        );
        capital += trade.pnl - trade.fees;
        trades.push(trade);
        position = null;
        lastTradeBar = i;
      }
    }

    // Update trailing stop
    if (position?.trailingStopPrice !== null && position) {
      position.trailingStopPrice = updateTrailingStop(
        position, candle, config.strategy.trailingStopPct ?? 0
      );
    }

    // Check entry signals
    if (!position && i - lastTradeBar >= config.strategy.cooldownBars) {
      if (evaluateConditionGroup(config.strategy.entryLong, i, cache)) {
        position = openPosition(
          "LONG", i, candle.close, capital, config, feeMult, slippageMult
        );
      } else if (
        config.strategy.entryShort &&
        evaluateConditionGroup(config.strategy.entryShort, i, cache)
      ) {
        position = openPosition(
          "SHORT", i, candle.close, capital, config, feeMult, slippageMult
        );
      }
    }

    // Record equity & drawdown
    const unrealized = position
      ? getUnrealizedPnl(position, candle.close)
      : 0;
    const equity = capital + unrealized;
    if (equity > peakEquity) peakEquity = equity;
    const drawdown = peakEquity > 0 ? (peakEquity - equity) / peakEquity : 0;

    equityCurve.push({ time: candle.openTime, equity });
    drawdownCurve.push({ time: candle.openTime, drawdown });
  }

  // Close any remaining position at last candle
  if (position) {
    const lastCandle = candles[candles.length - 1];
    const trade = closePosition(
      position, lastCandle.close, "SIGNAL", feeMult, slippageMult, lastCandle
    );
    capital += trade.pnl - trade.fees;
    trades.push(trade);
  }

  const metrics = calculateMetrics(trades, config.initialCapital, candles);
  return { trades, metrics, equityCurve, drawdownCurve };
}
