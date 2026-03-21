"use client";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>

      {/* Profile */}
      <section className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-body">Name</label>
            <input
              type="text"
              className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-body outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-body">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-body outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              placeholder="you@example.com"
              disabled
            />
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Security</h2>
        <div className="flex items-center justify-between rounded-lg border border-zelkora-border bg-zelkora-base p-4">
          <div>
            <p className="font-medium text-text-body">Two-Factor Authentication</p>
            <p className="text-sm text-text-muted">Required for live trading</p>
          </div>
          <button className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-zelkora-base transition-all hover:bg-accent-primary/90">
            Enable 2FA
          </button>
        </div>
      </section>

      {/* Exchange Connections */}
      <section className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Exchange Connections</h2>
        <p className="mb-4 text-sm text-text-muted">
          Connect your exchange API keys to enable live trading.
        </p>
        <button className="rounded-lg border border-zelkora-border px-4 py-2.5 text-sm font-medium text-text-body transition-all hover:border-accent-primary hover:text-accent-primary">
          + Connect Exchange
        </button>
      </section>
    </div>
  );
}
