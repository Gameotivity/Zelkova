"use client";

import { useState } from "react";
import type { HyperAlphaResult } from "@/lib/ai/types";

interface StrategyExecuteTradeProps {
  result: HyperAlphaResult;
  onClose: () => void;
  onSuccess: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#94A3B8]">{label}</span>
      <span className="font-mono text-sm text-[#F8FAFC]">{value}</span>
    </div>
  );
}

export default function StrategyExecuteTrade({
  result,
  onClose,
  onSuccess,
}: StrategyExecuteTradeProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const side = result.action === "long" ? "buy" : "sell";
  const computedSize =
    result.size_usd && result.entry_price
      ? result.size_usd / result.entry_price
      : 0;
  const orderType = result.entry_price ? "limit" : "market";

  async function handleConfirm() {
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/trade/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin: result.ticker,
          side,
          size: String(computedSize),
          price: result.entry_price ? String(result.entry_price) : null,
          orderType,
          apiWalletKey: "",
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      setStatus("success");
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#1E293B] bg-[#0F1629] shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] px-5 py-4">
          <h2 className="text-base font-semibold text-[#F8FAFC]">Confirm Trade Execution</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#94A3B8] transition-all duration-200 hover:bg-[#1A2340] hover:text-[#F8FAFC]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Trade summary */}
        <div className="flex flex-col gap-2.5 px-5 py-4">
          <SummaryRow
            label="Action"
            value={`${result.action.toUpperCase()} (${side})`}
          />
          <SummaryRow label="Ticker" value={`${result.ticker}-USD`} />
          <SummaryRow
            label="Entry Price"
            value={result.entry_price != null ? `$${result.entry_price.toLocaleString()}` : "Market"}
          />
          <SummaryRow
            label="Stop Loss"
            value={result.stop_loss != null ? `$${result.stop_loss.toLocaleString()}` : "--"}
          />
          <SummaryRow
            label="Take Profit"
            value={result.take_profit != null ? `$${result.take_profit.toLocaleString()}` : "--"}
          />
          <SummaryRow
            label="Size"
            value={`${computedSize.toFixed(4)} ${result.ticker}`}
          />
          <SummaryRow
            label="Size USD"
            value={result.size_usd != null ? `$${result.size_usd.toLocaleString()}` : "--"}
          />
          <SummaryRow
            label="Leverage"
            value={result.leverage != null ? `${result.leverage}x` : "--"}
          />
          <SummaryRow label="Order Type" value={orderType.toUpperCase()} />
        </div>

        {/* Warning */}
        <div className="mx-5 flex items-start gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
            <path d="M8 1L1 14h14L8 1z" stroke="#F59E0B" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M8 6v4" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="8" cy="12" r="0.5" fill="#F59E0B" />
          </svg>
          <p className="text-xs leading-relaxed text-[#F59E0B]">
            This will submit a real order to Hyperliquid. Ensure you understand the risks before proceeding. Losses may exceed your initial position.
          </p>
        </div>

        {/* Status feedback */}
        {status === "success" && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-[#10B981]/10 px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#10B981" strokeWidth="1.3" />
              <path d="M4.5 7l2 2 3-3.5" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-medium text-[#10B981]">Order submitted successfully</span>
          </div>
        )}
        {status === "error" && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-[#F43F5E]/10 px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#F43F5E" strokeWidth="1.3" />
              <path d="M5 5l4 4M9 5l-4 4" stroke="#F43F5E" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-[#F43F5E]">{errorMsg}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={status === "loading"}
            className="flex-1 rounded-lg border border-[#1E293B] bg-transparent px-4 py-2.5 text-sm font-medium text-[#E2E8F0] transition-all duration-200 hover:bg-[#1A2340] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={status === "loading" || status === "success"}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#00E5FF] px-4 py-2.5 text-sm font-semibold text-[#06080E] transition-all duration-200 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)] disabled:opacity-40"
          >
            {status === "loading" ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
                <circle cx="8" cy="8" r="6" stroke="#06080E" strokeWidth="2" opacity="0.3" />
                <path d="M14 8a6 6 0 00-6-6" stroke="#06080E" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              "Confirm Execute"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
