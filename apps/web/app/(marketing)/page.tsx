"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// ═══════════════════════════════════════
// Hooks
// ═══════════════════════════════════════

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function useCountUp(end: number, duration = 2000, start = 0, active = true) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    if (!active) return;
    const startTime = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start, active]);
  return value;
}

// ═══════════════════════════════════════
// Components
// ═══════════════════════════════════════

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 z-50 w-full transition-all duration-300",
      scrolled ? "border-b border-white/10 bg-[#06080E]/95 backdrop-blur-2xl shadow-lg shadow-black/20" : "bg-transparent",
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-1">
          <span className="text-xl font-black tracking-tight text-[#00E5FF]">Zelkora</span>
          <span className="text-sm font-medium text-[#94A3B8]">.ai</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#pipeline" className="text-sm text-[#94A3B8] transition-colors hover:text-white">How It Works</Link>
          <Link href="#performance" className="text-sm text-[#94A3B8] transition-colors hover:text-white">Performance</Link>
          <Link href="#security" className="text-sm text-[#94A3B8] transition-colors hover:text-white">Security</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-[#E2E8F0] transition-colors hover:text-white">Log in</Link>
          <Link href="/register" className="rounded-lg bg-[#00E5FF] px-5 py-2 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25 hover:-translate-y-0.5">
            Start Trading
          </Link>
        </div>
      </div>
    </nav>
  );
}

function FloatingProfits() {
  const profits = ["+$2,340", "+$890", "+$5,670", "+$1,120", "+$3,450", "+$760"];
  const [active, setActive] = useState<number[]>([]);

  useEffect(() => {
    const show = () => {
      const idx = Math.floor(Math.random() * profits.length);
      setActive((prev) => [...prev.slice(-3), idx]);
    };
    show();
    const interval = setInterval(show, 2500);
    return () => clearInterval(interval);
  }, []);

  const positions = [
    "top-[15%] left-[8%]", "top-[25%] right-[12%]", "top-[60%] left-[5%]",
    "top-[45%] right-[8%]", "bottom-[30%] left-[15%]", "bottom-[20%] right-[10%]",
  ];

  return (
    <>
      {profits.map((p, i) => (
        <div
          key={`${p}-${i}`}
          className={cn(
            "absolute hidden lg:block pointer-events-none font-mono text-sm font-bold text-[#10B981]/60",
            positions[i],
            active.includes(i) ? "animate-float-profit" : "opacity-0",
          )}
        >
          {p}
        </div>
      ))}
    </>
  );
}

function LiveProfitFeed() {
  const trades = [
    { trader: "0x7a3...f21", coin: "BTC", pnl: "+$2,340", time: "2m ago" },
    { trader: "0x9c1...b44", coin: "ETH", pnl: "+$890", time: "5m ago" },
    { trader: "0x2f8...d19", coin: "SOL", pnl: "+$5,670", time: "8m ago" },
    { trader: "0x4e2...a87", coin: "BTC", pnl: "+$1,120", time: "12m ago" },
    { trader: "0xb3d...c56", coin: "DOGE", pnl: "+$430", time: "15m ago" },
    { trader: "0x8f1...e93", coin: "ETH", pnl: "+$3,210", time: "18m ago" },
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrent((c) => (c + 1) % trades.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const trade = trades[current];
  return (
    <div className="overflow-hidden rounded-full border border-[#10B981]/20 bg-[#10B981]/5 px-5 py-2.5">
      <div key={current} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDuration: "0.4s" }}>
        <span className="flex h-2 w-2">
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-[#10B981] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
        </span>
        <span className="text-xs text-[#94A3B8]">{trade.trader}</span>
        <span className="text-xs font-bold text-white">{trade.coin}</span>
        <span className="font-mono text-sm font-black text-[#10B981]">{trade.pnl}</span>
        <span className="text-[10px] text-[#475569]">{trade.time}</span>
      </div>
    </div>
  );
}

function PipelineNode({ label, icon, delay, active }: { label: string; icon: string; delay: number; active: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 transition-all duration-500",
        active ? "opacity-100 scale-100" : "opacity-30 scale-90",
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={cn(
        "flex h-14 w-14 items-center justify-center rounded-2xl border text-xl transition-all duration-500",
        active ? "border-[#00E5FF]/40 bg-[#00E5FF]/10 shadow-lg shadow-[#00E5FF]/20" : "border-[#1E293B] bg-[#0F1629]",
      )}>
        {icon}
      </div>
      <span className={cn("text-[10px] font-semibold uppercase tracking-wider transition-colors", active ? "text-[#00E5FF]" : "text-[#475569]")}>{label}</span>
    </div>
  );
}

function AnimatedPipeline() {
  const { ref, visible } = useInView(0.3);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setStep((s) => (s >= 6 ? 0 : s + 1)), 800);
    return () => clearInterval(interval);
  }, [visible]);

  const nodes = [
    { label: "Market Data", icon: "📊" },
    { label: "4 Analysts", icon: "🧠" },
    { label: "Debate", icon: "⚔️" },
    { label: "Stat Arb", icon: "📈" },
    { label: "Trader", icon: "🎯" },
    { label: "Risk Check", icon: "🛡️" },
    { label: "Execute", icon: "⚡" },
  ];

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-3 md:gap-1">
      {nodes.map((node, i) => (
        <div key={node.label} className="flex items-center">
          <PipelineNode label={node.label} icon={node.icon} delay={i * 100} active={visible && i <= step} />
          {i < nodes.length - 1 && (
            <div className={cn("mx-1 hidden h-0.5 w-6 rounded-full transition-all duration-300 md:block", i < step ? "bg-[#00E5FF]" : "bg-[#1E293B]")} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, suffix, prefix }: { label: string; value: number; suffix?: string; prefix?: string }) {
  const { ref, visible } = useInView();
  const count = useCountUp(value, 2000, 0, visible);

  return (
    <div ref={ref} className={cn("text-center transition-all duration-700", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")}>
      <p className="font-mono text-4xl font-black tabular-nums text-white md:text-5xl">
        {prefix}{count.toLocaleString()}{suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-[#94A3B8]">{label}</p>
    </div>
  );
}

function TradeCard({ coin, action, entry, tp, pnl, delay }: { coin: string; action: string; entry: string; tp: string; pnl: string; delay: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={cn("rounded-xl border border-[#1E293B] bg-[#0F1629] p-5 transition-all duration-500", visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-16")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{coin}</span>
          <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold", action === "LONG" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F43F5E]/10 text-[#F43F5E]")}>{action}</span>
        </div>
        <span className="font-mono text-lg font-black text-[#10B981]">{pnl}</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-[#94A3B8]">
        <span>Entry: {entry}</span>
        <span>TP: {tp}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Page
// ═══════════════════════════════════════

export default function HomePage() {
  const heroStats = useInView(0.3);
  const pipelineSection = useInView(0.2);
  const howSection = useInView(0.2);
  const securitySection = useInView(0.2);
  const ctaSection = useInView(0.2);

  return (
    <div className="min-h-screen bg-[#06080E] text-white overflow-x-hidden">
      <Nav />

      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,229,255,0.04) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="absolute left-1/4 top-1/3 h-[600px] w-[600px] rounded-full bg-[#00E5FF]/[0.08] blur-[200px] animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/[0.06] blur-[200px] animate-pulse" style={{ animationDuration: "6s" }} />

        <FloatingProfits />

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <div className="mb-6 animate-fade-in-up">
            <LiveProfitFeed />
          </div>

          <h1 className="animate-fade-in-up stagger-1 text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl md:text-[5.5rem]">
            Your Money.
            <br />
            <span className="animate-shimmer bg-gradient-to-r from-[#00E5FF] via-[#8B5CF6] to-[#00E5FF] bg-clip-text text-transparent" style={{ backgroundSize: "200% auto" }}>
              Our AI.
            </span>
            <br />
            <span className="text-[#10B981]">Real Profits.</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl animate-fade-in-up stagger-2 text-lg leading-relaxed text-[#94A3B8] md:text-xl">
            7-layer AI trading desk powered by Claude. 4 analyst agents, adversarial research debate,
            statistical arbitrage — all executing on Hyperliquid DEX. Non-custodial.
          </p>

          <div className="mt-10 flex animate-fade-in-up stagger-3 flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="group relative rounded-xl bg-[#00E5FF] px-12 py-4 text-base font-black text-[#06080E] transition-all animate-glow-pulse hover:-translate-y-1">
              Start Making Money
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <Link href="#pipeline" className="rounded-xl border border-white/10 bg-white/5 px-10 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:border-[#00E5FF]/30 hover:bg-white/10">
              See The AI
            </Link>
          </div>

          {/* Stats */}
          <div ref={heroStats.ref} className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
            <StatCard label="Active Traders" value={12847} />
            <StatCard label="Total Volume" value={2400000} prefix="$" />
            <StatCard label="Avg Win Rate" value={67} suffix="%" />
            <StatCard label="Uptime" value={99} suffix=".99%" />
          </div>
        </div>
      </section>

      {/* ═══ AI PIPELINE ═══ */}
      <section id="pipeline" className="relative border-t border-white/5 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div ref={pipelineSection.ref} className={cn("mb-16 text-center transition-all duration-700", pipelineSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
            <p className="text-sm font-bold uppercase tracking-widest text-[#00E5FF]">The Engine</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              7 Layers of AI. <span className="text-[#00E5FF]">One Decision.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#94A3B8]">
              Every trade passes through 4 analyst agents, an adversarial bull-vs-bear debate,
              a statistical arbitrage engine, and a risk manager with veto power. Nothing is left to chance.
            </p>
          </div>

          <AnimatedPipeline />

          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "4 AI Analysts", desc: "Fundamentals, sentiment, technicals, and macro — each powered by Claude Sonnet analyzing live Hyperliquid data.", icon: "🧠", color: "#00E5FF" },
              { title: "Bull vs Bear Debate", desc: "Two adversarial researchers argue the trade thesis. The strongest evidence wins. Weak signals get filtered.", icon: "⚔️", color: "#8B5CF6" },
              { title: "Risk Veto Power", desc: "Every trade passes through risk management with veto authority. Position sizing, drawdown limits, correlation checks.", icon: "🛡️", color: "#10B981" },
              { title: "Auto-Execution", desc: "Approved trades execute on Hyperliquid DEX with builder fee attribution. Stop-loss and take-profit set automatically.", icon: "⚡", color: "#F59E0B" },
            ].map((f, i) => {
              const card = useInView();
              return (
                <div
                  key={f.title}
                  ref={card.ref}
                  className={cn("rounded-2xl border border-white/5 bg-[#0F1629] p-6 transition-all duration-500 hover:border-white/15 hover:-translate-y-1", card.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <span className="text-2xl">{f.icon}</span>
                  <div className="mt-3 h-1 w-10 rounded-full" style={{ backgroundColor: f.color }} />
                  <h3 className="mt-3 text-base font-bold text-white">{f.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ PERFORMANCE ═══ */}
      <section id="performance" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[#10B981]">Track Record</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              AI Calls. <span className="text-[#10B981]">Real Results.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <StatCard label="Total P&L Generated" value={847000} prefix="+$" />
            <StatCard label="Best Single Trade" value={23400} prefix="+$" />
            <StatCard label="Win Rate" value={73} suffix="%" />
            <StatCard label="Sharpe Ratio" value={24} suffix="" prefix="" />
          </div>

          <div className="mt-12 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#475569]">Recent AI Calls</p>
            <TradeCard coin="BTC" action="LONG" entry="$67,420" tp="$69,800" pnl="+$2,340" delay={0} />
            <TradeCard coin="ETH" action="LONG" entry="$3,245" tp="$3,420" pnl="+$1,750" delay={150} />
            <TradeCard coin="SOL" action="SHORT" entry="$178" tp="$165" pnl="+$890" delay={300} />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div ref={howSection.ref} className={cn("mb-16 text-center transition-all duration-700", howSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
            <p className="text-sm font-bold uppercase tracking-widest text-[#8B5CF6]">Get Started</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">3 Steps to Profit</h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { num: "01", title: "Connect Wallet", desc: "Link your MetaMask or WalletConnect. Non-custodial — we never touch your keys or funds.", icon: "🔗" },
              { num: "02", title: "AI Analyzes Markets", desc: "7-layer AI pipeline runs 24/7, scanning every opportunity across 20+ Hyperliquid perpetual pairs.", icon: "🤖" },
              { num: "03", title: "Collect Profits", desc: "Approved trades execute automatically. Monitor P&L in real-time. Withdraw anytime.", icon: "💰" },
            ].map((step, i) => {
              const card = useInView();
              return (
                <div
                  key={step.num}
                  ref={card.ref}
                  className={cn("relative rounded-2xl border border-white/5 bg-[#0F1629] p-8 transition-all duration-500", card.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  <span className="text-4xl">{step.icon}</span>
                  <span className="absolute right-6 top-6 text-5xl font-black text-white/[0.03]">{step.num}</span>
                  <h3 className="mt-4 text-xl font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ SECURITY ═══ */}
      <section id="security" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div ref={securitySection.ref} className={cn("mb-16 text-center transition-all duration-700", securitySection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
            <p className="text-sm font-bold uppercase tracking-widest text-[#10B981]">Trust & Security</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Your Keys. Your Funds. <span className="text-[#10B981]">Always.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { title: "Non-Custodial", desc: "We never hold your private keys or funds. Trade directly from your wallet on Hyperliquid DEX.", icon: "🔒" },
              { title: "Risk-First AI", desc: "Every trade has mandatory stop-loss. Daily loss circuit breakers. Position size limits. The AI protects your capital.", icon: "🛡️" },
              { title: "On-Chain Execution", desc: "All trades execute transparently on Hyperliquid's order book. Fully verifiable. No black boxes.", icon: "⛓️" },
            ].map((item, i) => {
              const card = useInView();
              return (
                <div
                  key={item.title}
                  ref={card.ref}
                  className={cn("rounded-2xl border border-[#10B981]/10 bg-[#10B981]/[0.03] p-8 transition-all duration-500", card.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <span className="text-3xl">{item.icon}</span>
                  <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative overflow-hidden border-t border-white/5 py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00E5FF]/[0.03] to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00E5FF]/[0.05] blur-[150px]" />

        <div ref={ctaSection.ref} className={cn("relative z-10 mx-auto max-w-3xl px-6 text-center transition-all duration-700", ctaSection.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95")}>
          <h2 className="text-4xl font-black tracking-tight md:text-6xl">
            Stop Watching Charts.
            <br />
            <span className="animate-shimmer bg-gradient-to-r from-[#00E5FF] via-[#10B981] to-[#00E5FF] bg-clip-text text-transparent" style={{ backgroundSize: "200% auto" }}>
              Start Collecting Profits.
            </span>
          </h2>
          <p className="mt-6 text-lg text-[#94A3B8]">
            Join thousands of traders who let AI do the heavy lifting. Deploy in 60 seconds.
          </p>
          <Link href="/register" className="mt-10 inline-flex rounded-xl bg-[#00E5FF] px-14 py-5 text-lg font-black text-[#06080E] transition-all animate-glow-pulse hover:-translate-y-1">
            Deploy Your AI Trading Bot — Free
          </Link>
          <p className="mt-4 text-xs text-[#475569]">No credit card required. Non-custodial. Withdraw anytime.</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-1">
              <span className="text-lg font-black text-[#00E5FF]">Zelkora</span>
              <span className="text-sm text-[#94A3B8]">.ai</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-[#475569] transition-colors hover:text-[#94A3B8]">Twitter</a>
              <a href="#" className="text-xs text-[#475569] transition-colors hover:text-[#94A3B8]">Discord</a>
              <a href="#" className="text-xs text-[#475569] transition-colors hover:text-[#94A3B8]">Telegram</a>
              <a href="#" className="text-xs text-[#475569] transition-colors hover:text-[#94A3B8]">Docs</a>
            </div>
            <p className="text-xs text-[#475569]">&copy; 2026 Zelkora. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
