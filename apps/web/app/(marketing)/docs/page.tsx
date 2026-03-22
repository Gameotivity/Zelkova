export default function DocsPage() {
  return (
    <div className="min-h-screen bg-zelkora-base pt-24">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Documentation</h1>
        <p className="mt-4 text-lg text-text-muted">
          Everything you need to get started with Zelkora.ai
        </p>

        <div className="mt-12 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-text-primary">Getting Started</h2>
            <div className="mt-4 space-y-4 text-text-body">
              <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
                <h3 className="font-semibold text-text-primary">1. Create an Account</h3>
                <p className="mt-2 text-sm text-text-muted">
                  Sign up for free and access your dashboard. No credit card required.
                </p>
              </div>
              <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
                <h3 className="font-semibold text-text-primary">2. Create Your First Agent</h3>
                <p className="mt-2 text-sm text-text-muted">
                  Use the guided wizard to choose a strategy and configure parameters. AI suggestions help you optimize.
                </p>
              </div>
              <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
                <h3 className="font-semibold text-text-primary">3. Paper Trade First</h3>
                <p className="mt-2 text-sm text-text-muted">
                  Test your agent with simulated trading to validate your strategy before risking real capital.
                </p>
              </div>
              <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
                <h3 className="font-semibold text-text-primary">4. Go Live</h3>
                <p className="mt-2 text-sm text-text-muted">
                  Connect your wallet, approve builder fees, and deploy your agent with real capital on Hyperliquid.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
