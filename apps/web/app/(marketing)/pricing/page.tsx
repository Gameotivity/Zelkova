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
    const t0 = performance.now();
    let raf: number;
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      setValue(Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start, active]);
  return value;
}

const checkPath = "M4.5 12.75l6 6 9-13.5";
const xPath = "M6 18L18 6M6 6l12 12";

function Check() {
  return <svg className="h-4 w-4 shrink-0 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={checkPath} /></svg>;
}
function XMark() {
  return <svg className="h-4 w-4 shrink-0 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={xPath} /></svg>;
}

const TIERS = [
  {
    name: "Starter",
    tagline: "Test the waters",
    fee: "0%",
    feeNote: "No performance fee",
    price: "Free",
    priceNote: "forever",
    cta: "Start Free",
    ctaStyle: "border border-[#1E293B] bg-white/5 text-white hover:bg-white/10",
    highlight: false,
    popular: false,
    features: [
      { text: "1 paper trading bot", ok: true },
      { text: "Basic AI analysis (2-layer)", ok: true },
      { text: "Daily market scans", ok: true },
      { text: "Community Discord access", ok: true },
      { text: "Live trading", ok: false },
      { text: "Full 7-layer AI pipeline", ok: false },
      { text: "Priority signal queue", ok: false },
      { text: "Telegram alerts", ok: false },
      { text: "Custom strategy builder", ok: false },
      { text: "API access", ok: false },
    ],
  },
  {
    name: "Pro",
    tagline: "Serious traders",
    fee: "15%",
    feeNote: "of profits only",
    price: "$0",
    priceNote: "upfront",
    cta: "Go Pro",
    ctaStyle: "bg-[#00E5FF] text-[#06080E] font-black hover:shadow-lg hover:shadow-[#00E5FF]/25",
    highlight: true,
    popular: true,
    features: [
      { text: "5 live trading bots", ok: true },
      { text: "Full 7-layer AI pipeline", ok: true },
      { text: "Real-time market scans", ok: true },
      { text: "Live trading on Hyperliquid", ok: true },
      { text: "Telegram trade alerts", ok: true },
      { text: "Bull vs Bear AI debate", ok: true },
      { text: "Statistical arbitrage signals", ok: true },
      { text: "Risk manager with veto power", ok: true },
      { text: "Custom strategy builder", ok: false },
      { text: "API access", ok: false },
    ],
  },
  {
    name: "Elite",
    tagline: "Institutional grade",
    fee: "10%",
    feeNote: "of profits only",
    price: "$0",
    priceNote: "upfront",
    cta: "Go Elite",
    ctaStyle: "bg-gradient-to-r from-[#8B5CF6] to-[#00E5FF] text-white font-black hover:shadow-lg hover:shadow-[#8B5CF6]/25",
    highlight: false,
    popular: false,
    features: [
      { text: "Unlimited live bots", ok: true },
      { text: "Full 7-layer AI pipeline", ok: true },
      { text: "Priority signal queue (fastest)", ok: true },
      { text: "Live trading on Hyperliquid", ok: true },
      { text: "Telegram + Discord alerts", ok: true },
      { text: "AI debate + stat arb + macro", ok: true },
      { text: "Custom strategy builder", ok: true },
      { text: "Copy trading access", ok: true },
      { text: "API access (build your own)", ok: true },
      { text: "Dedicated AI portfolio manager", ok: true },
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

export default function PricingPage() {
  const heroSection = useInView(0.2);
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const savingsCount = useCountUp(4200, 2500, 0, mounted);

  return (
    <div className="min-h-screen bg-[#06080E] text-white">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#06080E]/95 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-1"><span className="text-xl font-black text-[#00E5FF]">Zelkora</span><span className="text-sm font-medium text-[#94A3B8]">.ai</span></Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#E2E8F0] hover:text-white">Log in</Link>
            <Link href="/register" className="rounded-lg bg-[#00E5FF] px-5 py-2 text-sm font-bold text-[#06080E] hover:shadow-lg hover:shadow-[#00E5FF]/25">Start Trading</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute left-1/3 top-1/3 h-[500px] w-[500px] rounded-full bg-[#00E5FF]/[0.05] blur-[200px]" />
        <div ref={heroSection.ref} className={cn("relative z-10 mx-auto max-w-4xl px-6 text-center transition-all duration-700", heroSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#10B981]/20 bg-[#10B981]/5 px-4 py-2">
            <Check />
            <span className="text-xs font-bold text-[#10B981]">You only pay when you profit</span>
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Zero Upfront Cost.
            <br />
            <span className="animate-shimmer bg-gradient-to-r from-[#00E5FF] via-[#10B981] to-[#00E5FF] bg-clip-text text-transparent" style={{ backgroundSize: "200% auto" }}>
              We Eat What We Kill.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#94A3B8]">
            Performance-based pricing. If our AI doesn't make you money, you don't pay. Our interests are 100% aligned with yours.
          </p>

          {mounted && (
            <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 px-6 py-3">
              <span className="text-sm text-[#94A3B8]">Traders saved avg</span>
              <span className="font-mono text-2xl font-black text-[#10B981]">${savingsCount.toLocaleString()}</span>
              <span className="text-sm text-[#94A3B8]">vs competitor fees</span>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TIERS.map((tier) => (
              <div key={tier.name} className={cn(
                "relative rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1",
                tier.highlight ? "border-[#00E5FF]/40 bg-[#0F1629] shadow-2xl shadow-[#00E5FF]/10" : "border-[#1E293B] bg-[#0F1629]"
              )}>
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#00E5FF] px-4 py-1 text-[10px] font-black uppercase tracking-widest text-[#06080E]">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-black text-white">{tier.name}</h3>
                <p className="mt-1 text-xs text-[#94A3B8]">{tier.tagline}</p>

                <div className="mt-6 mb-2">
                  <span className="text-5xl font-black tabular-nums text-white">{tier.fee}</span>
                  {tier.fee !== "0%" && <span className="ml-1 text-lg font-bold text-[#94A3B8]">fee</span>}
                </div>
                <p className="mb-1 text-sm font-medium text-[#10B981]">{tier.feeNote}</p>
                <p className="mb-6 text-xs text-[#475569]">{tier.price} {tier.priceNote}</p>

                <Link href="/register" className={cn("block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-all", tier.ctaStyle)}>
                  {tier.cta}
                </Link>

                <div className="mt-8 space-y-3">
                  {tier.features.map((f) => (
                    <div key={f.text} className="flex items-start gap-3">
                      {f.ok ? <Check /> : <XMark />}
                      <span className={cn("text-sm", f.ok ? "text-[#E2E8F0]" : "text-[#475569]")}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Comparison */}
          <div className="mt-12 rounded-2xl border border-[#10B981]/20 bg-[#10B981]/[0.03] p-8 text-center">
            <h3 className="text-xl font-black text-white">Why Performance Fees Win</h3>
            <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-3">
              <div><p className="text-3xl font-black text-[#F43F5E]">$99-299/mo</p><p className="mt-1 text-xs text-[#94A3B8]">Typical bot subscription</p><p className="mt-2 text-xs text-[#475569]">Pay even when you lose</p></div>
              <div><p className="text-3xl font-black text-[#F59E0B]">2-3% + 20%</p><p className="mt-1 text-xs text-[#94A3B8]">Hedge fund fees</p><p className="mt-2 text-xs text-[#475569]">Management + performance</p></div>
              <div><p className="text-3xl font-black text-[#10B981]">$0 upfront</p><p className="mt-1 text-xs text-[#94A3B8]">Zelkora model</p><p className="mt-2 text-xs text-[#475569]">Only pay when you profit</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-3xl font-black">Questions? Answered.</h2>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#1E293B] bg-[#0F1629] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-6 py-4 text-left">
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  <svg className={cn("h-5 w-5 shrink-0 text-[#94A3B8] transition-transform", openFaq === i && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </button>
                {openFaq === i && (
                  <div className="border-t border-[#1E293B] px-6 py-4"><p className="text-sm leading-relaxed text-[#94A3B8]">{faq.a}</p></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/5 py-28">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00E5FF]/[0.05] blur-[150px]" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-black md:text-5xl">Start Free. <span className="text-[#10B981]">Pay When You Profit.</span></h2>
          <p className="mt-6 text-lg text-[#94A3B8]">No credit card. No contracts. No risk.</p>
          <Link href="/register" className="mt-10 inline-flex rounded-xl bg-[#00E5FF] px-14 py-5 text-lg font-black text-[#06080E] animate-glow-pulse hover:-translate-y-1">
            Deploy Your AI Bot - Free
          </Link>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#475569]">
            <span className="flex items-center gap-1"><Check /> Non-custodial</span>
            <span className="flex items-center gap-1"><Check /> Cancel anytime</span>
            <span className="flex items-center gap-1"><Check /> No lock-up</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-1"><span className="text-lg font-black text-[#00E5FF]">Zelkora</span><span className="text-sm text-[#94A3B8]">.ai</span></div>
            <p className="text-xs text-[#475569]">&copy; 2026 Zelkora. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
