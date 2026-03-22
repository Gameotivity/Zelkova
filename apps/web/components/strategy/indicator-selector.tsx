"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { INDICATORS, INDICATOR_CATEGORIES, getIndicatorById } from "./indicator-data";
import type { IndicatorDef } from "./strategy-types";

interface IndicatorSelectorProps {
  selectedId: string;
  params: Record<string, number>;
  onSelect: (id: string) => void;
  onParamChange: (key: string, value: number) => void;
}

export function IndicatorSelector({
  selectedId,
  params,
  onSelect,
  onParamChange,
}: IndicatorSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = getIndicatorById(selectedId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm",
          "border-[#1E293B] bg-[#1A2340] text-[#F8FAFC] transition-all duration-200",
          "hover:border-[#00E5FF]/40 focus:border-[#00E5FF] focus:outline-none"
        )}
      >
        <span>{selected ? selected.name : "Select indicator"}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-xl border border-[#1E293B] bg-[#0F1629] shadow-2xl">
          {INDICATOR_CATEGORIES.map((cat) => (
            <div key={cat}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                {cat}
              </div>
              {INDICATORS.filter((i) => i.category === cat).map((ind) => (
                <IndicatorOption
                  key={ind.id}
                  indicator={ind}
                  isSelected={ind.id === selectedId}
                  onSelect={() => {
                    onSelect(ind.id);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {selected && selected.params.length > 0 && (
        <div className="mt-2 space-y-2">
          {selected.params.map((p) => (
            <div key={p.key} className="flex items-center gap-3">
              <label className="w-16 text-xs text-[#94A3B8]">{p.label}</label>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={params[p.key] ?? p.defaultValue}
                onChange={(e) => onParamChange(p.key, Number(e.target.value))}
                className="h-1.5 flex-1 appearance-none rounded-full bg-[#1A2340] accent-[#00E5FF]"
              />
              <span className="w-10 text-right font-mono text-xs text-[#F8FAFC]">
                {params[p.key] ?? p.defaultValue}
              </span>
            </div>
          ))}
          <p className="text-[11px] text-[#94A3B8]">{selected.description}</p>
        </div>
      )}
    </div>
  );
}

function IndicatorOption({
  indicator,
  isSelected,
  onSelect,
}: {
  indicator: IndicatorDef;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-all duration-200",
        isSelected
          ? "bg-[#00E5FF]/10 text-[#00E5FF]"
          : "text-[#E2E8F0] hover:bg-[#1A2340]"
      )}
    >
      <span className="font-medium">{indicator.name}</span>
      <span className="ml-auto text-[10px] text-[#94A3B8]">
        {indicator.params.length > 0
          ? indicator.params.map((p) => p.defaultValue).join("/")
          : "—"}
      </span>
    </button>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={cn("h-4 w-4 text-[#94A3B8] transition-transform duration-200", open && "rotate-180")}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
