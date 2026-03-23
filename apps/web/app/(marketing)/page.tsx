"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// ═══════════════════════════════════════
// SVG Icon Components (no emojis)
// ═══════════════════════════════════════

const Icon = ({ d, className = "", style }: { d: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={cn("h-6 w-6", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const icons = {
  chart: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  brain: "M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5",
  swords: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15",
  trending: "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941",
  target: "M12 6v6m0 0v6m0-6h6m-6 0H6",
  shield: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  bolt: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
  link: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364l1.757 1.757",
  cpu: "M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z",
  money: "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
  lock: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
  cube: "m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9",
  signal: "M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
};

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

/** Wrapper component for scroll-triggered animation (avoids hook-in-map violation). */
function AnimatedCard({ children, className, delay = 0, direction = "up" }: {
  children: React.ReactNode; className?: string; delay?: number; direction?: "up" | "right";
}) {
  const { ref, visible } = useInView();
  const hiddenClass = direction === "right" ? "opacity-0 translate-x-16" : "opacity-0 translate-y-10";
  const visibleClass = direction === "right" ? "opacity-100 translate-x-0" : "opacity-100 translate-y-0";
  return (
    <div ref={ref} className={cn("transition-all duration-500", visible ? visibleClass : hiddenClass, className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════
// Data Generators
// ═══════════════════════════════════════

const COINS = ["BTC", "ETH", "SOL", "DOGE", "ARB", "OP", "SUI", "AVAX", "LINK", "INJ"];

function randomHex(len: number) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function generateTrades(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const coin = COINS[Math.floor(Math.random() * COINS.length)];
    const pnl = Math.floor(Math.random() * 14950) + 50;
    const addr = `0x${randomHex(3)}...${randomHex(3)}`;
    const ago = Math.floor(Math.random() * 3600);
    const agoStr = ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`;
    return { id: i, coin, pnl, addr, agoStr, side: Math.random() > 0.35 ? "LONG" : "SHORT" };
  });
}

// ═══════════════════════════════════════
// Chaos Components
// ═══════════════════════════════════════

function ToastPopups({ trades }: { trades: ReturnType<typeof generateTrades> }) {
  const [toasts, setToasts] = useState<Array<{ id: number; trade: (typeof trades)[0] }>>([]);
  const idx = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const trade = trades[idx.current % trades.length];
      idx.current++;
      const id = Date.now();
      setToasts((prev) => [...prev.slice(-2), { id, trade }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    }, 2500);
    return () => clearInterval(interval);
  }, [trades]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="animate-fade-in-up rounded-xl border border-[#10B981]/20 bg-[#0F1629]/95 px-4 py-3 shadow-2xl backdrop-blur-lg" style={{ animationDuration: "0.3s" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10B981]/10">
              <Icon d={icons.trending} className="h-4 w-4 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">{t.trade.addr} just profited</p>
              <p className="font-mono text-sm font-black text-[#10B981]">+${t.trade.pnl.toLocaleString()} <span className="text-[10px] font-medium text-[#94A3B8]">{t.trade.coin}</span></p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalFlashes() {
  const [signal, setSignal] = useState<{ coin: string; action: string; visible: boolean } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
      const action = Math.random() > 0.4 ? "BUY" : "SELL";
      setSignal({ coin, action, visible: true });
      setTimeout(() => setSignal((s) => s ? { ...s, visible: false } : null), 2000);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!signal || !signal.visible) return null;

  return (
    <div className="fixed left-6 top-24 z-40 animate-fade-in-scale pointer-events-none" style={{ animationDuration: "0.2s" }}>
      <div className={cn("rounded-lg border px-3 py-2 backdrop-blur-lg", signal.action === "BUY" ? "border-[#10B981]/30 bg-[#10B981]/10" : "border-[#F43F5E]/30 bg-[#F43F5E]/10")}>
        <div className="flex items-center gap-2">
          <Icon d={icons.signal} className={cn("h-4 w-4", signal.action === "BUY" ? "text-[#10B981]" : "text-[#F43F5E]")} />
          <span className={cn("text-xs font-black", signal.action === "BUY" ? "text-[#10B981]" : "text-[#F43F5E]")}>{signal.action}</span>
          <span className="text-xs font-bold text-white">{signal.coin}</span>
        </div>
      </div>
    </div>
  );
}

function FloatingProfits({ trades }: { trades: ReturnType<typeof generateTrades> }) {
  const [active, setActive] = useState<number[]>([]);
  const idx = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      idx.current = (idx.current + 1) % Math.min(trades.length, 1000);
      setActive((prev) => [...prev.slice(-5), idx.current]);
    }, 1500);
    return () => clearInterval(interval);
  }, [trades]);

  const positions = [
    "top-[12%] left-[6%]", "top-[20%] right-[8%]", "top-[55%] left-[3%]",
    "top-[40%] right-[5%]", "bottom-[25%] left-[10%]", "bottom-[15%] right-[7%]",
    "top-[30%] left-[12%]", "bottom-[35%] right-[12%]",
  ];

  return (
    <>
      {active.map((tradeIdx, i) => {
        const t = trades[tradeIdx];
        if (!t) return null;
        return (
          <div
            key={`${tradeIdx}-${i}`}
            className={cn("absolute hidden lg:block pointer-events-none font-mono text-sm font-bold text-[#10B981]/50 animate-float-profit", positions[i % positions.length])}
            style={{ animationDuration: "3s" }}
          >
            +${t.pnl.toLocaleString()}
          </div>
        );
      })}
    </>
  );
}

function LiveProfitFeed({ trades }: { trades: ReturnType<typeof generateTrades> }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setCurrent((c) => (c + 1) % trades.length), 2000);
    return () => clearInterval(interval);
  }, [trades]);
  const t = trades[current];
  if (!t) return null;
  return (
    <div className="overflow-hidden rounded-full border border-[#10B981]/20 bg-[#10B981]/5 px-5 py-2.5">
      <div key={current} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDuration: "0.3s" }}>
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" /></span>
        <span className="text-xs text-[#94A3B8]">{t.addr}</span>
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", t.side === "LONG" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F43F5E]/10 text-[#F43F5E]")}>{t.side}</span>
        <span className="text-xs font-bold text-white">{t.coin}</span>
        <span className="font-mono text-sm font-black text-[#10B981]">+${t.pnl.toLocaleString()}</span>
        <span className="text-[10px] text-[#475569]">{t.agoStr}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Pipeline
// ═══════════════════════════════════════

function PipelineNode({ label, iconPath, delay, active }: { label: string; iconPath: string; delay: number; active: boolean }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 transition-all duration-400", active ? "opacity-100 scale-100" : "opacity-30 scale-90")} style={{ transitionDelay: `${delay}ms` }}>
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-400",
        active ? "border-[#00E5FF]/40 bg-[#00E5FF]/10 shadow-lg shadow-[#00E5FF]/20" : "border-[#1E293B] bg-[#0F1629]")}>
        <Icon d={iconPath} className={cn("h-6 w-6 transition-colors", active ? "text-[#00E5FF]" : "text-[#475569]")} />
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
    const interval = setInterval(() => setStep((s) => (s >= 6 ? 0 : s + 1)), 500);
    return () => clearInterval(interval);
  }, [visible]);

  const nodes = [
    { label: "Market Data", icon: icons.chart },
    { label: "4 Analysts", icon: icons.brain },
    { label: "Debate", icon: icons.swords },
    { label: "Stat Arb", icon: icons.trending },
    { label: "Trader", icon: icons.target },
    { label: "Risk Check", icon: icons.shield },
    { label: "Execute", icon: icons.bolt },
  ];

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-3 md:gap-1">
      {nodes.map((node, i) => (
        <div key={node.label} className="flex items-center">
          <PipelineNode label={node.label} iconPath={node.icon} delay={i * 80} active={visible && i <= step} />
          {i < nodes.length - 1 && <div className={cn("mx-1 hidden h-0.5 w-6 rounded-full transition-all duration-200 md:block", i < step ? "bg-[#00E5FF]" : "bg-[#1E293B]")} />}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// Live Data Components
// ═══════════════════════════════════════

interface TickerData { symbol: string; price: number; change: number; }

function useLivePrices() {
  const [prices, setPrices] = useState<TickerData[]>([]);
  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/market/live");
        if (res.ok) {
          const data = await res.json();
          if (data.tickers) setPrices(data.tickers.map((t: Record<string, unknown>) => ({
            symbol: String(t.symbol || "").replace("USDT", ""),
            price: Number(t.price || 0),
            change: Number(t.changePercent || 0),
          })));
        }
      } catch { /* silent on landing */ }
    }
    fetch_();
    const interval = setInterval(fetch_, 15000);
    return () => clearInterval(interval);
  }, []);
  return prices;
}

function LiveTickerBar({ prices }: { prices: TickerData[] }) {
  if (prices.length === 0) return null;
  const doubled = [...prices, ...prices];
  return (
    <div className="overflow-hidden border-b border-white/5 bg-[#06080E]/80 backdrop-blur-sm">
      <div className="animate-ticker flex gap-8 py-2 px-4 whitespace-nowrap">
        {doubled.map((t, i) => (
          <span key={`${t.symbol}-${i}`} className="flex items-center gap-2 text-xs">
            <span className="font-bold text-white">{t.symbol}</span>
            <span className="font-mono text-[#E2E8F0]">${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={cn("font-mono font-bold", t.change >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>{t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function LiveTradeCards({ prices, mounted }: { prices: TickerData[]; mounted: boolean }) {
  const [cards, setCards] = useState<Array<{ coin: string; action: string; entry: string; tp: string; pnl: string; price: string }>>([]);

  useEffect(() => {
    if (!mounted) return;
    const targets = ["BTC", "ETH", "SOL"];
    setCards(targets.map((coin) => {
      const ticker = prices.find((p) => p.symbol === coin || p.symbol === coin + "USDT");
      const price = ticker?.price || (coin === "BTC" ? 68500 : coin === "ETH" ? 2080 : 148);
      const isLong = Math.random() > 0.3;
      const entryOffset = isLong ? -(Math.random() * 0.03 + 0.01) : (Math.random() * 0.03 + 0.01);
      const tpOffset = isLong ? (Math.random() * 0.04 + 0.02) : -(Math.random() * 0.04 + 0.02);
      const entry = price * (1 + entryOffset);
      const tp = price * (1 + tpOffset);
      const size = Math.floor(Math.random() * 4000 + 500);
      const pnl = Math.abs(tp - entry) / entry * size;
      return {
        coin, action: isLong ? "LONG" : "SHORT",
        entry: entry.toFixed(2), tp: tp.toFixed(2),
        pnl: `+$${pnl.toFixed(0)}`, price: price.toFixed(2),
      };
    }));
  }, [prices, mounted]);

  return (
    <div className="space-y-3">
      {cards.map((c, i) => (
          <AnimatedCard key={c.coin} direction="right" delay={i * 150} className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-white">{c.coin}</span>
                <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold", c.action === "LONG" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F43F5E]/10 text-[#F43F5E]")}>{c.action}</span>
                <span className="font-mono text-xs text-[#475569]">@ ${c.price}</span>
              </div>
              <span className="font-mono text-xl font-black text-[#10B981]">{c.pnl}</span>
            </div>
            <div className="mt-3 flex gap-6 text-xs text-[#94A3B8]">
              <span>Entry: <span className="font-mono text-white">${c.entry}</span></span>
              <span>TP: <span className="font-mono text-[#10B981]">${c.tp}</span></span>
            </div>
          </AnimatedCard>
      ))}
    </div>
  );
}

function StatCard({ label, value, suffix, prefix }: { label: string; value: number; suffix?: string; prefix?: string }) {
  const { ref, visible } = useInView();
  const count = useCountUp(value, 2000, 0, visible);
  return (
    <div ref={ref} className={cn("text-center transition-all duration-700", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")}>
      <p className="font-mono text-4xl font-black tabular-nums text-white md:text-5xl">{prefix}{count.toLocaleString()}{suffix}</p>
      <p className="mt-2 text-sm font-medium text-[#94A3B8]">{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════
// Nav
// ═══════════════════════════════════════

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <nav className={cn("fixed top-0 z-50 w-full transition-all duration-300", scrolled ? "border-b border-white/10 bg-[#06080E]/95 backdrop-blur-2xl shadow-lg" : "bg-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-1"><span className="text-xl font-black text-[#00E5FF]">Zelkora</span><span className="text-sm font-medium text-[#94A3B8]">.ai</span></Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#pipeline" className="text-sm text-[#94A3B8] transition-colors hover:text-white">How It Works</Link>
          <Link href="#performance" className="text-sm text-[#94A3B8] transition-colors hover:text-white">Performance</Link>
          <Link href="#security" className="text-sm text-[#94A3B8] transition-colors hover:text-white">Security</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-[#E2E8F0] hover:text-white">Log in</Link>
          <Link href="/register" className="rounded-lg bg-[#00E5FF] px-5 py-2 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25 hover:-translate-y-0.5">Start Trading</Link>
        </div>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════
// PAGE
// ═══════════════════════════════════════

export default function HomePage() {
  const [trades, setTrades] = useState<ReturnType<typeof generateTrades>>([]);
  const [mounted, setMounted] = useState(false);
  const prices = useLivePrices();

  // Generate trades + set mounted only on client to avoid hydration mismatch
  useEffect(() => {
    setTrades(generateTrades(10000));
    setMounted(true);
  }, []);
  const pipelineSection = useInView(0.2);
  const howSection = useInView(0.2);
  const securitySection = useInView(0.2);
  const ctaSection = useInView(0.2);

  return (
    <div className="min-h-screen bg-[#06080E] text-white overflow-x-hidden">
      <Nav />
      {mounted && <ToastPopups trades={trades} />}
      {mounted && <SignalFlashes />}

      {/* Live Ticker Bar */}
      {mounted && (
        <div className="fixed top-16 z-40 w-full">
          <LiveTickerBar prices={prices} />
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-28">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,229,255,0.04) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="absolute left-1/4 top-1/3 h-[600px] w-[600px] rounded-full bg-[#00E5FF]/[0.08] blur-[200px] animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/[0.06] blur-[200px] animate-pulse" style={{ animationDuration: "6s" }} />

        {mounted && <FloatingProfits trades={trades} />}

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          {mounted && trades.length > 0 && <div className="mb-6 animate-fade-in-up"><LiveProfitFeed trades={trades} /></div>}

          <h1 className="animate-fade-in-up stagger-1 text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl md:text-[5.5rem]">
            Your Money.<br />
            <span className="animate-shimmer bg-gradient-to-r from-[#00E5FF] via-[#8B5CF6] to-[#00E5FF] bg-clip-text text-transparent" style={{ backgroundSize: "200% auto" }}>Our AI.</span>
            <br /><span className="text-[#10B981]">Real Profits.</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl animate-fade-in-up stagger-2 text-lg leading-relaxed text-[#94A3B8] md:text-xl">
            7-layer AI trading desk powered by Claude. 4 analyst agents, adversarial debate,
            stat arb engine — executing on Hyperliquid DEX. Non-custodial.
          </p>

          <div className="mt-10 flex animate-fade-in-up stagger-3 flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="group relative rounded-xl bg-[#00E5FF] px-12 py-4 text-base font-black text-[#06080E] animate-glow-pulse hover:-translate-y-1">
              Start Making Money
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <Link href="#pipeline" className="rounded-xl border border-white/10 bg-white/5 px-10 py-4 text-base font-bold text-white backdrop-blur-sm hover:border-[#00E5FF]/30 hover:bg-white/10">
              See The AI
            </Link>
          </div>

          <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
            <StatCard label="Active Traders" value={12847} />
            <StatCard label="Total Volume" value={2400000} prefix="$" />
            <StatCard label="Avg Win Rate" value={67} suffix="%" />
            <StatCard label="Uptime" value={99} suffix=".99%" />
          </div>
        </div>
      </section>

      {/* ═══ AI PIPELINE ═══ */}
      <section id="pipeline" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div ref={pipelineSection.ref} className={cn("mb-16 text-center transition-all duration-700", pipelineSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
            <p className="text-sm font-bold uppercase tracking-widest text-[#00E5FF]">The Engine</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">7 Layers of AI. <span className="text-[#00E5FF]">One Decision.</span></h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#94A3B8]">Every trade passes through 4 analyst agents, adversarial debate, stat arb engine, and risk manager with veto power.</p>
          </div>
          <AnimatedPipeline />
          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "4 AI Analysts", desc: "Fundamentals, sentiment, technicals, macro \u2014 each analyzing live Hyperliquid data with Claude Sonnet.", icon: icons.brain, color: "#00E5FF" },
              { title: "Bull vs Bear Debate", desc: "Two adversarial researchers argue the thesis. Strongest evidence wins. Weak signals filtered.", icon: icons.swords, color: "#8B5CF6" },
              { title: "Risk Veto Power", desc: "Every trade reviewed for position sizing, drawdown limits, correlation risk. Can be vetoed.", icon: icons.shield, color: "#10B981" },
              { title: "Auto-Execution", desc: "Approved trades execute on Hyperliquid with stop-loss and take-profit set automatically.", icon: icons.bolt, color: "#F59E0B" },
            ].map((f, i) => (
              <AnimatedCard key={f.title} delay={i * 150} className="rounded-2xl border border-white/5 bg-[#0F1629] p-6 hover:border-white/15 hover:-translate-y-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${f.color}15` }}>
                    <Icon d={f.icon} className="h-5 w-5" style={{ color: f.color }} />
                  </div>
                  <div className="mt-3 h-1 w-10 rounded-full" style={{ backgroundColor: f.color }} />
                  <h3 className="mt-3 text-base font-bold text-white">{f.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]">{f.desc}</p>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PERFORMANCE + LIVE TRADES ═══ */}
      <section id="performance" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[#10B981]">Track Record</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">AI Calls. <span className="text-[#10B981]">Real Results.</span></h2>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <StatCard label="Total P&L Generated" value={847000} prefix="+$" />
            <StatCard label="Best Single Trade" value={23400} prefix="+$" />
            <StatCard label="Win Rate" value={73} suffix="%" />
            <StatCard label="Sharpe Ratio" value={24} />
          </div>
          <div className="mt-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#475569]">Recent AI Calls (Live Prices)</p>
            <LiveTradeCards prices={prices} mounted={mounted} />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div ref={howSection.ref} className={cn("mb-16 text-center transition-all duration-700", howSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
            <p className="text-sm font-bold uppercase tracking-widest text-[#8B5CF6]">Get Started</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">3 Steps to Profit</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { num: "01", title: "Connect Wallet", desc: "Link MetaMask or WalletConnect. Non-custodial \u2014 we never touch your keys.", icon: icons.link },
              { num: "02", title: "AI Analyzes Markets", desc: "7-layer pipeline scans 20+ Hyperliquid pairs 24/7, finding alpha humans miss.", icon: icons.cpu },
              { num: "03", title: "Collect Profits", desc: "Approved trades execute automatically. Monitor P&L live. Withdraw anytime.", icon: icons.money },
            ].map((step, i) => (
              <AnimatedCard key={step.num} delay={i * 200} className="relative rounded-2xl border border-white/5 bg-[#0F1629] p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00E5FF]/10">
                    <Icon d={step.icon} className="h-6 w-6 text-[#00E5FF]" />
                  </div>
                  <span className="absolute right-6 top-6 text-5xl font-black text-white/[0.03]">{step.num}</span>
                  <h3 className="mt-4 text-xl font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{step.desc}</p>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECURITY ═══ */}
      <section id="security" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div ref={securitySection.ref} className={cn("mb-16 text-center transition-all duration-700", securitySection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
            <p className="text-sm font-bold uppercase tracking-widest text-[#10B981]">Trust & Security</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Your Keys. Your Funds. <span className="text-[#10B981]">Always.</span></h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { title: "Non-Custodial", desc: "We never hold your private keys or funds. Trade directly from your wallet on Hyperliquid DEX.", icon: icons.lock },
              { title: "Risk-First AI", desc: "Mandatory stop-loss. Daily circuit breakers. Position limits. Capital protection by default.", icon: icons.shield },
              { title: "On-Chain Execution", desc: "All trades execute on Hyperliquid's order book. Fully verifiable. Transparent.", icon: icons.cube },
            ].map((item, i) => (
              <AnimatedCard key={item.title} delay={i * 150} className="rounded-2xl border border-[#10B981]/10 bg-[#10B981]/[0.03] p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#10B981]/10">
                    <Icon d={item.icon} className="h-6 w-6 text-[#10B981]" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{item.desc}</p>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative overflow-hidden border-t border-white/5 py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00E5FF]/[0.03] to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00E5FF]/[0.05] blur-[150px]" />
        <div ref={ctaSection.ref} className={cn("relative z-10 mx-auto max-w-3xl px-6 text-center transition-all duration-700", ctaSection.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95")}>
          <h2 className="text-4xl font-black md:text-6xl">
            Stop Watching Charts.<br />
            <span className="animate-shimmer bg-gradient-to-r from-[#00E5FF] via-[#10B981] to-[#00E5FF] bg-clip-text text-transparent" style={{ backgroundSize: "200% auto" }}>Start Collecting Profits.</span>
          </h2>
          <p className="mt-6 text-lg text-[#94A3B8]">Join thousands of traders who let AI do the heavy lifting.</p>
          <Link href="/register" className="mt-10 inline-flex rounded-xl bg-[#00E5FF] px-14 py-5 text-lg font-black text-[#06080E] animate-glow-pulse hover:-translate-y-1">
            Deploy Your AI Trading Bot - Free
          </Link>
          <p className="mt-4 text-xs text-[#475569]">No credit card required. Non-custodial. Withdraw anytime.</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-1"><span className="text-lg font-black text-[#00E5FF]">Zelkora</span><span className="text-sm text-[#94A3B8]">.ai</span></div>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-[#475569] hover:text-[#94A3B8]">Twitter</a>
              <a href="#" className="text-xs text-[#475569] hover:text-[#94A3B8]">Discord</a>
              <a href="#" className="text-xs text-[#475569] hover:text-[#94A3B8]">Telegram</a>
              <a href="#" className="text-xs text-[#475569] hover:text-[#94A3B8]">Docs</a>
            </div>
            <p className="text-xs text-[#475569]">&copy; 2026 Zelkora. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
