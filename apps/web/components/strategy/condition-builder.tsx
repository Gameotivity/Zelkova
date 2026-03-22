"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { IndicatorSelector } from "./indicator-selector";
import { getDefaultParams } from "./indicator-data";
import { COMPARISON_OPERATORS } from "./strategy-types";
import type { ConditionGroup, ConditionRow, ComparisonOperator } from "./strategy-types";

interface ConditionBuilderProps {
  label: string;
  group: ConditionGroup;
  onChange: (group: ConditionGroup) => void;
}

function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeEmptyCondition(): ConditionRow {
  return {
    id: createId(),
    indicatorId: "rsi",
    indicatorParams: getDefaultParams("rsi"),
    operator: ">",
    compareType: "value",
    compareValue: 70,
    compareIndicatorId: "sma",
    compareIndicatorParams: getDefaultParams("sma"),
  };
}

export function ConditionBuilder({ label, group, onChange }: ConditionBuilderProps) {
  const addCondition = useCallback(() => {
    onChange({ ...group, conditions: [...group.conditions, makeEmptyCondition()] });
  }, [group, onChange]);

  const removeCondition = useCallback(
    (id: string) => {
      onChange({ ...group, conditions: group.conditions.filter((c) => c.id !== id) });
    },
    [group, onChange]
  );

  const updateCondition = useCallback(
    (id: string, patch: Partial<ConditionRow>) => {
      onChange({
        ...group,
        conditions: group.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      });
    },
    [group, onChange]
  );

  const toggleLogic = useCallback(() => {
    onChange({ ...group, logic: group.logic === "AND" ? "OR" : "AND" });
  }, [group, onChange]);

  const addSubGroup = useCallback(() => {
    const sub: ConditionGroup = {
      id: createId(),
      logic: "AND",
      conditions: [makeEmptyCondition()],
      groups: [],
    };
    onChange({ ...group, groups: [...group.groups, sub] });
  }, [group, onChange]);

  const updateSubGroup = useCallback(
    (id: string, subGroup: ConditionGroup) => {
      onChange({
        ...group,
        groups: group.groups.map((g) => (g.id === id ? subGroup : g)),
      });
    },
    [group, onChange]
  );

  const removeSubGroup = useCallback(
    (id: string) => {
      onChange({ ...group, groups: group.groups.filter((g) => g.id !== id) });
    },
    [group, onChange]
  );

  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">{label}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addSubGroup}
            className="rounded-lg border border-[#1E293B] px-3 py-1.5 text-xs text-[#94A3B8] transition-all duration-200 hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6]"
          >
            + Group
          </button>
          <button
            type="button"
            onClick={addCondition}
            className="rounded-lg bg-[#00E5FF]/10 px-3 py-1.5 text-xs font-medium text-[#00E5FF] transition-all duration-200 hover:bg-[#00E5FF]/20"
          >
            + Condition
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {group.conditions.map((cond, idx) => (
          <div key={cond.id}>
            {idx > 0 && (
              <LogicToggle logic={group.logic} onToggle={toggleLogic} />
            )}
            <ConditionRowComponent
              condition={cond}
              onUpdate={(patch) => updateCondition(cond.id, patch)}
              onRemove={() => removeCondition(cond.id)}
            />
          </div>
        ))}

        {group.groups.map((sub) => (
          <div key={sub.id} className="ml-4 border-l-2 border-[#8B5CF6]/30 pl-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8B5CF6]">
                Sub-Group
              </span>
              <button
                type="button"
                onClick={() => removeSubGroup(sub.id)}
                className="text-xs text-[#F43F5E] transition-all duration-200 hover:text-[#F43F5E]/80"
              >
                Remove
              </button>
            </div>
            <ConditionBuilder
              label=""
              group={sub}
              onChange={(updated) => updateSubGroup(sub.id, updated)}
            />
          </div>
        ))}

        {group.conditions.length === 0 && group.groups.length === 0 && (
          <p className="py-6 text-center text-sm text-[#94A3B8]">
            No conditions yet. Add one to get started.
          </p>
        )}
      </div>
    </div>
  );
}

function LogicToggle({ logic, onToggle }: { logic: "AND" | "OR"; onToggle: () => void }) {
  return (
    <div className="flex justify-center py-1.5">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest transition-all duration-200",
          logic === "AND"
            ? "bg-[#00E5FF]/10 text-[#00E5FF]"
            : "bg-[#8B5CF6]/10 text-[#8B5CF6]"
        )}
      >
        {logic}
      </button>
    </div>
  );
}

function ConditionRowComponent({
  condition,
  onUpdate,
  onRemove,
}: {
  condition: ConditionRow;
  onUpdate: (patch: Partial<ConditionRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-[#1E293B] bg-[#1A2340]/50 p-3">
      {/* Left indicator */}
      <div className="min-w-[180px] flex-1">
        <IndicatorSelector
          selectedId={condition.indicatorId}
          params={condition.indicatorParams}
          onSelect={(id) => onUpdate({ indicatorId: id, indicatorParams: getDefaultParams(id) })}
          onParamChange={(key, value) =>
            onUpdate({ indicatorParams: { ...condition.indicatorParams, [key]: value } })
          }
        />
      </div>

      {/* Operator */}
      <div className="w-36">
        <select
          value={condition.operator}
          onChange={(e) => onUpdate({ operator: e.target.value as ComparisonOperator })}
          className="w-full rounded-lg border border-[#1E293B] bg-[#1A2340] px-3 py-2 text-sm text-[#F8FAFC] focus:border-[#00E5FF] focus:outline-none"
        >
          {COMPARISON_OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Right side: value or indicator */}
      <div className="min-w-[180px] flex-1">
        <div className="mb-2 flex gap-1">
          <button
            type="button"
            onClick={() => onUpdate({ compareType: "value" })}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold uppercase transition-all duration-200",
              condition.compareType === "value"
                ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                : "text-[#94A3B8] hover:text-[#E2E8F0]"
            )}
          >
            Value
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ compareType: "indicator" })}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold uppercase transition-all duration-200",
              condition.compareType === "indicator"
                ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                : "text-[#94A3B8] hover:text-[#E2E8F0]"
            )}
          >
            Indicator
          </button>
        </div>

        {condition.compareType === "value" ? (
          <input
            type="number"
            value={condition.compareValue}
            onChange={(e) => onUpdate({ compareValue: Number(e.target.value) })}
            className="w-full rounded-lg border border-[#1E293B] bg-[#1A2340] px-3 py-2 font-mono text-sm text-[#F8FAFC] focus:border-[#00E5FF] focus:outline-none"
          />
        ) : (
          <IndicatorSelector
            selectedId={condition.compareIndicatorId}
            params={condition.compareIndicatorParams}
            onSelect={(id) =>
              onUpdate({ compareIndicatorId: id, compareIndicatorParams: getDefaultParams(id) })
            }
            onParamChange={(key, value) =>
              onUpdate({
                compareIndicatorParams: { ...condition.compareIndicatorParams, [key]: value },
              })
            }
          />
        )}
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 rounded-lg p-1.5 text-[#94A3B8] transition-all duration-200 hover:bg-[#F43F5E]/10 hover:text-[#F43F5E]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
