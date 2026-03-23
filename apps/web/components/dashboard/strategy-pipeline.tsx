"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAnalysis } from "@/lib/ai/use-analysis";
import { parseReport } from "@/lib/ai/parse-report";
import type { HyperAlphaResult, ParsedReport } from "@/lib/ai/types";

/* ─── Layer Config ─── */
const LAYERS = [
  { id: 1, name: "DATA FEED", sub: "Hyperliquid L2", color: "#00E5FF", dur: 2 },
  { id: 2, name: "AI ANALYSTS", sub: "4x Claude Agents", color: "#8B5CF6", dur: 4 },
  { id: 3, name: "BULL vs BEAR", sub: "Adversarial Debate", color: "#F59E0B", dur: 3 },
  { id: 4, name: "STAT ARB", sub: "3 Math Engines", color: "#10B981", dur: 1 },
  { id: 5, name: "TRADER", sub: "Signal Synthesis", color: "#00E5FF", dur: 2 },
  { id: 6, name: "RISK GATE", sub: "VETO Authority", color: "#F43F5E", dur: 2 },
  { id: 7, name: "FUND MGR", sub: "Final Decision", color: "#8B5CF6", dur: 2 },
];

const ICONS: Record<number, string> = {
  1: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375",
  2: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09Z",
  3: "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155",
  4: "M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25Z",
  5: "M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5",
  6: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  7: "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352",
};

/* ─── Confidence Bar ─── */
function ConfBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value * 100}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <span className="min-w-[36px] text-right font-mono text-[10px]" style={{ color }}>{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

/* ─── Props ─── */
interface StrategyPipelineProps {
  ticker: string;
  onResult?: (result: HyperAlphaResult) => void;
}

/* ─── Main Component ─── */
export function StrategyPipeline({ ticker, onResult }: StrategyPipelineProps) {
  const { analyze, result, loading, error, isOnline } = useAnalysis();
  const [animLayer, setAnimLayer] = useState(0);
  const [parsed, setParsed] = useState<ParsedReport | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse report when result arrives
  useEffect(() => {
    if (result) {
      setParsed(parseReport(result.report));
      setAnimLayer(8); // all done
      onResult?.(result);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [result, onResult]);

  // Animated layer progression while loading
  useEffect(() => {
    if (!loading) return;
    setAnimLayer(1);
    setElapsed(0);
    setParsed(null);

    // Elapsed timer
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    // Step through layers on estimated timing
    let cumulativeMs = 0;
    LAYERS.forEach((layer) => {
      cumulativeMs += layer.dur * 1000;
      const timeout = setTimeout(() => setAnimLayer(layer.id), cumulativeMs);
      // Store last timeout for cleanup
      animRef.current = timeout;
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const runAnalysis = useCallback(() => {
    if (loading || !ticker) return;
    analyze(ticker);
  }, [analyze, loading, ticker]);

  // Save to history when result arrives
  useEffect(() => {
    if (!result) return;
    fetch("/api/ai/analyze/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    }).catch(() => { /* best effort */ });
  }, [result]);

  const getLayerData = (layerId: number): string[] => {
    if (!parsed) return [];
    switch (layerId) {
      case 1: return [`${ticker}-PERP live market data`];
      case 2: return parsed.analysts.map((a) => `${a.icon === "+" ? "+" : a.icon === "-" ? "-" : "~"} ${a.name}: ${a.signal} (${a.confidence})`);
      case 3: return parsed.debate ? [`${parsed.debate.signal} (${parsed.debate.confidence})`, parsed.debate.thesis.slice(0, 100)] : [];
      case 4: return parsed.statArb.map((s) => `${s.strategy}: ${s.signal} (z=${s.zScore})`);
      case 5: return parsed.recommendation ? [`${parsed.recommendation.action} @ $${parsed.recommendation.entry || "market"}`, `Leverage: ${parsed.recommendation.leverage || "1.0"}x | Conf: ${parsed.recommendation.confidence}`] : [];
      case 6: return parsed.risk ? [`${parsed.risk.approved ? "APPROVED" : "VETOED"} | Risk: ${parsed.risk.riskScore}`, ...parsed.risk.warnings.map((w) => `! ${w}`)] : [];
      case 7: return parsed.finalDecision ? [`${parsed.finalDecision.approved ? "EXECUTE" : "REJECTED"}`, parsed.finalDecision.notes.slice(0, 120)] : [];
      default: return [];
    }
  };

  return (
    <div className="relative space-y-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -inset-20 opacity-30">
        <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-[#00E5FF]/10 blur-[100px]" />
        <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-[100px]" />
      </div>

      {/* Status Bar */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/5 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            {isOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${isOnline ? "bg-[#10B981]" : isOnline === false ? "bg-[#F43F5E]" : "bg-[#94A3B8]"}`} />
          </div>
          <span className={`text-sm font-bold ${isOnline ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
            {isOnline ? "AI ENGINE ONLINE" : isOnline === false ? "AI ENGINE OFFLINE" : "CHECKING..."}
          </span>
          {loading && (
            <span className="rounded bg-[#F59E0B]/10 px-2 py-0.5 font-mono text-[10px] text-[#F59E0B]">
              PROCESSING {elapsed}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[#F8FAFC]">{ticker}-PERP</span>
          <button
            onClick={runAnalysis}
            disabled={loading || !isOnline || !ticker}
            className="rounded-lg border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-5 py-2 font-mono text-xs font-bold text-[#00E5FF] transition-all hover:bg-[#00E5FF]/20 hover:shadow-[0_0_20px_rgba(0,229,255,0.2)] disabled:opacity-40"
          >
            {loading ? "ANALYZING..." : "RUN ANALYSIS"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/5 p-4 font-mono text-xs text-[#F43F5E]">
          {error}
        </div>
      )}

      {/* Pipeline */}
      <div className="grid gap-2">
        {LAYERS.map((layer, idx) => {
          const isActive = loading && animLayer === layer.id;
          const isDone = animLayer > layer.id;
          const data = isDone ? getLayerData(layer.id) : [];

          return (
            <div key={layer.id}>
              {idx > 0 && (
                <div className="flex justify-center py-0.5">
                  <div className="h-4 w-px transition-all duration-300" style={{ background: isDone ? layer.color : "#1E293B" }} />
                </div>
              )}
              <div
                className="group relative overflow-hidden rounded-xl border transition-all duration-500"
                style={{
                  borderColor: isActive ? layer.color : isDone ? `${layer.color}30` : "#1E293B",
                  background: isActive ? `linear-gradient(135deg, ${layer.color}08, transparent)` : "#0A0F1A",
                  boxShadow: isActive ? `0 0 40px ${layer.color}15` : "none",
                }}
              >
                {isActive && (
                  <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, ${layer.color}08 50%, transparent 100%)`, animation: "scanDown 1.5s ease-in-out infinite" }} />
                )}
                <div className="absolute left-0 right-0 top-0 h-px transition-all duration-500" style={{ background: isActive ? `linear-gradient(90deg, transparent, ${layer.color}, transparent)` : isDone ? `linear-gradient(90deg, transparent, ${layer.color}40, transparent)` : "transparent" }} />

                <div className="relative flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-500" style={{ background: `${layer.color}${isActive ? "20" : "08"}`, border: `1px solid ${isActive ? layer.color : `${layer.color}20`}`, boxShadow: isActive ? `0 0 25px ${layer.color}30` : "none" }}>
                      <svg className="h-5 w-5" style={{ color: isActive ? layer.color : `${layer.color}80` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[layer.id]} />
                      </svg>
                    </div>
                    <span className="font-mono text-[10px] font-bold" style={{ color: isActive ? layer.color : "#475569" }}>L{layer.id}</span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-sm font-bold tracking-wider" style={{ color: isActive ? layer.color : isDone ? "#F8FAFC" : "#94A3B8" }}>{layer.name}</h3>
                      <span className="font-mono text-[10px] text-[#475569]">{layer.sub}</span>
                      {isDone && !isActive && (
                        <svg className="h-4 w-4" style={{ color: "#10B981" }} fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                      )}
                      {isActive && (
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: layer.color, animation: "pulse 1s infinite", boxShadow: `0 0 6px ${layer.color}` }} />
                          <span className="font-mono text-[10px] font-bold" style={{ color: layer.color }}>ACTIVE</span>
                        </span>
                      )}
                    </div>

                    {/* Real data from parsed report */}
                    {data.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {data.map((d, i) => (
                          <div key={i} className="rounded-lg border border-white/5 bg-black/30 px-3 py-1.5 font-mono text-xs text-[#E2E8F0]" style={{ animation: "slideIn 0.3s ease-out forwards" }}>
                            {d}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Layer number */}
                  <div className="absolute right-4 top-4 font-mono text-4xl font-black" style={{ color: isActive ? `${layer.color}15` : "#0A0F1A" }}>0{layer.id}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Result Summary */}
      {result && (
        <div
          className="relative overflow-hidden rounded-xl border p-5"
          style={{
            borderColor: result.approved ? "#10B981" : "#F43F5E",
            background: result.approved ? "linear-gradient(135deg, #10B98108, transparent)" : "linear-gradient(135deg, #F43F5E08, transparent)",
            boxShadow: `0 0 40px ${result.approved ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)"}`,
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: result.approved ? "#10B981/20" : "#F43F5E/20", border: `1px solid ${result.approved ? "#10B981" : "#F43F5E"}30` }}>
              {result.approved ? (
                <svg className="h-7 w-7 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              ) : (
                <svg className="h-7 w-7 text-[#F43F5E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${result.action === "long" ? "bg-[#10B981]/10 text-[#10B981]" : result.action === "short" ? "bg-[#F43F5E]/10 text-[#F43F5E]" : "bg-[#94A3B8]/10 text-[#94A3B8]"}`}>
                  {result.action.toUpperCase()}
                </span>
                <span className="font-mono text-sm font-bold text-[#F8FAFC]">{result.ticker}-PERP</span>
                <span className="font-mono text-[10px] text-[#94A3B8]">{(result.confidence * 100).toFixed(0)}% confidence</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 font-mono text-xs text-[#94A3B8]">
                {result.entry_price && <span>Entry: <span className="text-[#F8FAFC]">${result.entry_price.toLocaleString()}</span></span>}
                {result.stop_loss && <span>SL: <span className="text-[#F43F5E]">${result.stop_loss.toLocaleString()}</span></span>}
                {result.take_profit && <span>TP: <span className="text-[#10B981]">${result.take_profit.toLocaleString()}</span></span>}
                {result.leverage && <span>Lev: <span className="text-[#00E5FF]">{result.leverage}x</span></span>}
                <span>Alignment: <span className="text-[#F59E0B]">{result.signal_alignment}/4</span></span>
              </div>
              {result.confidence > 0 && <div className="mt-2 max-w-xs"><ConfBar value={result.confidence} color={result.approved ? "#10B981" : "#F43F5E"} /></div>}
            </div>
            <div className="text-right font-mono text-xs">
              <div className="text-[#94A3B8]">Completed in</div>
              <div className="text-lg font-bold text-[#F8FAFC]">{elapsed}s</div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Strip */}
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-[#F43F5E]/10 bg-[#F43F5E]/5 px-4 py-3">
        {["No trade without stop-loss", "Max 25% equity/position", "5% daily circuit breaker", "Risk manager VETO power", "Non-custodial always"].map((rule) => (
          <span key={rule} className="flex items-center gap-1.5 font-mono text-[10px] text-[#F43F5E]/80">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>
            {rule}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes scanDown { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
