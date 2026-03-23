"use client";

import { useState, useEffect, useCallback } from "react";

/* ─── Layer Definitions ─── */
const LAYERS = [
  {
    id: 1,
    name: "Data Ingestion",
    subtitle: "Hyperliquid Connector",
    color: "#00E5FF",
    icon: "database",
    duration: "~200ms",
    description: "Real-time market data collection from Hyperliquid DEX",
    inputs: ["Order Book (L2 depth)", "Recent Trades", "Funding Rates", "Open Interest", "OHLCV Candles"],
    outputs: ["Normalized MarketData object", "Bid/Ask spread", "Volume profile", "Funding snapshots"],
    details: [
      "Fetches 200 levels of order book depth",
      "Calculates bid-ask imbalance ratio",
      "Caches responses for 5s to reduce API load",
      "Validates data completeness before passing downstream",
      "Retry logic with exponential backoff (3 attempts)",
    ],
    techStack: ["Hyperliquid SDK", "asyncio", "LRU Cache"],
  },
  {
    id: 2,
    name: "AI Analysts",
    subtitle: "4 Parallel Claude Agents",
    color: "#8B5CF6",
    icon: "brain",
    duration: "~3s (parallel)",
    description: "Four specialized AI analysts run simultaneously, each examining different market dimensions",
    inputs: ["MarketData from Layer 1"],
    outputs: ["4 AnalystReport objects", "Signal direction per analyst", "Confidence scores", "Data quality ratings"],
    subAgents: [
      {
        name: "Fundamentals",
        color: "#10B981",
        focus: "Funding rates, OI matrix, volume, spreads",
        temp: 0.2,
        details: "Evaluates funding rate extremes (>0.05% = contrarian signal), OI+price divergence matrix, volume anomalies, and bid-ask spread health",
      },
      {
        name: "Sentiment",
        color: "#F59E0B",
        focus: "Volume profiles, liquidations, market regime",
        temp: 0.3,
        details: "Classifies regime as TRENDING_UP/DOWN, RANGING, VOLATILE_BREAKOUT, or CAPITULATION using buy/sell volume ratios and liquidation cascades",
      },
      {
        name: "Technicals",
        color: "#00E5FF",
        focus: "RSI, MACD, Bollinger, ATR, VWAP, Z-score",
        temp: 0.1,
        details: "Computes 8+ indicators with candle validation (15 for RSI, 35 for MACD), then interprets via Claude with explicit ENTRY/STOP/TP format",
      },
      {
        name: "Macro",
        color: "#F43F5E",
        focus: "BTC dominance, DXY proxy, cycle position",
        temp: 0.3,
        details: "Analyzes BTC dominance shifts, stablecoin supply changes, ETF flow signals, halving cycle positioning. Classifies RISK_ON/OFF/TRANSITIONAL/CRISIS",
      },
    ],
    details: [
      "All 4 analysts run in parallel via asyncio.gather()",
      "Each analyst uses Claude with calibrated temperature",
      "Strict output format: SIGNAL, CONFIDENCE, KEY_FACTORS",
      "Data quality score = available_sections / total_sections",
      "Fallback to neutral signal (confidence=0) on any failure",
    ],
    techStack: ["Claude 3.5 Sonnet", "asyncio.gather", "Prompt Engineering"],
  },
  {
    id: 3,
    name: "Research Debate",
    subtitle: "Bull vs Bear Adversarial",
    color: "#F59E0B",
    icon: "debate",
    duration: "~5s (multi-round)",
    description: "Adversarial debate between Bull and Bear agents to stress-test the thesis before any trade",
    inputs: ["4 Analyst Reports from Layer 2", "Current market data"],
    outputs: ["DebateConsensus", "Final signal direction", "Consensus confidence", "Key thesis", "Debate quality score"],
    details: [
      "Multi-round debate (configurable, default 2 rounds)",
      "Bull agent argues for LONG, Bear argues for SHORT",
      "Each round: argument + conviction score (0-1) + concessions",
      "Convergence detection: early stop if |bull - bear| < 0.15 for 2 rounds",
      "Consensus prompt synthesizes the strongest arguments",
      "Debate quality = conviction_spread(40%) + decisiveness(35%) + consistency(25%)",
      "Tie-breaking guidance prevents 50/50 deadlocks",
    ],
    techStack: ["Claude 3.5 Sonnet", "Multi-agent debate", "Convergence algorithm"],
  },
  {
    id: 4,
    name: "Stat Arb Engine",
    subtitle: "Pure Math Strategies",
    color: "#10B981",
    icon: "calculator",
    duration: "~50ms",
    description: "Three quantitative strategies running pure mathematical analysis with no AI involved",
    inputs: ["Raw market data", "Funding rates", "Order book depth"],
    outputs: ["3 StatArbSignal objects", "Expected return per strategy", "Mathematical confidence"],
    subStrategies: [
      {
        name: "Funding Rate Arb",
        formula: "annualized = rate * 3 * 365",
        logic: "Contrarian: extreme funding (>0.03%) suggests crowded trade. Go opposite direction. Expected return capped at 15%.",
      },
      {
        name: "Mean Reversion",
        formula: "z_score > 2.0 AND hurst < 0.5",
        logic: "Statistical mean reversion gated by Hurst exponent. Only triggers in mean-reverting regimes (H < 0.5). Uses half-life for exit timing.",
      },
      {
        name: "Order Book Imbalance",
        formula: "imbalance = (bids - asks) / total",
        logic: "Large imbalances (>20%) predict short-term price movement. Confidence scales with imbalance magnitude. Fastest signal of the three.",
      },
    ],
    details: [
      "Zero AI dependency — pure mathematical calculations",
      "All expected returns capped at 15% (safety limit)",
      "Runs in <50ms (no LLM calls needed)",
      "Provides independent validation of AI signals",
      "Each strategy returns confidence + expected_return_pct",
    ],
    techStack: ["NumPy", "Statistics", "Z-score", "Hurst exponent"],
  },
  {
    id: 5,
    name: "Trader Agent",
    subtitle: "Signal Synthesis",
    color: "#00E5FF",
    icon: "trade",
    duration: "~2s",
    description: "Master trader synthesizes all upstream signals into a single actionable trade recommendation",
    inputs: ["4 Analyst Reports", "Debate Consensus", "3 Stat Arb Signals", "Current market state"],
    outputs: ["TradeRecommendation", "Entry/Stop/Take-profit levels", "Position size", "Leverage"],
    details: [
      "Weighs analyst confidence scores against debate outcome",
      "Leverage formula: 1.0 + (confidence - 0.5) * 2.5, capped at max_leverage",
      "ATR-based stop loss: entry +/- (ATR * multiplier)",
      "Signal alignment scoring across all input sources",
      "None-guards on all optional upstream fields",
      "Outputs structured: action, entry, stop_loss, take_profit, size, leverage",
    ],
    techStack: ["Claude 3.5 Sonnet", "ATR calculations", "Position sizing"],
  },
  {
    id: 6,
    name: "Risk Manager",
    subtitle: "VETO Authority",
    color: "#F43F5E",
    icon: "shield",
    duration: "~1.5s",
    description: "Independent risk manager with absolute VETO power. Can reject any trade regardless of upstream consensus.",
    inputs: ["TradeRecommendation", "PortfolioState (equity, margin, positions, PnL)"],
    outputs: ["RiskAssessment", "APPROVE or VETO", "Adjusted parameters", "Risk warnings"],
    details: [
      "Full portfolio context: equity, used margin, open positions, daily PnL",
      "Kelly criterion reference for position size validation",
      "Hard-coded safety overrides that cannot be bypassed:",
      "  - Missing stop_loss → auto VETO",
      "  - Leverage > max_leverage → force reduce",
      "  - Position size > 25% of equity → force reduce",
      "  - Daily loss > 5% → VETO (circuit breaker)",
      "Portfolio-level risk: total exposure, correlation risk",
      "Can modify leverage, size, and stops even if approving",
    ],
    techStack: ["Claude 3.5 Sonnet", "Kelly criterion", "Circuit breakers"],
  },
  {
    id: 7,
    name: "Fund Manager",
    subtitle: "Final Decision Gate",
    color: "#8B5CF6",
    icon: "gavel",
    duration: "~1.5s",
    description: "Final authority that makes the APPROVE/REJECT decision with weighted signal aggregation",
    inputs: ["TradeRecommendation", "RiskAssessment", "DebateConsensus", "All upstream signals"],
    outputs: ["FinalDecision", "APPROVE or REJECT", "Final trade parameters", "Execution instructions"],
    details: [
      "Weighted signal aggregation: Trader 40% + Debate 30% + Inverse Risk 30%",
      "Explicit DECISION: APPROVE/REJECT parsing via regex",
      "Debate quality consideration with thresholds",
      "If risk manager VETOED → starts with strong REJECT bias",
      "Risk adjustments applied to final recommendation",
      "On APPROVE: outputs exact execution parameters",
      "On REJECT: outputs detailed reasoning for logging",
    ],
    techStack: ["Claude 3.5 Sonnet", "Weighted aggregation", "Decision parsing"],
  },
];

/* ─── SVG Icons ─── */
function LayerIcon({ type, className }: { type: string; className?: string }) {
  const cn = className || "w-6 h-6";
  switch (type) {
    case "database":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      );
    case "brain":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      );
    case "debate":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      );
    case "calculator":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
        </svg>
      );
    case "trade":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
        </svg>
      );
    case "shield":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      );
    case "gavel":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ─── Simulation State ─── */
interface SimState {
  activeLayer: number;
  signals: { layer: number; signal: string; confidence: number; color: string }[];
  finalDecision: string | null;
  isRunning: boolean;
}

const SIMULATION_STEPS: { layer: number; signal: string; confidence: number; color: string }[] = [
  { layer: 1, signal: "Data collected: BTC-PERP", confidence: 1.0, color: "#00E5FF" },
  { layer: 2, signal: "Fundamentals: LONG (0.72)", confidence: 0.72, color: "#10B981" },
  { layer: 2, signal: "Sentiment: LONG (0.65)", confidence: 0.65, color: "#F59E0B" },
  { layer: 2, signal: "Technicals: LONG (0.81)", confidence: 0.81, color: "#00E5FF" },
  { layer: 2, signal: "Macro: NEUTRAL (0.48)", confidence: 0.48, color: "#F43F5E" },
  { layer: 3, signal: "Bull wins debate (0.74 vs 0.41)", confidence: 0.74, color: "#F59E0B" },
  { layer: 4, signal: "Funding arb: SHORT (contrarian)", confidence: 0.55, color: "#10B981" },
  { layer: 4, signal: "Mean reversion: NO SIGNAL", confidence: 0.0, color: "#94A3B8" },
  { layer: 4, signal: "OB imbalance: LONG (0.68)", confidence: 0.68, color: "#10B981" },
  { layer: 5, signal: "LONG BTC @ $67,420 | SL: $66,180 | TP: $69,500", confidence: 0.76, color: "#00E5FF" },
  { layer: 6, signal: "Risk check: APPROVED (leverage 1.9x ok)", confidence: 0.76, color: "#F43F5E" },
  { layer: 7, signal: "APPROVED - Execute LONG BTC-PERP", confidence: 0.76, color: "#8B5CF6" },
];

/* ─── Main Component ─── */
export function StrategyPipeline() {
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);
  const [sim, setSim] = useState<SimState>({
    activeLayer: 0,
    signals: [],
    finalDecision: null,
    isRunning: false,
  });

  const runSimulation = useCallback(() => {
    setSim({ activeLayer: 1, signals: [], finalDecision: null, isRunning: true });

    SIMULATION_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setSim((prev) => ({
          ...prev,
          activeLayer: step.layer,
          signals: [...prev.signals, step],
          finalDecision: i === SIMULATION_STEPS.length - 1 ? "APPROVED" : null,
          isRunning: i < SIMULATION_STEPS.length - 1,
        }));
      }, (i + 1) * 800);
    });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">HyperAlpha 7-Layer AI Pipeline</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Every trade passes through 7 independent validation layers before execution
          </p>
        </div>
        <button
          onClick={runSimulation}
          disabled={sim.isRunning}
          className="flex items-center gap-2 rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-5 py-2.5 text-sm font-semibold text-[#00E5FF] transition-all duration-200 hover:bg-[#00E5FF]/20 disabled:opacity-50"
        >
          {sim.isRunning ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run Live Simulation
            </>
          )}
        </button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "AI Agents", value: "6", sub: "Claude-powered" },
          { label: "Math Engines", value: "3", sub: "Zero AI dependency" },
          { label: "Safety Checks", value: "12+", sub: "Hard-coded limits" },
          { label: "Avg Latency", value: "~14s", sub: "End to end" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-4 text-center">
            <div className="text-2xl font-bold text-[#F8FAFC]">{s.value}</div>
            <div className="text-xs font-medium text-[#00E5FF]">{s.label}</div>
            <div className="text-xs text-[#94A3B8]">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Visualization */}
      <div className="relative space-y-0">
        {LAYERS.map((layer, idx) => {
          const isActive = sim.activeLayer === layer.id;
          const isCompleted = sim.signals.some((s) => s.layer === layer.id);
          const isExpanded = expandedLayer === layer.id;
          const layerSignals = sim.signals.filter((s) => s.layer === layer.id);

          return (
            <div key={layer.id}>
              {/* Connector Line */}
              {idx > 0 && (
                <div className="relative flex justify-center py-1">
                  <div className="flex flex-col items-center">
                    <div
                      className="h-8 w-0.5 transition-all duration-500"
                      style={{
                        background: isCompleted
                          ? `linear-gradient(to bottom, ${LAYERS[idx - 1].color}, ${layer.color})`
                          : "#1E293B",
                      }}
                    />
                    <svg
                      className="h-3 w-3 transition-colors duration-500"
                      style={{ color: isCompleted ? layer.color : "#1E293B" }}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 16l-6-6h12l-6 6z" />
                    </svg>
                  </div>
                  {/* Flow particles when active */}
                  {isActive && (
                    <div className="absolute inset-0 flex justify-center overflow-hidden">
                      {[0, 0.3, 0.6].map((d, i) => (
                        <div
                          key={i}
                          className="absolute h-1.5 w-1.5 rounded-full"
                          style={{
                            background: layer.color,
                            boxShadow: `0 0 6px ${layer.color}`,
                            animation: `pulse 1s ${d}s infinite`,
                            top: "30%",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Layer Card */}
              <div
                className="group relative cursor-pointer rounded-xl border transition-all duration-300"
                style={{
                  borderColor: isActive
                    ? layer.color
                    : isCompleted
                    ? `${layer.color}40`
                    : "#1E293B",
                  background: isActive
                    ? `linear-gradient(135deg, ${layer.color}08, ${layer.color}03)`
                    : "#0F1629",
                  boxShadow: isActive ? `0 0 30px ${layer.color}15` : "none",
                }}
                onClick={() => setExpandedLayer(isExpanded ? null : layer.id)}
              >
                {/* Active glow */}
                {isActive && (
                  <div
                    className="absolute -inset-px rounded-xl opacity-20"
                    style={{
                      background: `linear-gradient(135deg, ${layer.color}, transparent)`,
                      animation: "pulse 2s infinite",
                    }}
                  />
                )}

                <div className="relative p-4 sm:p-5">
                  {/* Header Row */}
                  <div className="flex items-start gap-4">
                    {/* Layer Number + Icon */}
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300"
                        style={{
                          background: `${layer.color}15`,
                          border: `1px solid ${layer.color}30`,
                          boxShadow: isActive ? `0 0 20px ${layer.color}30` : "none",
                        }}
                      >
                        <div style={{ color: layer.color }}>
                          <LayerIcon type={layer.icon} className="h-6 w-6" />
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: layer.color }}
                      >
                        L{layer.id}
                      </span>
                    </div>

                    {/* Title + Description */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-[#F8FAFC]">{layer.name}</h3>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: `${layer.color}15`,
                            color: layer.color,
                          }}
                        >
                          {layer.duration}
                        </span>
                        {isCompleted && (
                          <svg className="h-4 w-4 text-[#10B981]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8]">{layer.subtitle}</p>
                      <p className="mt-1 text-sm text-[#E2E8F0]/70">{layer.description}</p>
                    </div>

                    {/* Expand Arrow */}
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-[#94A3B8] transition-transform duration-200"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>

                  {/* Live Simulation Signals */}
                  {layerSignals.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#1E293B] pt-3">
                      {layerSignals.map((sig, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono"
                          style={{
                            background: `${sig.color}10`,
                            border: `1px solid ${sig.color}30`,
                            color: sig.color,
                            animation: "fadeInUp 0.3s ease-out forwards",
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: sig.color }}
                          />
                          {sig.signal}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[#1E293B] px-4 pb-5 pt-4 sm:px-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      {/* Inputs */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#00E5FF]">Inputs</h4>
                        <div className="space-y-1">
                          {layer.inputs.map((inp) => (
                            <div key={inp} className="flex items-center gap-2 text-xs text-[#E2E8F0]">
                              <svg className="h-3 w-3 text-[#00E5FF]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                              </svg>
                              {inp}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Outputs */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">Outputs</h4>
                        <div className="space-y-1">
                          {layer.outputs.map((out) => (
                            <div key={out} className="flex items-center gap-2 text-xs text-[#E2E8F0]">
                              <svg className="h-3 w-3 text-[#8B5CF6]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                              </svg>
                              {out}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sub-agents (Layer 2) */}
                      {layer.subAgents && (
                        <div className="md:col-span-2">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                            Parallel Agents
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {layer.subAgents.map((agent) => (
                              <div
                                key={agent.name}
                                className="rounded-lg border border-[#1E293B] bg-[#06080E] p-3"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ background: agent.color }}
                                  />
                                  <span className="text-sm font-semibold text-[#F8FAFC]">{agent.name}</span>
                                  <span className="ml-auto font-mono text-[10px] text-[#94A3B8]">
                                    temp={agent.temp}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-[#94A3B8]">{agent.focus}</p>
                                <p className="mt-2 text-xs text-[#E2E8F0]/60">{agent.details}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-strategies (Layer 4) */}
                      {layer.subStrategies && (
                        <div className="md:col-span-2">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#10B981]">
                            Mathematical Strategies
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {layer.subStrategies.map((strat) => (
                              <div
                                key={strat.name}
                                className="rounded-lg border border-[#1E293B] bg-[#06080E] p-3"
                              >
                                <span className="text-sm font-semibold text-[#F8FAFC]">{strat.name}</span>
                                <div className="mt-2 rounded bg-[#10B981]/10 px-2 py-1 font-mono text-[10px] text-[#10B981]">
                                  {strat.formula}
                                </div>
                                <p className="mt-2 text-xs text-[#E2E8F0]/60">{strat.logic}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Technical Details */}
                      <div className="md:col-span-2">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                          How It Works
                        </h4>
                        <div className="space-y-1.5">
                          {layer.details.map((d, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-[#E2E8F0]/70">
                              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#94A3B8]" />
                              <span className={d.startsWith("  ") ? "pl-3 text-[#F59E0B]/80" : ""}>{d}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tech Stack */}
                      <div className="md:col-span-2">
                        <div className="flex flex-wrap gap-2">
                          {layer.techStack.map((tech) => (
                            <span
                              key={tech}
                              className="rounded-md border border-[#1E293B] bg-[#06080E] px-2 py-0.5 text-[10px] font-medium text-[#94A3B8]"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Decision Card */}
      {sim.finalDecision && (
        <div
          className="rounded-xl border border-[#10B981] bg-[#10B981]/5 p-6 text-center"
          style={{ animation: "fadeInUp 0.5s ease-out forwards" }}
        >
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/20">
            <svg className="h-8 w-8 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[#10B981]">Trade Approved</h3>
          <p className="mt-1 font-mono text-sm text-[#E2E8F0]">
            LONG BTC-PERP @ $67,420 | Stop: $66,180 | Target: $69,500 | 1.9x Leverage
          </p>
          <p className="mt-2 text-xs text-[#94A3B8]">
            Passed through all 7 layers in ~14 seconds with 76% composite confidence
          </p>
        </div>
      )}

      {/* Global Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
