"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface ExchangeConnection {
  id: string;
  exchange: "binance" | "bybit";
  label: string;
  maskedKey: string;
  isActive: boolean;
  connectedAt: string;
}

const demoConnections: ExchangeConnection[] = [
  {
    id: "1",
    exchange: "binance",
    label: "Binance Main",
    maskedKey: "bina****g7Kx",
    isActive: true,
    connectedAt: "Mar 15, 2026",
  },
];

function ConnectExchangeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [exchange, setExchange] = useState<"binance" | "bybit">("binance");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [connecting, setConnecting] = useState(false);

  if (!open) return null;

  async function handleConnect() {
    setConnecting(true);
    // In production: calls tRPC exchange.connect
    setTimeout(() => {
      setConnecting(false);
      onClose();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zelkora-border bg-zelkora-card p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Connect Exchange</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-body">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-body">Exchange</label>
            <div className="flex gap-3">
              {(["binance", "bybit"] as const).map((ex) => (
                <button key={ex} onClick={() => setExchange(ex)} className={cn(
                  "flex-1 rounded-lg border py-3 text-sm font-semibold capitalize transition-all",
                  exchange === ex ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-zelkora-border text-text-muted hover:border-accent-primary/50"
                )}>{ex}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-body">Label</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder={`${exchange} Main Account`}
              className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-body outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-body">API Key</label>
            <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key"
              className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 font-mono text-sm text-text-body outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-body">API Secret</label>
            <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Paste your API secret"
              className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 font-mono text-sm text-text-body outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20" />
          </div>

          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
            <p className="text-xs leading-relaxed text-warning">
              API keys are encrypted with AES-256-GCM before storage. We only need <strong>spot trading</strong> and <strong>read</strong> permissions. Never enable withdrawal permissions.
            </p>
          </div>

          <button onClick={handleConnect} disabled={!apiKey || !apiSecret || connecting}
            className="w-full rounded-lg bg-accent-primary py-3 text-sm font-semibold text-zelkora-base transition-all hover:bg-accent-primary/90 disabled:opacity-40">
            {connecting ? "Validating & Encrypting..." : "Connect Exchange"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [connections, setConnections] = useState<ExchangeConnection[]>(demoConnections);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [notifications, setNotifications] = useState({
    tradeAlerts: true,
    agentStatus: true,
    dailyReport: false,
    priceAlerts: false,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>

      {/* Profile */}
      <section className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-body">Name</label>
            <input type="text" className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-body outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20" placeholder="Your name" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-body">Email</label>
            <input type="email" className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-muted outline-none" placeholder="you@example.com" disabled />
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Security</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-zelkora-border bg-zelkora-base p-4">
            <div>
              <p className="font-medium text-text-body">Two-Factor Authentication</p>
              <p className="text-sm text-text-muted">Required for live trading</p>
            </div>
            <button className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-zelkora-base transition-all hover:bg-accent-primary/90">
              Enable 2FA
            </button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zelkora-border bg-zelkora-base p-4">
            <div>
              <p className="font-medium text-text-body">Change Password</p>
              <p className="text-sm text-text-muted">Last changed: Never</p>
            </div>
            <button className="rounded-lg border border-zelkora-border px-4 py-2 text-sm font-medium text-text-body transition-all hover:border-accent-primary hover:text-accent-primary">
              Update
            </button>
          </div>
        </div>
      </section>

      {/* Exchange Connections */}
      <section className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Exchange Connections</h2>
          <button onClick={() => setShowConnectModal(true)}
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-zelkora-base transition-all hover:bg-accent-primary/90">
            + Connect Exchange
          </button>
        </div>

        {connections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zelkora-border p-8 text-center">
            <p className="text-text-muted">No exchanges connected yet.</p>
            <p className="mt-1 text-sm text-text-muted">Connect your Binance or Bybit API keys to start trading.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between rounded-lg border border-zelkora-border bg-zelkora-base p-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold uppercase",
                    conn.exchange === "binance" ? "bg-warning/10 text-warning" : "bg-accent-primary/10 text-accent-primary"
                  )}>
                    {conn.exchange.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-text-body">{conn.label}</p>
                    <p className="text-xs text-text-muted">
                      Key: <span className="font-mono">{conn.maskedKey}</span> · Connected {conn.connectedAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    conn.isActive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}>
                    {conn.isActive ? "Active" : "Inactive"}
                  </span>
                  <button className="text-text-muted hover:text-danger transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notifications */}
      <section className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Notifications</h2>
        <div className="space-y-3">
          {[
            { key: "tradeAlerts" as const, label: "Trade Alerts", desc: "Get notified when agents execute trades" },
            { key: "agentStatus" as const, label: "Agent Status", desc: "Alerts when agents pause or encounter errors" },
            { key: "dailyReport" as const, label: "Daily Report", desc: "Daily P&L summary email" },
            { key: "priceAlerts" as const, label: "Price Alerts", desc: "Custom price level notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border border-zelkora-border bg-zelkora-base p-4">
              <div>
                <p className="font-medium text-text-body">{item.label}</p>
                <p className="text-sm text-text-muted">{item.desc}</p>
              </div>
              <button
                onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-all",
                  notifications[item.key] ? "bg-accent-primary" : "bg-zelkora-elevated"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                  notifications[item.key] ? "left-5.5" : "left-0.5"
                )} style={{ left: notifications[item.key] ? "22px" : "2px" }} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-danger">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-text-body">Delete Account</p>
            <p className="text-sm text-text-muted">Permanently delete your account and all data</p>
          </div>
          <button className="rounded-lg border border-danger px-4 py-2 text-sm font-semibold text-danger transition-all hover:bg-danger hover:text-white">
            Delete Account
          </button>
        </div>
      </section>

      <ConnectExchangeModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />
    </div>
  );
}
