"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const agentTypes = [
  {
    id: "CRYPTO",
    title: "Crypto Trading Agent",
    description:
      "Autonomous bot that monitors crypto markets 24/7, identifies entries using hybrid quant models, and executes trades with risk controls.",
    features: [
      "5 pre-built strategies (Grid, DCA, RSI, EMA, Breakout)",
      "Binance & Bybit support",
      "Automatic stop-loss & take-profit",
      "Real-time technical indicators",
    ],
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    id: "POLYMARKET",
    title: "Prediction Market Agent",
    description:
      "AI-powered bot that analyzes Polymarket events, identifies mispriced markets, and manages positions across multiple events.",
    features: [
      "AI fair value assessment",
      "Multi-event monitoring",
      "Odds divergence detection",
      "Auto-exit before resolution",
    ],
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
];

export default function NewAgentPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Create New Agent
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Choose your agent type to get started
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        {["Type", "Config", "Strategy", "Risk", "Review"].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                i === 0
                  ? "bg-accent-primary text-zelkora-base"
                  : "bg-zelkora-elevated text-text-muted"
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "text-sm",
                i === 0 ? "font-medium text-text-body" : "text-text-muted"
              )}
            >
              {step}
            </span>
            {i < 4 && (
              <div className="mx-2 h-px w-8 bg-zelkora-border" />
            )}
          </div>
        ))}
      </div>

      {/* Agent Type Selection */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {agentTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={cn(
              "group rounded-xl border p-6 text-left transition-all duration-200",
              selectedType === type.id
                ? "border-accent-primary bg-accent-primary/5 shadow-lg shadow-accent-primary/10"
                : "border-zelkora-border bg-zelkora-card hover:border-accent-primary/50"
            )}
          >
            <div
              className={cn(
                "mb-4 inline-flex rounded-lg p-3 transition-colors",
                selectedType === type.id
                  ? "bg-accent-primary/20 text-accent-primary"
                  : "bg-zelkora-elevated text-text-muted group-hover:text-accent-primary"
              )}
            >
              {type.icon}
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              {type.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {type.description}
            </p>
            <ul className="mt-4 space-y-2">
              {type.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-text-body">
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Continue Button */}
      {selectedType && (
        <div className="flex justify-end">
          <button className="rounded-lg bg-accent-primary px-8 py-2.5 text-sm font-semibold text-zelkora-base transition-all duration-200 hover:bg-accent-primary/90">
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
