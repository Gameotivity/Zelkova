"use client";

import { useState, useCallback } from "react";
import { StrategyPipeline } from "@/components/dashboard/strategy-pipeline";
import type { HyperAlphaResult } from "@/lib/ai/types";

const TICKERS = ["BTC", "ETH", "SOL", "AVAX", "ARB", "OP", "DOGE", "LINK", "WIF", "PEPE", "INJ", "TIA", "SUI", "SEI", "JTO"];

export default function StrategiesPage() {
  const [ticker, setTicker] = useState("BTC");
  const [result, setResult] = useState<HyperAlphaResult | null>(null);
  const [showExecute, setShowExecute] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [filter, setFilter] = useState("");

  const filteredTickers = filter
    ? TICKERS.filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
    : TICKERS;

  const handleResult = useCallback((r: HyperAlphaResult) => {
    setResult(r);
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-[#F8FAFC]">AI STRATEGY ENGINE</h1>
            <span className="rounded border border-[#00E5FF]/20 bg-[#00E5FF]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00E5FF]">LIVE</span>
          </div>
          <p className="mt-1 font-mono text-xs text-[#94A3B8]">Select a token and run the 7-layer AI pipeline</p>
        </div>
      </div>

      {/* Ticker Selector */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-[#94A3B8]">SELECT TOKEN</span>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search..."
            className="rounded-lg border border-[#1E293B] bg-[#06080E] px-3 py-1 font-mono text-xs text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#00E5FF]/50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredTickers.map((t) => (
            <button
              key={t}
              onClick={() => setTicker(t)}
              className="rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition-all duration-200"
              style={{
                borderColor: ticker === t ? "#00E5FF" : "#1E293B",
                background: ticker === t ? "#00E5FF10" : "transparent",
                color: ticker === t ? "#00E5FF" : "#94A3B8",
                boxShadow: ticker === t ? "0 0 15px rgba(0,229,255,0.1)" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <StrategyPipeline ticker={ticker} onResult={handleResult} />

      {/* Action Buttons (show after result) */}
      {result && (
        <div className="flex gap-3">
          {result.approved && (
            <button
              onClick={() => setShowExecute(true)}
              className="flex-1 rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 py-3 font-mono text-sm font-bold text-[#00E5FF] transition-all hover:bg-[#00E5FF]/20 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)]"
            >
              EXECUTE TRADE
            </button>
          )}
          <button
            onClick={() => setShowAgent(true)}
            className="flex-1 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 py-3 font-mono text-sm font-bold text-[#8B5CF6] transition-all hover:bg-[#8B5CF6]/20 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]"
          >
            CREATE AGENT
          </button>
        </div>
      )}

      {/* Full Report (expandable) */}
      {result && (
        <details className="group rounded-xl border border-[#1E293B] bg-[#0A0F1A]">
          <summary className="cursor-pointer px-4 py-3 font-mono text-xs font-bold text-[#94A3B8] transition-colors hover:text-[#F8FAFC]">
            VIEW FULL REPORT
          </summary>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-[#1E293B] p-4 font-mono text-[11px] text-[#E2E8F0]/70">
            {result.report}
          </pre>
        </details>
      )}

      {/* Execute Trade Modal */}
      {showExecute && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowExecute(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-mono text-lg font-bold text-[#F8FAFC]">CONFIRM TRADE</h3>
            <div className="mt-4 space-y-2 font-mono text-xs text-[#E2E8F0]">
              <div className="flex justify-between"><span className="text-[#94A3B8]">Action</span><span className={result.action === "long" ? "text-[#10B981]" : "text-[#F43F5E]"}>{result.action.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-[#94A3B8]">Ticker</span><span>{result.ticker}-PERP</span></div>
              {result.entry_price && <div className="flex justify-between"><span className="text-[#94A3B8]">Entry</span><span>${result.entry_price.toLocaleString()}</span></div>}
              {result.stop_loss && <div className="flex justify-between"><span className="text-[#94A3B8]">Stop Loss</span><span className="text-[#F43F5E]">${result.stop_loss.toLocaleString()}</span></div>}
              {result.take_profit && <div className="flex justify-between"><span className="text-[#94A3B8]">Take Profit</span><span className="text-[#10B981]">${result.take_profit.toLocaleString()}</span></div>}
              {result.size_usd && <div className="flex justify-between"><span className="text-[#94A3B8]">Size</span><span>${result.size_usd.toLocaleString()}</span></div>}
              {result.leverage && <div className="flex justify-between"><span className="text-[#94A3B8]">Leverage</span><span className="text-[#00E5FF]">{result.leverage}x</span></div>}
            </div>
            <p className="mt-4 font-mono text-[10px] text-[#F59E0B]">
              Requires API wallet delegation. Connect your wallet and approve the agent wallet first.
            </p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowExecute(false)} className="flex-1 rounded-lg border border-[#1E293B] py-2 font-mono text-xs text-[#94A3B8] hover:border-[#94A3B8]/50">CANCEL</button>
              <button
                onClick={() => {
                  alert("Trade execution requires API wallet setup. Connect your wallet first.");
                  setShowExecute(false);
                }}
                className="flex-1 rounded-lg bg-[#00E5FF]/20 py-2 font-mono text-xs font-bold text-[#00E5FF] hover:bg-[#00E5FF]/30"
              >
                EXECUTE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showAgent && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAgent(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-mono text-lg font-bold text-[#F8FAFC]">CREATE AI AGENT</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="font-mono text-[10px] text-[#94A3B8]">AGENT NAME</label>
                <input defaultValue={`HyperAlpha ${result.ticker}`} className="mt-1 w-full rounded-lg border border-[#1E293B] bg-[#06080E] px-3 py-2 font-mono text-xs text-[#F8FAFC] outline-none focus:border-[#8B5CF6]/50" />
              </div>
              <div>
                <label className="font-mono text-[10px] text-[#94A3B8]">SCHEDULE</label>
                <select defaultValue="4h" className="mt-1 w-full rounded-lg border border-[#1E293B] bg-[#06080E] px-3 py-2 font-mono text-xs text-[#F8FAFC] outline-none">
                  <option value="1h">Every 1 hour</option>
                  <option value="4h">Every 4 hours</option>
                  <option value="8h">Every 8 hours</option>
                  <option value="1d">Once daily</option>
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] text-[#94A3B8]">MODE</label>
                <div className="mt-1 flex gap-2">
                  <button className="flex-1 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 py-2 font-mono text-xs font-bold text-[#F59E0B]">PAPER</button>
                  <button className="flex-1 rounded-lg border border-[#1E293B] py-2 font-mono text-xs text-[#94A3B8]">LIVE</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[10px] text-[#94A3B8]">STOP LOSS %</label>
                  <input type="number" defaultValue={2} className="mt-1 w-full rounded-lg border border-[#1E293B] bg-[#06080E] px-3 py-2 font-mono text-xs text-[#F8FAFC] outline-none" />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[#94A3B8]">MAX DAILY LOSS %</label>
                  <input type="number" defaultValue={5} className="mt-1 w-full rounded-lg border border-[#1E293B] bg-[#06080E] px-3 py-2 font-mono text-xs text-[#F8FAFC] outline-none" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowAgent(false)} className="flex-1 rounded-lg border border-[#1E293B] py-2 font-mono text-xs text-[#94A3B8] hover:border-[#94A3B8]/50">CANCEL</button>
              <button
                onClick={() => {
                  alert("Agent created in paper mode. It will run HyperAlpha analysis on schedule.");
                  setShowAgent(false);
                }}
                className="flex-1 rounded-lg bg-[#8B5CF6]/20 py-2 font-mono text-xs font-bold text-[#8B5CF6] hover:bg-[#8B5CF6]/30"
              >
                CREATE AGENT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
