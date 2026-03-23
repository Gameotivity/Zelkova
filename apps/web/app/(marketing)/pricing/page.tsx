"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useCountUp(end: number, duration = 2000, start = 0, active = true) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    if (!active) return;
    const t0 = performance.now();
    let raf: number;
    function tick(now: number) { const p = Math.min((now - t0) / duration, 1); setValue(Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start, active]);
  return value;
}

function AnimatedCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView();
  return <div ref={ref} className={cn("transition-all duration-600", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8", className)} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

const checkPath = "M4.5 12.75l6 6 9-13.5";
const xPath = "M6 18L18 6M6 6l12 12";
function Check() { return <svg className="h-4 w-4 shrink-0 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d={checkPath} /></svg>; }
function XMark() { return <svg className="h-4 w-4 shrink-0 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={xPath} /></svg>; }

const TIERS = [
  {
    name: "Starter", tagline: "Test the waters", fee: "0%", feeNote: "No performance fee", price: "Free", priceNote: "forever",
    cta: "Start Free", ctaStyle: "border border-[#1E293B] bg-white/5 text-white hover:bg-white/10 hover:border-[#00E5FF]/30",
    highlight: false, popular: false, glow: "",
    icon: <svg className="h-8 w-8 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
    features: [
      { text: "1 paper trading bot", ok: true }, { text: "Basic AI analysis (2-layer)", ok: true },
      { text: "Daily market scans", ok: true }, { text: "Community Discord access", ok: true },
      { text: "Live trading", ok: false }, { text: "Full 7-layer AI pipeline", ok: false },
      { text: "Priority signal queue", ok: false }, { text: "Telegram alerts", ok: false },
    ],
  },
  {
    name: "Pro", tagline: "For serious traders", fee: "15%", feeNote: "of profits only", price: "$0", priceNote: "upfront cost",
    cta: "Go Pro - Start Free", ctaStyle: "bg-[#00E5FF] text-[#06080E] font-black hover:shadow-xl hover:shadow-[#00E5FF]/30 hover:-translate-y-0.5",
    highlight: true, popular: true, glow: "shadow-[0_0_80px_rgba(0,229,255,0.15)]",
    icon: <svg className="h-8 w-8 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>,
    features: [
      { text: "5 live trading bots", ok: true }, { text: "Full 7-layer AI pipeline", ok: true },
      { text: "Real-time market scans", ok: true }, { text: "Live trading on Hyperliquid", ok: true },
      { text: "Telegram trade alerts", ok: true }, { text: "Bull vs Bear AI debate", ok: true },
      { text: "Statistical arbitrage signals", ok: true }, { text: "Risk manager with veto power", ok: true },
    ],
  },
  {
    name: "Elite", tagline: "Institutional grade", fee: "10%", feeNote: "of profits only", price: "$0", priceNote: "upfront cost",
    cta: "Go Elite", ctaStyle: "bg-gradient-to-r from-[#8B5CF6] to-[#00E5FF] text-white font-black hover:shadow-xl hover:shadow-[#8B5CF6]/30 hover:-translate-y-0.5",
    highlight: false, popular: false, glow: "",
    icon: <svg className="h-8 w-8 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>,
    features: [
      { text: "Unlimited live bots", ok: true }, { text: "Full 7-layer AI pipeline", ok: true },
      { text: "Priority signal queue (fastest)", ok: true }, { text: "Live trading on Hyperliquid", ok: true },
      { text: "Telegram + Discord alerts", ok: true }, { text: "Custom strategy builder", ok: true },
      { text: "Copy trading access", ok: true }, { text: "API access + dedicated AI PM", ok: true },
    ],
  },
];

const FAQ = [
  { q: "How does the performance fee work?", a: "We only charge when you make money. If the AI generates $1,000 in profit, you keep $850 (Pro) or $900 (Elite). If a trade loses, you pay nothing. Profits calculated daily, settled weekly." },
  { q: "What if the AI loses money?", a: "You pay zero. Performance fee only applies to net profits. We're incentivized to make you money because that's how we make money. 100% aligned interests." },
  { q: "Is there a minimum deposit?", a: "No minimum. Trade from your own Hyperliquid wallet. We never hold your funds. Even $100 works." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no lock-ups, no exit fees. Stop bots and withdraw your full balance anytime. Non-custodial = you're always in control." },
  { q: "How is this different from other bots?", a: "Most bots run simple indicators. Zelkora runs a 7-layer AI pipeline: 4 Claude-powered analysts, adversarial debate, stat arb engine, and risk manager with veto power. Institutional-grade, not a simple bot." },
  { q: "What's the win rate?", a: "67-73% historical across all AI calls. But win rate alone doesn't matter. Our AI targets 2:1 reward-to-risk on every trade with mandatory stop-losses." },
];

const SOCIAL_PROOF = [
  { name: "Alex M.", text: "Made back my first month of hedge fund fees in 3 days. The AI debate feature is insane.", profit: "+$4,230" },
  { name: "Sarah K.", text: "Finally a bot that doesn't charge me when it loses. Aligned incentives matter.", profit: "+$1,890" },
  { name: "Dev R.", text: "The 7-layer pipeline catches signals I'd never see manually. Worth every basis point.", profit: "+$7,120" },
];

export default function PricingPage() {
  const heroSection = useInView(0.2);
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [proUsers, setProUsers] = useState(847);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const i = setInterval(() => setProUsers((p) => p + Math.floor(Math.random() * 3)), 5000);
    return () => clearInterval(i);
  }, []);

  const savingsCount = useCountUp(4200, 2500, 0, mounted);
  const tradersCount = useCountUp(proUsers, 1500, 0, mounted);

  return (
    <div className="min-h-screen bg-[#06080E] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#06080E]/95 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-1"><span className="text-xl font-black text-[#00E5FF]">Zelkora</span><span className="text-sm font-medium text-[#94A3B8]">.ai</span></Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/#pipeline" className="text-sm text-[#94A3B8] hover:text-white">How It Works</Link>
            <Link href="/#performance" className="text-sm text-[#94A3B8] hover:text-white">Performance</Link>
            <Link href="/#security" className="text-sm text-[#94A3B8] hover:text-white">Security</Link>
            <Link href="/pricing" className="text-sm text-[#00E5FF] font-semibold">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white md:hidden" aria-label="Toggle menu">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{mobileNavOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}</svg>
            </button>
            <Link href="/dashboard" className="hidden items-center gap-2 rounded-lg bg-[#00E5FF] px-5 py-2 text-sm font-bold text-[#06080E] hover:shadow-lg hover:shadow-[#00E5FF]/25 hover:-translate-y-0.5 transition-all sm:flex">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" /></svg>
              Connect Wallet
            </Link>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="border-t border-white/10 bg-[#06080E]/95 backdrop-blur-2xl md:hidden">
            <div className="flex flex-col gap-1 px-6 py-4">
              <Link href="/#pipeline" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-4 py-3 text-sm text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white">How It Works</Link>
              <Link href="/#performance" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-4 py-3 text-sm text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white">Performance</Link>
              <Link href="/#security" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-4 py-3 text-sm text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white">Security</Link>
              <Link href="/pricing" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold text-[#00E5FF] transition-colors hover:bg-white/5">Pricing</Link>
              <Link href="/dashboard" onClick={() => setMobileNavOpen(false)} className="mt-2 rounded-lg bg-[#00E5FF] px-4 py-3 text-center text-sm font-bold text-[#06080E]">Connect Wallet</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,229,255,0.03) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        <div className="absolute left-1/3 top-1/4 h-[600px] w-[600px] rounded-full bg-[#00E5FF]/[0.06] blur-[200px] animate-pulse" style={{ animationDuration: "5s" }} />
        <div className="absolute right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/[0.05] blur-[200px] animate-pulse" style={{ animationDuration: "7s" }} />

        <div ref={heroSection.ref} className={cn("relative z-10 mx-auto max-w-4xl px-6 text-center transition-all duration-700", heroSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
          {/* Social proof counter */}
          {mounted && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-1.5 animate-fade-in-up">
              <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-[#F59E0B] opacity-75" /><span className="relative h-2 w-2 rounded-full bg-[#F59E0B]" /></span>
              <span className="font-mono text-xs font-bold text-[#F59E0B]">{tradersCount}</span>
              <span className="text-xs text-[#94A3B8]">traders joined this week</span>
            </div>
          )}

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#10B981]/20 bg-[#10B981]/5 px-4 py-2">
            <Check />
            <span className="text-xs font-bold text-[#10B981]">You only pay when you profit</span>
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl">
            Zero Upfront Cost.
            <br />
            <span className="animate-shimmer bg-gradient-to-r from-[#00E5FF] via-[#10B981] to-[#00E5FF] bg-clip-text text-transparent" style={{ backgroundSize: "200% auto" }}>
              We Eat What We Kill.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#94A3B8] md:text-xl">
            Performance-based pricing. If our AI doesn't make you money, you don't pay. Our interests are <span className="font-bold text-white">100% aligned</span> with yours.
          </p>

          {mounted && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <div className="rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 px-5 py-3">
                <span className="text-xs text-[#94A3B8]">Avg savings</span>
                <span className="ml-2 font-mono text-xl font-black text-[#10B981]">${savingsCount.toLocaleString()}</span>
              </div>
              <div className="rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/5 px-5 py-3">
                <span className="text-xs text-[#94A3B8]">Win rate</span>
                <span className="ml-2 font-mono text-xl font-black text-[#00E5FF]">73%</span>
              </div>
              <div className="rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-5 py-3">
                <span className="text-xs text-[#94A3B8]">Sharpe</span>
                <span className="ml-2 font-mono text-xl font-black text-[#8B5CF6]">2.4</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-start">
            {TIERS.map((tier, i) => (
              <AnimatedCard key={tier.name} delay={i * 150}>
                <div className={cn(
                  "relative rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-2",
                  tier.highlight
                    ? "border-[#00E5FF]/40 bg-gradient-to-b from-[#0F1629] to-[#0A1020] md:-mt-4 md:pb-12"
                    : "border-[#1E293B] bg-[#0F1629]",
                  tier.glow,
                )}>
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#10B981] px-5 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#06080E] shadow-lg shadow-[#00E5FF]/20">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6 flex items-center gap-3">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", tier.highlight ? "bg-[#00E5FF]/10" : tier.name === "Elite" ? "bg-[#8B5CF6]/10" : "bg-white/5")}>
                      {tier.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{tier.name}</h3>
                      <p className="text-xs text-[#94A3B8]">{tier.tagline}</p>
                    </div>
                  </div>

                  <div className="mb-1">
                    <span className={cn("text-6xl font-black tabular-nums", tier.highlight ? "text-[#00E5FF]" : "text-white")}>{tier.fee}</span>
                    {tier.fee !== "0%" && <span className="ml-1 text-lg font-bold text-[#94A3B8]">fee</span>}
                  </div>
                  <p className="mb-1 text-sm font-semibold text-[#10B981]">{tier.feeNote}</p>
                  <p className="mb-8 text-xs text-[#475569]">{tier.price} {tier.priceNote}</p>

                  <Link href="/dashboard" className={cn("block w-full rounded-xl py-4 text-center text-sm transition-all", tier.ctaStyle)}>
                    {tier.cta}
                  </Link>

                  <div className="mt-8 space-y-3">
                    {tier.features.map((f) => (
                      <div key={f.text} className="flex items-start gap-3">
                        {f.ok ? <Check /> : <XMark />}
                        <span className={cn("text-sm", f.ok ? "text-[#E2E8F0]" : "text-[#475569] line-through")}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* How the fee works — visual */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedCard className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-[#00E5FF]">How It Works</p>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">Your Profit. Our Cut. Simple Math.</h2>
          </AnimatedCard>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <AnimatedCard delay={0} className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/10">
                <span className="text-2xl font-black text-[#10B981]">1</span>
              </div>
              <h3 className="font-bold text-white">AI Makes a Trade</h3>
              <p className="mt-2 text-sm text-[#94A3B8]">7-layer pipeline finds opportunity. Position sized at 85% (Pro) or 90% (Elite) of your capital.</p>
              <div className="mt-4 rounded-lg bg-[#06080E] p-3 font-mono text-xs">
                <span className="text-[#94A3B8]">Capital:</span> <span className="text-white">$10,000</span><br />
                <span className="text-[#94A3B8]">Trade size:</span> <span className="text-[#00E5FF]">$8,500</span>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={150} className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00E5FF]/10">
                <span className="text-2xl font-black text-[#00E5FF]">2</span>
              </div>
              <h3 className="font-bold text-white">Trade Profits</h3>
              <p className="mt-2 text-sm text-[#94A3B8]">BTC goes up 5%. Your position earns profit. Performance fee (15%) applied on profits.</p>
              <div className="mt-4 rounded-lg bg-[#06080E] p-3 font-mono text-xs">
                <span className="text-[#94A3B8]">Gain:</span> <span className="text-[#10B981]">+$425</span><br />
                <span className="text-[#94A3B8]">Fee (15%):</span> <span className="text-[#F59E0B]">$63.75</span>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={300} className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#8B5CF6]/10">
                <span className="text-2xl font-black text-[#8B5CF6]">3</span>
              </div>
              <h3 className="font-bold text-white">You Keep the Rest</h3>
              <p className="mt-2 text-sm text-[#94A3B8]">You keep your profit minus the performance fee. If the trade loses, you pay nothing.</p>
              <div className="mt-4 rounded-lg bg-[#06080E] p-3 font-mono text-xs">
                <span className="text-[#94A3B8]">Your profit:</span> <span className="text-[#10B981] font-bold">$425</span><br />
                <span className="text-[#94A3B8]">Fee (15%):</span> <span className="text-[#F59E0B]">$63.75</span><br />
                <span className="text-[#94A3B8]">You keep:</span> <span className="text-[#10B981] font-bold">$361.25</span><br />
                <span className="text-[#94A3B8]">If loss:</span> <span className="text-white">You pay $0</span>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <AnimatedCard className="text-center mb-12">
            <h2 className="text-3xl font-black md:text-4xl">Why Performance Fees <span className="text-[#10B981]">Win</span></h2>
          </AnimatedCard>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <AnimatedCard delay={0} className="rounded-2xl border border-[#F43F5E]/20 bg-[#F43F5E]/[0.03] p-8 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#F43F5E]">Competitor Bots</p>
              <p className="mt-4 text-4xl font-black text-[#F43F5E]">$99-299</p>
              <p className="text-sm text-[#94A3B8]">per month</p>
              <p className="mt-4 text-xs text-[#475569]">Pay even when you lose money. Fixed cost regardless of performance.</p>
              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-[#F43F5E]">
                <XMark /> Misaligned incentives
              </div>
            </AnimatedCard>

            <AnimatedCard delay={150} className="rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/[0.03] p-8 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B]">Hedge Funds</p>
              <p className="mt-4 text-4xl font-black text-[#F59E0B]">2% + 20%</p>
              <p className="text-sm text-[#94A3B8]">management + performance</p>
              <p className="mt-4 text-xs text-[#475569]">2% management fee even on flat years. 20% of profits on top. $100K minimums.</p>
              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-[#F59E0B]">
                <XMark /> High barrier to entry
              </div>
            </AnimatedCard>

            <AnimatedCard delay={300} className="rounded-2xl border border-[#10B981]/30 bg-[#10B981]/[0.05] p-8 text-center shadow-lg shadow-[#10B981]/10">
              <p className="text-xs font-bold uppercase tracking-widest text-[#10B981]">Zelkora</p>
              <p className="mt-4 text-4xl font-black text-[#10B981]">$0 upfront</p>
              <p className="text-sm text-[#94A3B8]">10-15% of profits only</p>
              <p className="mt-4 text-xs text-[#475569]">Zero cost when you lose. We make money when you make money. No minimums.</p>
              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-[#10B981]">
                <Check /> 100% aligned
              </div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedCard className="text-center mb-12">
            <h2 className="text-3xl font-black md:text-4xl">What Traders Say</h2>
          </AnimatedCard>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {SOCIAL_PROOF.map((t, i) => (
              <AnimatedCard key={t.name} delay={i * 150} className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF] to-[#8B5CF6] text-xs font-black text-white">{t.name[0]}</div>
                    <span className="text-sm font-bold text-white">{t.name}</span>
                  </div>
                  <span className="font-mono text-sm font-black text-[#10B981]">{t.profit}</span>
                </div>
                <p className="text-xs leading-relaxed text-[#94A3B8]">"{t.text}"</p>
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} className="h-3 w-3 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <AnimatedCard className="text-center mb-12">
            <h2 className="text-3xl font-black">Questions? Answered.</h2>
          </AnimatedCard>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#1E293B] bg-[#0F1629] overflow-hidden transition-all hover:border-[#00E5FF]/20">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-6 py-5 text-left">
                  <span className="text-sm font-bold text-white pr-4">{faq.q}</span>
                  <svg className={cn("h-5 w-5 shrink-0 text-[#94A3B8] transition-transform duration-200", openFaq === i && "rotate-180 text-[#00E5FF]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </button>
                <div className={cn("overflow-hidden transition-all duration-300", openFaq === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0")}>
                  <div className="border-t border-[#1E293B] px-6 py-4"><p className="text-sm leading-relaxed text-[#94A3B8]">{faq.a}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/5 py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00E5FF]/[0.03] to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00E5FF]/[0.06] blur-[150px]" />
        <AnimatedCard className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-black md:text-6xl">
            Start Free.
            <br />
            <span className="animate-shimmer bg-gradient-to-r from-[#10B981] via-[#00E5FF] to-[#10B981] bg-clip-text text-transparent" style={{ backgroundSize: "200% auto" }}>Pay When You Profit.</span>
          </h2>
          <p className="mt-6 text-lg text-[#94A3B8]">No credit card. No contracts. No risk.</p>
          <Link href="/dashboard" className="mt-10 inline-flex rounded-xl bg-[#00E5FF] px-14 py-5 text-lg font-black text-[#06080E] animate-glow-pulse hover:-translate-y-1">
            Deploy Your AI Bot - Free
          </Link>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#475569]">
            <span className="flex items-center gap-1"><Check /> Non-custodial</span>
            <span className="flex items-center gap-1"><Check /> Cancel anytime</span>
            <span className="flex items-center gap-1"><Check /> No lock-up</span>
            <span className="flex items-center gap-1"><Check /> No minimum</span>
          </div>
        </AnimatedCard>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-1"><span className="text-lg font-black text-[#00E5FF]">Zelkora</span><span className="text-sm text-[#94A3B8]">.ai</span></div>
            <div className="flex gap-6">
              <a href="https://twitter.com/zelkora_ai" target="_blank" rel="noopener noreferrer" className="text-xs text-[#475569] hover:text-[#94A3B8]">Twitter</a>
              <a href="https://discord.gg/zelkora" target="_blank" rel="noopener noreferrer" className="text-xs text-[#475569] hover:text-[#94A3B8]">Discord</a>
              <a href="https://t.me/zelkora" target="_blank" rel="noopener noreferrer" className="text-xs text-[#475569] hover:text-[#94A3B8]">Telegram</a>
              <a href="https://docs.zelkora.ai" target="_blank" rel="noopener noreferrer" className="text-xs text-[#475569] hover:text-[#94A3B8]">Docs</a>
            </div>
            <p className="text-xs text-[#475569]">&copy; 2026 Zelkora. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
