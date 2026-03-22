import Link from "next/link";

function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#06080E]/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-0.5">
          <span className="text-xl font-bold tracking-tight text-[#00E5FF]">Zelkora</span>
          <span className="text-sm font-medium text-[#94A3B8]">.ai</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#bots" className="text-sm text-[#94A3B8] transition-colors hover:text-white">Bots</Link>
          <Link href="#features" className="text-sm text-[#94A3B8] transition-colors hover:text-white">Features</Link>
          <Link href="/pricing" className="text-sm text-[#94A3B8] transition-colors hover:text-white">Pricing</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-[#E2E8F0] transition-colors hover:text-white">Log in</Link>
          <Link href="/register" className="rounded-lg bg-[#00E5FF] px-5 py-2 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function BotCard({ name, tag, returnRange, risk, pairs, strategies, gradient }: {
  name: string; tag: string; returnRange: string; risk: number; pairs: string; strategies: string; gradient: string;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F1629] p-[1px] transition-all duration-300 hover:border-[#00E5FF]/30 hover:shadow-2xl hover:shadow-[#00E5FF]/10 hover:-translate-y-1`}>
      <div className={`absolute inset-0 opacity-10 ${gradient}`} />
      <div className="relative rounded-2xl bg-[#0F1629] p-8">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-[#00E5FF]/10 px-3 py-1 text-xs font-bold text-[#00E5FF]">{tag}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className={`h-3.5 w-3.5 ${i < risk ? "text-[#F59E0B]" : "text-[#1E293B]"}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white">{name}</h3>
        <p className="mt-3 text-4xl font-black tabular-nums text-[#00E5FF]">{returnRange}</p>
        <p className="text-xs font-medium text-[#94A3B8]">estimated monthly return</p>
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#94A3B8]">Strategies</span><span className="text-[#E2E8F0]">{strategies}</span></div>
          <div className="flex justify-between"><span className="text-[#94A3B8]">Pairs</span><span className="text-[#E2E8F0]">{pairs}</span></div>
        </div>
        <Link href="/register" className="mt-6 flex w-full items-center justify-center rounded-xl bg-white/5 py-3 text-sm font-bold text-white transition-all group-hover:bg-[#00E5FF] group-hover:text-[#06080E]">
          Deploy Bot →
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#06080E] text-white">
      <Nav />

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Grid */}
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,229,255,0.03) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        {/* Glow orbs */}
        <div className="absolute left-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-[#00E5FF]/[0.07] blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/3 h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/[0.05] blur-[200px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" /></span>
            <span className="text-xs font-medium text-[#E2E8F0]">Live — Trading $2.4M+ in volume</span>
          </div>

          <h1 className="text-5xl font-black leading-[1.1] tracking-tight sm:text-7xl md:text-8xl">
            AI Bots That
            <br />
            <span className="bg-gradient-to-r from-[#00E5FF] via-[#00E5FF] to-[#8B5CF6] bg-clip-text text-transparent">
              Print Alpha
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-[#94A3B8] md:text-xl">
            Deploy autonomous trading bots on Hyperliquid DEX in under 60 seconds. Non-custodial. AI-powered. Profitable.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="group relative rounded-xl bg-[#00E5FF] px-10 py-4 text-base font-bold text-[#06080E] transition-all hover:shadow-2xl hover:shadow-[#00E5FF]/30 hover:-translate-y-0.5">
              Deploy Your First Bot
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <Link href="#bots" className="rounded-xl border border-white/10 bg-white/5 px-10 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:border-[#00E5FF]/30 hover:bg-white/10">
              View Bots
            </Link>
          </div>

          {/* Live stats bar */}
          <div className="mx-auto mt-20 grid max-w-3xl grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {[
              { label: "Active Bots", value: "12,847" },
              { label: "Total Volume", value: "$2.4M+" },
              { label: "Avg Win Rate", value: "67.3%" },
              { label: "Uptime", value: "99.99%" },
            ].map((s) => (
              <div key={s.label} className="px-6 py-5 text-center">
                <p className="text-2xl font-black tabular-nums text-white">{s.value}</p>
                <p className="mt-1 text-xs font-medium text-[#94A3B8]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bot Marketplace */}
      <section id="bots" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[#00E5FF]">Choose Your Bot</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Three bots. One mission: <span className="text-[#00E5FF]">profit.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[#94A3B8]">
              Each bot uses a unique mix of AI + quant strategies, calibrated for different risk appetites. Deploy in one click.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <BotCard name="Alpha Hunter" tag="HIGH RETURN" returnRange="10-20%" risk={5} pairs="BTC, ETH, SOL" strategies="RSI + EMA + Breakout" gradient="bg-gradient-to-br from-[#F43F5E]/20 to-transparent" />
            <BotCard name="Steady Grinder" tag="BALANCED" returnRange="5-10%" risk={3} pairs="BTC, ETH, BNB, SOL" strategies="EMA Cross + DCA" gradient="bg-gradient-to-br from-[#00E5FF]/20 to-transparent" />
            <BotCard name="Safe Harbor" tag="CONSERVATIVE" returnRange="2-5%" risk={1} pairs="BTC, ETH" strategies="DCA + Grid" gradient="bg-gradient-to-br from-[#10B981]/20 to-transparent" />
          </div>

          <div className="mt-8 text-center">
            <Link href="/register" className="text-sm font-medium text-[#94A3B8] transition-colors hover:text-[#00E5FF]">
              Or build your own custom strategy →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[#8B5CF6]">How It Works</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">60 seconds to deploy</h2>
          </div>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
            {[
              { num: "01", title: "Pick a Bot", desc: "Choose Alpha Hunter, Steady Grinder, or Safe Harbor. Or build your own with our strategy builder." },
              { num: "02", title: "Set Your Capital", desc: "Decide how much to allocate. AI auto-configures stop-loss, take-profit, and position sizing." },
              { num: "03", title: "Deploy & Earn", desc: "Your bot trades 24/7 autonomously. Monitor performance, receive alerts, cash out anytime." },
            ].map((step, i) => (
              <div key={step.num} className="relative border-t border-white/5 p-8 md:border-l md:border-t-0 first:md:border-l-0">
                <span className="text-5xl font-black text-white/5">{step.num}</span>
                <h3 className="mt-4 text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Intelligence */}
      <section id="features" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[#00E5FF]">AI-Powered</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Not just rules. <span className="text-[#00E5FF]">Intelligence.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { title: "Market Scanning", desc: "AI scans 13+ pairs simultaneously, finding opportunities humans miss. Real-time RSI, MACD, EMA analysis.", color: "#00E5FF" },
              { title: "Autonomous Decisions", desc: "Each bot has a brain powered by Llama 3.1 70B. It reasons about entries, exits, and position sizing.", color: "#8B5CF6" },
              { title: "Risk Management", desc: "Mandatory stop-loss. Daily loss circuit breakers. Position size limits. Your capital is protected by default.", color: "#10B981" },
              { title: "Adaptive Learning", desc: "Bots adjust strategy parameters based on win rate, volatility, and market regime. They get smarter over time.", color: "#F59E0B" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/5 bg-[#0F1629] p-8 transition-all hover:border-white/10">
                <div className="mb-4 h-1 w-12 rounded-full" style={{ backgroundColor: f.color }} />
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Stop watching charts.<br />
            <span className="text-[#00E5FF]">Start deploying bots.</span>
          </h2>
          <p className="mt-6 text-lg text-[#94A3B8]">
            Join thousands of traders who let AI do the work. Free to start. No credit card required.
          </p>
          <Link href="/register" className="mt-10 inline-flex rounded-xl bg-[#00E5FF] px-12 py-4 text-base font-bold text-[#06080E] transition-all hover:shadow-2xl hover:shadow-[#00E5FF]/30 hover:-translate-y-0.5">
            Deploy Your First Bot — Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-0.5">
            <span className="text-lg font-bold text-[#00E5FF]">Zelkora</span>
            <span className="text-sm text-[#94A3B8]">.ai</span>
          </div>
          <p className="text-xs text-[#475569]">&copy; 2026 Zelkora. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
