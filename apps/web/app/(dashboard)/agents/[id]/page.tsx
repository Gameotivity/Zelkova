"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { AgentMetricsCard } from "@/components/agents/agent-metrics-card";
import { TradeHistoryTable } from "@/components/agents/trade-history-table";
import { SignalFeed } from "@/components/agents/signal-feed";
import { PositionList } from "@/components/agents/position-card";
import { PriceChart } from "@/components/dashboard/price-chart";
import {
  generateDemoAgent,
  generateDemoTrades,
  generateDemoSignals,
  generateDemoPositions,
} from "./demo-data";

type AgentStatus = "DRAFT" | "PAPER" | "LIVE" | "PAUSED" | "STOPPED";

const STATUS_CONFIG: Record<AgentStatus, { dot: string; bg: string; label: string }> = {
  DRAFT: { dot: "bg-text-muted", bg: "bg-zelkora-elevated text-text-muted", label: "Draft" },
  PAPER: { dot: "bg-warning", bg: "bg-warning/10 text-warning", label: "Paper" },
  LIVE: { dot: "bg-success animate-pulse-dot", bg: "bg-success/10 text-success", label: "Live" },
  PAUSED: { dot: "bg-text-muted", bg: "bg-zelkora-elevated text-text-muted", label: "Paused" },
  STOPPED: { dot: "bg-danger", bg: "bg-danger/10 text-danger", label: "Stopped" },
};

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-zelkora-border bg-zelkora-card p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-zelkora-border px-4 py-2 text-sm font-medium text-text-body transition-all hover:bg-zelkora-elevated"
          >
            Cancel
          </button>
          <button onClick={onConfirm} className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition-all", confirmClass)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-zelkora-elevated" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-zelkora-elevated" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-20 animate-pulse rounded-lg bg-zelkora-elevated" />
          <div className="h-9 w-16 animate-pulse rounded-lg bg-zelkora-elevated" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zelkora-border bg-zelkora-card p-4">
            <div className="h-3 w-16 animate-pulse rounded bg-zelkora-elevated" />
            <div className="mt-3 h-6 w-24 animate-pulse rounded bg-zelkora-elevated" />
          </div>
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-xl border border-zelkora-border bg-zelkora-card" />
    </div>
  );
}

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"pause" | "stop" | null>(null);

  const [agent, setAgent] = useState(generateDemoAgent(params.id));
  const [trades] = useState(generateDemoTrades());
  const [agentSignals] = useState(generateDemoSignals());
  const [positions] = useState(generateDemoPositions());

  // Attempt to fetch real data from REST API, fall back to demo
  useEffect(() => {
    fetch(`/api/agents/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.agent) {
          const a = data.agent;
          setAgent((prev) => ({
            ...prev,
            name: a.name ?? prev.name,
            status: a.status ?? prev.status,
            strategy: a.strategy ?? prev.strategy,
            pairs: (a.pairs as string[]) ?? prev.pairs,
            totalPnl: a.totalPnl ?? prev.totalPnl,
            totalPnlPercent: a.totalPnl ? (a.totalPnl / 10000) * 100 : prev.totalPnlPercent,
            winRate: a.winRate ?? prev.winRate,
            createdAt: a.createdAt ?? prev.createdAt,
          }));
        }
      })
      .catch(() => { /* use demo data */ })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleStatusChange = useCallback(
    (newStatus: AgentStatus) => {
      setAgent((prev) => ({ ...prev, status: newStatus }));
      setModal(null);
      // Fire and forget status update
      fetch("/api/trpc/agents.updateStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: params.id, status: newStatus }),
      }).catch(() => { /* silent */ });
    },
    [params.id]
  );

  if (loading) return <PageSkeleton />;

  const statusCfg = STATUS_CONFIG[agent.status as AgentStatus] ?? STATUS_CONFIG.DRAFT;
  const isActive = agent.status === "LIVE" || agent.status === "PAPER";
  const isPaused = agent.status === "PAUSED";
  const isUp = agent.totalPnl >= 0;

  return (
    <div className="space-y-6">
      {/* Modals */}
      {modal === "pause" && (
        <ConfirmModal
          title="Pause Agent"
          message="This will stop the agent from executing new trades. Open positions will remain."
          confirmLabel="Pause Agent"
          confirmClass="bg-warning text-zelkora-base hover:bg-warning/90"
          onConfirm={() => handleStatusChange("PAUSED")}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "stop" && (
        <ConfirmModal
          title="Stop Agent"
          message="This will permanently stop the agent and close all open positions. This action cannot be undone."
          confirmLabel="Stop Agent"
          confirmClass="bg-danger text-white hover:bg-danger/90"
          onConfirm={() => handleStatusChange("STOPPED")}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/agents" className="text-text-muted transition-colors hover:text-text-body">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">{agent.name}</h1>
            <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", statusCfg.bg)}>
              <span className={cn("h-2 w-2 rounded-full", statusCfg.dot)} />
              {statusCfg.label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-text-muted">
            <span>{agent.strategy.replace(/_/g, " ")}</span>
            <span className="text-text-disabled">|</span>
            <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
            <span className="text-text-disabled">|</span>
            <span className="flex gap-1">
              {agent.pairs.map((p) => (
                <span key={p} className="rounded bg-zelkora-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">{p}</span>
              ))}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {isActive && (
            <button
              onClick={() => setModal("pause")}
              className="rounded-lg border border-zelkora-border px-4 py-2 text-sm font-medium text-warning transition-all hover:border-warning hover:bg-warning/5"
            >
              Pause
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => handleStatusChange("PAPER")}
              className="rounded-lg border border-zelkora-border px-4 py-2 text-sm font-medium text-success transition-all hover:border-success hover:bg-success/5"
            >
              Resume
            </button>
          )}
          <button
            onClick={() => setModal("stop")}
            className="rounded-lg border border-danger/50 px-4 py-2 text-sm font-medium text-danger transition-all hover:bg-danger/10"
          >
            Stop
          </button>
          <Link
            href={`/agents/${params.id}/edit`}
            className="rounded-lg border border-zelkora-border px-4 py-2 text-sm font-medium text-text-body transition-all hover:border-accent-primary/50 hover:text-accent-primary"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <AgentMetricsCard
          icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
          label="Total P&L"
          value={`${isUp ? "+" : ""}$${agent.totalPnl.toFixed(2)}`}
          change={{ value: agent.totalPnlPercent, label: `${agent.totalPnlPercent.toFixed(2)}%` }}
          sparkline={{ values: agent.pnlHistory }}
        />
        <AgentMetricsCard
          icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.04 6.04 0 0 1-4.27 1.772 6.04 6.04 0 0 1-4.27-1.772" /></svg>}
          label="Win Rate"
          value={`${agent.winRate.toFixed(1)}%`}
          change={{ value: agent.winRate - 50, label: `${(agent.winRate - 50).toFixed(1)}% vs 50%` }}
        />
        <AgentMetricsCard
          icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>}
          label="Sharpe Ratio"
          value={agent.sharpeRatio.toFixed(2)}
          change={{ value: agent.sharpeRatio - 1, label: agent.sharpeRatio >= 1 ? "Good" : "Low" }}
        />
        <AgentMetricsCard
          icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" /></svg>}
          label="Max Drawdown"
          value={`${agent.maxDrawdown.toFixed(2)}%`}
          change={{ value: agent.maxDrawdown, label: `${Math.abs(agent.maxDrawdown).toFixed(2)}%` }}
        />
      </div>

      {/* Price Chart */}
      <PriceChart />

      {/* Positions + Signals row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PositionList positions={positions} loading={false} />
        <SignalFeed signals={agentSignals} loading={false} />
      </div>

      {/* Trade History */}
      <TradeHistoryTable trades={trades} loading={false} />
    </div>
  );
}
