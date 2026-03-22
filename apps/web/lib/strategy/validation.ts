// ---------------------------------------------------------------------------
// Zod validation schemas for strategy definitions and backtest configs
// ---------------------------------------------------------------------------

import { z } from "zod";

// ---------------------------------------------------------------------------
// Indicator types
// ---------------------------------------------------------------------------

const indicatorTypeSchema = z.enum([
  "SMA", "EMA", "RSI", "MACD", "BB", "ATR", "VWAP", "OBV", "ADX", "STOCH",
]);

const comparisonOpSchema = z.enum([
  ">", "<", ">=", "<=", "crosses_above", "crosses_below",
]);

const logicOpSchema = z.enum(["AND", "OR"]);

const indicatorConfigSchema = z.object({
  type: indicatorTypeSchema,
  params: z.record(z.string(), z.number()),
});

// ---------------------------------------------------------------------------
// Condition — value can be a number or another indicator config
// ---------------------------------------------------------------------------

const conditionSchema = z.object({
  indicator: indicatorConfigSchema,
  comparison: comparisonOpSchema,
  value: z.union([z.number(), indicatorConfigSchema]),
});

// ---------------------------------------------------------------------------
// ConditionGroup — recursive (up to 5 levels of nesting)
// ---------------------------------------------------------------------------

const baseConditionGroupSchema = z.object({
  logic: logicOpSchema,
});

type ConditionGroupInput = z.infer<typeof baseConditionGroupSchema> & {
  conditions: (z.infer<typeof conditionSchema> | ConditionGroupInput)[];
};

const conditionGroupSchema: z.ZodType<ConditionGroupInput> = baseConditionGroupSchema
  .extend({
    conditions: z.lazy(() =>
      z.array(z.union([conditionSchema, conditionGroupSchema])).min(1).max(20)
    ),
  });

// ---------------------------------------------------------------------------
// Strategy definition schema
// ---------------------------------------------------------------------------

export const strategyDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  entryLong: conditionGroupSchema,
  entryShort: conditionGroupSchema.optional(),
  exitLong: conditionGroupSchema,
  exitShort: conditionGroupSchema.optional(),
  stopLossPct: z.number().min(0.1).max(50),
  takeProfitPct: z.number().min(0.1).max(100),
  trailingStopPct: z.number().min(0.1).max(50).optional(),
  timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]),
  cooldownBars: z.number().int().min(0).max(100),
});

// ---------------------------------------------------------------------------
// Backtest config schema
// ---------------------------------------------------------------------------

export const backtestConfigSchema = z.object({
  strategy: strategyDefinitionSchema,
  symbol: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9]+$/, "Symbol must be uppercase alphanumeric"),
  startDate: z.string().refine(
    (s) => !isNaN(Date.parse(s)),
    { message: "startDate must be a valid date string" }
  ),
  endDate: z.string().refine(
    (s) => !isNaN(Date.parse(s)),
    { message: "endDate must be a valid date string" }
  ),
  initialCapital: z.number().min(1).max(100_000_000),
  positionSizePct: z.number().min(1).max(100),
  fees: z.number().min(0).max(5),
  slippage: z.number().min(0).max(5),
});
