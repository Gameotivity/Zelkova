"use client";

import { useState, useRef, useEffect } from "react";

const TOP_HL_PERPS = [
  "BTC", "ETH", "SOL", "AVAX", "ARB", "OP", "DOGE", "LINK",
  "WIF", "PEPE", "INJ", "TIA", "SUI", "SEI", "JTO",
];

interface StrategyTickerSelectorProps {
  value: string;
  onChange: (ticker: string) => void;
}

export default function StrategyTickerSelector({
  value,
  onChange,
}: StrategyTickerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = TOP_HL_PERPS.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  function handleSelect(ticker: string) {
    onChange(ticker);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#1E293B] bg-[#0F1629] px-4 py-3 text-left transition-all duration-200 hover:border-[#00E5FF]/40 focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/50"
      >
        <span className="flex items-center gap-2">
          {/* Ticker icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
          >
            <circle cx="8" cy="8" r="7" stroke="#00E5FF" strokeWidth="1.5" />
            <path d="M5 8h6M8 5v6" stroke="#00E5FF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="font-mono text-sm font-semibold text-[#F8FAFC]">
            {value || "Select ticker"}
          </span>
          {value && (
            <span className="text-xs text-[#94A3B8]">-USD PERP</span>
          )}
        </span>
        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5l4 4 4-4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#1E293B] bg-[#0F1629] shadow-lg shadow-black/40">
          {/* Search input */}
          <div className="border-b border-[#1E293B] p-2">
            <div className="flex items-center gap-2 rounded-lg bg-[#06080E] px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                <circle cx="6" cy="6" r="4.5" stroke="#94A3B8" strokeWidth="1.2" />
                <path d="M9.5 9.5L13 13" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickers..."
                className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder-[#94A3B8] outline-none"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-[#94A3B8]">
                No tickers found
              </div>
            )}
            {filtered.map((ticker) => {
              const isSelected = ticker === value;
              return (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => handleSelect(ticker)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
                    isSelected
                      ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                      : "text-[#E2E8F0] hover:bg-[#1A2340]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {ticker}
                    </span>
                    <span className="text-xs text-[#94A3B8]">USD</span>
                  </span>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l4 4 6-8" stroke="#00E5FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
