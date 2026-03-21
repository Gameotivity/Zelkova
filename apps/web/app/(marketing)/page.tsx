import Link from "next/link";

function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-zelkora-border/50 bg-zelkora-base/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-1">
          <span className="text-xl font-bold tracking-tight text-accent-primary">Zelkora</span>
          <span className="text-sm text-text-muted">.ai</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link href="/features" className="text-sm text-text-muted transition-colors hover:text-text-body">Features</Link>
          <Link href="/pricing" className="text-sm text-text-muted transition-colors hover:text-text-body">Pricing</Link>
          <Link href="/docs" className="text-sm text-text-muted transition-colors hover:text-text-body">Docs</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-text-muted transition-colors hover:text-text-body">Sign In</Link>
          <Link href="/register" className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-zelkora-base transition-all hover:bg-accent-primary/90 hover:shadow-lg hover:shadow-accent-primary/25">
            Start Building
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HowItWorksStep({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 text-xl font-bold text-accent-primary">
        {num}
      </div>
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-text-muted">{desc}</p>
    </div>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="group rounded-xl border border-zelkora-border bg-zelkora-card p-6 transition-all duration-300 hover:border-accent-primary/50 hover:shadow-lg hover:shadow-accent-primary/5">
      <div className="mb-4 inline-flex rounded-lg bg-zelkora-elevated p-3 text-accent-primary transition-colors group-hover:bg-accent-primary/10">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{desc}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zelkora-base">
      <Nav />

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(0,229,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        <div className="absolute left-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-accent-primary/8 blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 h-[400px] w-[400px] rounded-full bg-accent-secondary/8 blur-[150px]" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zelkora-border bg-zelkora-card px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-text-muted">Now in Beta — Join 10,000 testers</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-text-primary sm:text-6xl md:text-7xl">
            Your AI Agents.
            <br />
            <span className="bg-gradient-to-r from-accent-primary via-accent-primary to-accent-secondary bg-clip-text text-transparent">
              Your Alpha.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-muted md:text-xl">
            Build autonomous trading agents that monitor crypto markets and prediction markets 24/7. No code required. Deploy in 5 minutes.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="rounded-xl bg-accent-primary px-8 py-3.5 text-base font-semibold text-zelkora-base transition-all duration-300 hover:bg-accent-primary/90 hover:shadow-xl hover:shadow-accent-primary/25 hover:-translate-y-0.5">
              Start Building (Free)
            </Link>
            <button className="rounded-xl border border-zelkora-border px-8 py-3.5 text-base font-semibold text-text-body transition-all duration-300 hover:border-accent-primary/50 hover:text-accent-primary">
              Watch Demo
            </button>
          </div>

          {/* Floating dashboard mockup */}
          <div className="mt-16 rounded-2xl border border-zelkora-border bg-zelkora-card/50 p-1 shadow-2xl shadow-accent-primary/5 backdrop-blur-sm">
            <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-danger/60" />
                <div className="h-3 w-3 rounded-full bg-warning/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
                <span className="ml-4 text-xs text-text-muted">zelkora.ai/dashboard</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Portfolio", value: "$10,424", color: "text-text-primary" },
                  { label: "Active Agents", value: "3", color: "text-accent-primary" },
                  { label: "Today P&L", value: "+$124", color: "text-success" },
                  { label: "Win Rate", value: "64.3%", color: "text-accent-secondary" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-zelkora-base p-3">
                    <p className="text-[10px] text-text-muted">{s.label}</p>
                    <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-32 rounded-lg bg-zelkora-base p-3">
                <svg viewBox="0 0 400 100" className="h-full w-full">
                  <defs>
                    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,80 Q50,70 100,60 T200,40 T300,30 T400,20 L400,100 L0,100 Z" fill="url(#heroGrad)" />
                  <path d="M0,80 Q50,70 100,60 T200,40 T300,30 T400,20" fill="none" stroke="#10B981" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-zelkora-border py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Three steps to <span className="text-accent-primary">autonomous alpha</span>
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            <HowItWorksStep num="1" title="Choose Your Battleground" desc="Pick crypto CEX trading or Polymarket prediction markets. Connect your exchange in seconds." />
            <HowItWorksStep num="2" title="Configure Your Agent" desc="Select a strategy, tune parameters with AI suggestions, and set your risk controls." />
            <HowItWorksStep num="3" title="Deploy & Profit" desc="Your agent runs 24/7. Paper trade first, then go live with one click. Get real-time alerts." />
          </div>
        </div>
      </section>

      {/* Agent Types */}
      <section className="border-t border-zelkora-border py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Two agent types. <span className="text-accent-secondary">Infinite possibilities.</span>
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-zelkora-border bg-gradient-to-b from-zelkora-card to-zelkora-base p-8 transition-all duration-300 hover:border-accent-primary/50">
              <div className="mb-4 inline-flex rounded-xl bg-accent-primary/10 p-4">
                <svg className="h-8 w-8 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-text-primary">Crypto Trading Agent</h3>
              <ul className="mt-4 space-y-2.5">
                {["5 strategies: Grid, DCA, RSI, EMA, Breakout", "Binance & Bybit spot trading", "Hybrid quant model with AI sentiment", "Automatic stop-loss & trailing profit", "Real-time technical indicators"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-text-body">
                    <svg className="h-4 w-4 flex-shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-zelkora-border bg-gradient-to-b from-zelkora-card to-zelkora-base p-8 transition-all duration-300 hover:border-accent-secondary/50">
              <div className="mb-4 inline-flex rounded-xl bg-accent-secondary/10 p-4">
                <svg className="h-8 w-8 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-text-primary">Prediction Market Agent</h3>
              <ul className="mt-4 space-y-2.5">
                {["Polymarket integration", "AI fair value assessment", "Multi-event monitoring", "Odds divergence & momentum strategies", "Auto-exit before resolution"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-text-body">
                    <svg className="h-4 w-4 flex-shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* AI Intelligence */}
      <section className="border-t border-zelkora-border py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Your agents don&apos;t just follow rules. <span className="text-accent-primary">They think.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-text-muted">
            A hybrid intelligence engine combining quantitative signals, on-chain analytics, and AI-driven sentiment analysis.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { title: "Technical Indicators", desc: "RSI, MACD, Bollinger, EMA crossovers, VWAP — computed in real-time", color: "text-accent-primary" },
              { title: "On-Chain Signals", desc: "Whale movements, DEX volume spikes, funding rates, liquidity shifts", color: "text-accent-secondary" },
              { title: "AI Sentiment", desc: "Crypto Twitter analysis, news feeds, Fear & Greed Index integration", color: "text-success" },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-zelkora-border bg-zelkora-card p-6">
                <h3 className={`text-lg font-semibold ${item.color}`}>{item.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="border-t border-zelkora-border py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Everything you need
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Paper Trading", desc: "Test your agents risk-free with simulated trading before deploying real capital.", icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" /></svg> },
              { title: "Live Trading", desc: "One click to go live on Binance or Bybit with real capital and automatic execution.", icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg> },
              { title: "Risk Controls", desc: "Mandatory stop-loss, circuit breakers, daily loss limits, and position size controls.", icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg> },
              { title: "Real-Time Dashboard", desc: "Live P&L charts, agent status, trade history — all updating via WebSocket.", icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg> },
              { title: "AI Suggestions", desc: "Smart parameter recommendations based on historical data and current market conditions.", icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg> },
              { title: "Multi-Exchange", desc: "Binance and Bybit from day one. More exchanges coming soon.", icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg> },
            ].map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zelkora-border py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Ready to deploy your first agent?
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            Join thousands of traders building autonomous agents on Zelkora.
          </p>
          <Link href="/register" className="mt-8 inline-flex rounded-xl bg-accent-primary px-10 py-4 text-base font-semibold text-zelkora-base transition-all duration-300 hover:bg-accent-primary/90 hover:shadow-xl hover:shadow-accent-primary/25 hover:-translate-y-0.5">
            Start Building (Free)
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zelkora-border py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-accent-primary">Zelkora</span>
              <span className="text-sm text-text-muted">.ai</span>
            </div>
            <div className="flex gap-8">
              <Link href="/features" className="text-sm text-text-muted hover:text-text-body">Features</Link>
              <Link href="/pricing" className="text-sm text-text-muted hover:text-text-body">Pricing</Link>
              <Link href="/docs" className="text-sm text-text-muted hover:text-text-body">Docs</Link>
            </div>
            <p className="text-xs text-text-disabled">2026 Zelkora.ai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
