// ---------------------------------------------------------------------------
// Condition evaluator — recursively evaluates strategy condition groups
// against precomputed indicator values at a specific bar index
// ---------------------------------------------------------------------------

import type {
  Condition,
  ConditionGroup,
  IndicatorConfig,
  ComparisonOp,
} from "./types";

// ---------------------------------------------------------------------------
// Indicator cache type — keyed by serialized IndicatorConfig
// ---------------------------------------------------------------------------

export type IndicatorCache = Map<string, number[]>;

export function indicatorKey(config: IndicatorConfig): string {
  const paramStr = Object.entries(config.params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  return `${config.type}(${paramStr})`;
}

// ---------------------------------------------------------------------------
// Resolve indicator value at a bar index
// ---------------------------------------------------------------------------

function resolveValue(
  val: number | IndicatorConfig,
  barIndex: number,
  cache: IndicatorCache
): number {
  if (typeof val === "number") return val;
  const key = indicatorKey(val);
  const arr = cache.get(key);
  if (!arr) return NaN;
  return arr[barIndex] ?? NaN;
}

// ---------------------------------------------------------------------------
// Comparison logic
// ---------------------------------------------------------------------------

function compare(
  left: number,
  op: ComparisonOp,
  right: number,
  prevLeft: number,
  prevRight: number
): boolean {
  if (isNaN(left) || isNaN(right)) return false;

  switch (op) {
    case ">":
      return left > right;
    case "<":
      return left < right;
    case ">=":
      return left >= right;
    case "<=":
      return left <= right;
    case "crosses_above":
      if (isNaN(prevLeft) || isNaN(prevRight)) return false;
      return prevLeft <= prevRight && left > right;
    case "crosses_below":
      if (isNaN(prevLeft) || isNaN(prevRight)) return false;
      return prevLeft >= prevRight && left < right;
  }
}

// ---------------------------------------------------------------------------
// Evaluate a single condition
// ---------------------------------------------------------------------------

function evaluateCondition(
  condition: Condition,
  barIndex: number,
  cache: IndicatorCache
): boolean {
  const key = indicatorKey(condition.indicator);
  const arr = cache.get(key);
  if (!arr) return false;

  const left = arr[barIndex] ?? NaN;
  const right = resolveValue(condition.value, barIndex, cache);

  const prevLeft = barIndex > 0 ? (arr[barIndex - 1] ?? NaN) : NaN;
  const prevRight =
    barIndex > 0
      ? resolveValue(condition.value, barIndex - 1, cache)
      : NaN;

  return compare(left, condition.comparison, right, prevLeft, prevRight);
}

// ---------------------------------------------------------------------------
// Type guard: distinguish Condition from ConditionGroup
// ---------------------------------------------------------------------------

function isConditionGroup(
  item: Condition | ConditionGroup
): item is ConditionGroup {
  return "logic" in item && "conditions" in item;
}

// ---------------------------------------------------------------------------
// Recursive evaluation of a condition group
// ---------------------------------------------------------------------------

export function evaluateConditionGroup(
  group: ConditionGroup,
  barIndex: number,
  cache: IndicatorCache
): boolean {
  if (group.conditions.length === 0) return false;

  if (group.logic === "AND") {
    return group.conditions.every((item) => {
      if (isConditionGroup(item)) {
        return evaluateConditionGroup(item, barIndex, cache);
      }
      return evaluateCondition(item, barIndex, cache);
    });
  }

  // OR logic
  return group.conditions.some((item) => {
    if (isConditionGroup(item)) {
      return evaluateConditionGroup(item, barIndex, cache);
    }
    return evaluateCondition(item, barIndex, cache);
  });
}
