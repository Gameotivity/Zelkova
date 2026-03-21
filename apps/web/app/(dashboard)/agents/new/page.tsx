"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const STEPS = ["Type", "Config", "Strategy", "Risk", "Review"];

const CRYPTO_STRATEGIES = [
  { id: "GRID_BOT", name: "Grid Bot", desc: "Place buy/sell orders across a price range" },
  { id: "DCA_BOT", name: "DCA Bot", desc: "Dollar-cost average on a schedule" },
  { id: "RSI_CROSSOVER", name: "RSI Crossover", desc: "Trade RSI oversold/overbought signals" },
  { id: "EMA_CROSSOVER", name: "EMA Crossover", desc: "Trade golden/death cross signals" },
  { id: "BREAKOUT", name: "Breakout", desc: "Trade price breakouts with volume confirmation" },
];

const POLY_STRATEGIES = [
  { id: "ODDS_DIVERGENCE", name: "Odds Divergence", desc: "When market odds deviate from AI fair value" },
  { id: "MOMENTUM", name: "Momentum", desc: "Trade odds momentum and trends" },
  { id: "MEAN_REVERSION", name: "Mean Reversion", desc: "Fade extreme odds movements" },
  { id: "SENTIMENT", name: "Sentiment", desc: "Trade based on news sentiment analysis" },
];

const PAIRS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT",
  "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "DOT/USDT", "MATIC/USDT",
  "LINK/USDT", "UNI/USDT", "ARB/USDT",
];

const DEFAULT_STRATEGY_CONFIGS: Record<string, Record<string, any>> = {
  GRID_BOT: { upperPrice: 70000, lowerPrice: 60000, gridCount: 10, investmentAmount: 1000 },
  DCA_BOT: { interval: "daily", amountPerBuy: 100, priceCondition: "any" },
  RSI_CROSSOVER: { rsiPeriod: 14, oversoldThreshold: 30, overboughtThreshold: 70, timeframe: "1h" },
  EMA_CROSSOVER: { fastEma: 9, slowEma: 21, timeframe: "1h", confirmationCandles: 1 },
  BREAKOUT: { lookbackPeriod: 20, volumeMultiplier: 2.0, breakoutThreshold: 1.5 },
  ODDS_DIVERGENCE: { targetDivergencePct: 10 },
  MOMENTUM: { oddsChangeThreshold: 5, lookbackHours: 24, confirmationTicks: 3 },
  MEAN_REVERSION: { historicalAvgOdds: 50, deviationThreshold: 15, positionSize: 50 },
  SENTIMENT: { newsSentimentThreshold: 0.7, socialVolumeSpike: 2.0, minConfidence: 60 },
};

function FieldInput({ label, value, onChange, type = "number", hint }: {
  label: string; value: any; onChange: (v: any) => void; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-body">{label}</label>
      {type === "select" ? null : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
          className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-body outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
        />
      )}
      {hint && <p className="mt-1 text-xs text-accent-primary">{hint}</p>}
    </div>
  );
}

export default function NewAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [agentType, setAgentType] = useState<"CRYPTO" | "POLYMARKET" | null>(null);
  const [agentName, setAgentName] = useState("");
  const [exchange, setExchange] = useState<"binance" | "bybit">("binance");
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["BTC/USDT"]);
  const [strategy, setStrategy] = useState("");
  const [strategyConfig, setStrategyConfig] = useState<Record<string, any>>({});
  const [riskConfig, setRiskConfig] = useState({
    stopLossPct: 5,
    takeProfitPct: 15,
    maxPositionSizePct: 10,
    maxDailyLossPct: 5,
    trailingStop: false,
    cooldownMinutes: 5,
  });
  const [mode, setMode] = useState<"PAPER" | "LIVE">("PAPER");

  function selectStrategy(id: string) {
    setStrategy(id);
    setStrategyConfig({ ...DEFAULT_STRATEGY_CONFIGS[id] });
  }

  function togglePair(pair: string) {
    setSelectedPairs((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair]
    );
  }

  async function handleDeploy() {
    try {
      const res = await fetch("/api/trpc/agents.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          type: agentType,
          exchange: agentType === "CRYPTO" ? exchange : undefined,
          pairs: selectedPairs,
          strategy,
          strategyConfig,
          riskConfig,
          mode,
        }),
      });
      router.push("/agents");
    } catch {
      // Handle error
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Create New Agent</h1>
        <p className="mt-1 text-sm text-text-muted">Step {step + 1} of {STEPS.length}</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
              i < step ? "bg-success text-white" : i === step ? "bg-accent-primary text-zelkora-base" : "bg-zelkora-elevated text-text-muted"
            )}>
              {i < step ? "\u2713" : i + 1}
            </div>
            <span className={cn("text-sm hidden sm:inline", i === step ? "font-medium text-text-body" : "text-text-muted")}>{s}</span>
            {i < STEPS.length - 1 && <div className="mx-2 h-px w-6 bg-zelkora-border" />}
          </div>
        ))}
      </div>

      {/* Step 0: Agent Type */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              { id: "CRYPTO" as const, title: "Crypto Trading Agent", desc: "Trade on Binance & Bybit with 5 strategies" },
              { id: "POLYMARKET" as const, title: "Prediction Market Agent", desc: "AI-powered Polymarket trading" },
            ].map((t) => (
              <button key={t.id} onClick={() => setAgentType(t.id)} className={cn(
                "rounded-xl border p-6 text-left transition-all",
                agentType === t.id ? "border-accent-primary bg-accent-primary/5" : "border-zelkora-border bg-zelkora-card hover:border-accent-primary/50"
              )}>
                <h3 className="text-lg font-semibold text-text-primary">{t.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Config */}
      {step === 1 && (
        <div className="space-y-6 rounded-xl border border-zelkora-border bg-zelkora-card p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-body">Agent Name</label>
            <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)}
              placeholder="My Trading Bot" className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-body outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20" />
          </div>

          {agentType === "CRYPTO" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-body">Exchange</label>
                <div className="flex gap-3">
                  {(["binance", "bybit"] as const).map((ex) => (
                    <button key={ex} onClick={() => setExchange(ex)} className={cn(
                      "rounded-lg border px-6 py-2.5 text-sm font-medium capitalize transition-all",
                      exchange === ex ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-zelkora-border text-text-muted hover:border-accent-primary/50"
                    )}>{ex}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-body">Trading Pairs</label>
                <div className="flex flex-wrap gap-2">
                  {PAIRS.map((pair) => (
                    <button key={pair} onClick={() => togglePair(pair)} className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      selectedPairs.includes(pair) ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-zelkora-border text-text-muted hover:border-accent-primary/50"
                    )}>{pair}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Strategy */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(agentType === "CRYPTO" ? CRYPTO_STRATEGIES : POLY_STRATEGIES).map((s) => (
              <button key={s.id} onClick={() => selectStrategy(s.id)} className={cn(
                "rounded-xl border p-4 text-left transition-all",
                strategy === s.id ? "border-accent-primary bg-accent-primary/5" : "border-zelkora-border bg-zelkora-card hover:border-accent-primary/50"
              )}>
                <h3 className="font-semibold text-text-primary">{s.name}</h3>
                <p className="mt-1 text-xs text-text-muted">{s.desc}</p>
              </button>
            ))}
          </div>

          {strategy && (
            <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
              <h3 className="mb-4 font-semibold text-text-primary">Strategy Parameters</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(strategyConfig).map(([key, val]) => (
                  <FieldInput
                    key={key}
                    label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                    value={val}
                    onChange={(v) => setStrategyConfig((prev) => ({ ...prev, [key]: v }))}
                    type={typeof val === "string" ? "text" : "number"}
                    hint={`AI Suggested: ${val}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Risk */}
      {step === 3 && (
        <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6 space-y-6">
          <h3 className="font-semibold text-text-primary">Risk Controls <span className="text-xs text-danger">(Required)</span></h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldInput label="Stop Loss (%)" value={riskConfig.stopLossPct} onChange={(v) => setRiskConfig((p) => ({ ...p, stopLossPct: v }))} hint="Mandatory. Closes position at this loss." />
            <FieldInput label="Take Profit (%)" value={riskConfig.takeProfitPct} onChange={(v) => setRiskConfig((p) => ({ ...p, takeProfitPct: v }))} hint="Auto-closes at target profit" />
            <FieldInput label="Max Position Size (%)" value={riskConfig.maxPositionSizePct} onChange={(v) => setRiskConfig((p) => ({ ...p, maxPositionSizePct: v }))} hint="Max % of capital per trade" />
            <FieldInput label="Max Daily Loss (%)" value={riskConfig.maxDailyLossPct} onChange={(v) => setRiskConfig((p) => ({ ...p, maxDailyLossPct: v }))} hint="Agent pauses if hit" />
            <FieldInput label="Cooldown (minutes)" value={riskConfig.cooldownMinutes} onChange={(v) => setRiskConfig((p) => ({ ...p, cooldownMinutes: v }))} hint="Wait time between trades" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={riskConfig.trailingStop} onChange={(e) => setRiskConfig((p) => ({ ...p, trailingStop: e.target.checked }))}
              className="h-4 w-4 rounded border-zelkora-border bg-zelkora-base accent-accent-primary" />
            <span className="text-sm text-text-body">Enable trailing stop-loss</span>
          </label>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6 space-y-4">
            <h3 className="font-semibold text-text-primary">Review Your Agent</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-text-muted">Name:</span> <span className="text-text-body">{agentName || "Unnamed"}</span></div>
              <div><span className="text-text-muted">Type:</span> <span className="text-text-body">{agentType}</span></div>
              {agentType === "CRYPTO" && <div><span className="text-text-muted">Exchange:</span> <span className="text-text-body capitalize">{exchange}</span></div>}
              <div><span className="text-text-muted">Strategy:</span> <span className="text-text-body">{strategy}</span></div>
              <div><span className="text-text-muted">Stop Loss:</span> <span className="text-text-body">{riskConfig.stopLossPct}%</span></div>
              <div><span className="text-text-muted">Take Profit:</span> <span className="text-text-body">{riskConfig.takeProfitPct}%</span></div>
            </div>
            {agentType === "CRYPTO" && (
              <div><span className="text-sm text-text-muted">Pairs:</span> <span className="text-sm text-text-body">{selectedPairs.join(", ")}</span></div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setMode("PAPER")} className={cn(
              "flex-1 rounded-lg border py-3 text-sm font-semibold transition-all",
              mode === "PAPER" ? "border-warning bg-warning/10 text-warning" : "border-zelkora-border text-text-muted"
            )}>Paper Trade</button>
            <button onClick={() => setMode("LIVE")} className={cn(
              "flex-1 rounded-lg border py-3 text-sm font-semibold transition-all",
              mode === "LIVE" ? "border-success bg-success/10 text-success" : "border-zelkora-border text-text-muted"
            )}>Live Trading</button>
          </div>

          {mode === "LIVE" && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
              Live trading requires 2FA verification and connected exchange API keys.
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={cn("rounded-lg border border-zelkora-border px-6 py-2.5 text-sm font-medium text-text-body transition-all hover:border-accent-primary/50", step === 0 && "invisible")}
        >Back</button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !agentType) || (step === 1 && !agentName) || (step === 2 && !strategy)}
            className="rounded-lg bg-accent-primary px-8 py-2.5 text-sm font-semibold text-zelkora-base transition-all hover:bg-accent-primary/90 disabled:opacity-30"
          >Continue</button>
        ) : (
          <button
            onClick={handleDeploy}
            className="rounded-lg bg-success px-8 py-2.5 text-sm font-semibold text-white transition-all hover:bg-success/90"
          >Deploy Agent</button>
        )}
      </div>
    </div>
  );
}
