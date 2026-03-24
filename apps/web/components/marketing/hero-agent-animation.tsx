'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ── SVG Icons (Heroicons) ──
const Ic = ({ d, className = '', style }: { d: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)

const paths = {
  chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  trending: 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941',
  brain: 'M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082',
  bolt: 'm3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z',
  shield: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
  target: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
  signal: 'M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M12 12h.008v.008H12V12Z',
  money: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75',
  cpu: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z',
  check: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
}

const AGENTS = [
  { path: paths.chart, label: 'Data', color: '#00E5FF' },
  { path: paths.trending, label: 'Trends', color: '#8B5CF6' },
  { path: paths.brain, label: 'Strategy', color: '#00E5FF' },
  { path: paths.bolt, label: 'Speed', color: '#F59E0B' },
  { path: paths.shield, label: 'Safety', color: '#10B981' },
  { path: paths.target, label: 'Target', color: '#F43F5E' },
  { path: paths.signal, label: 'Predict', color: '#8B5CF6' },
  { path: paths.money, label: 'Trade', color: '#10B981' },
]

// Desktop: viewBox 420x280, agents left (x≈40-310), converge right edge (x≈415)
const CURVES_DESKTOP = [
  'M 45  45  C 150 10,  280 75,  415 140',
  'M 130 45  C 210 5,   300 65,  415 140',
  'M 215 45  C 280 25,  345 70,  415 140',
  'M 300 45  C 340 35,  380 85,  415 140',
  'M 45  225 C 150 260, 280 205, 415 140',
  'M 130 225 C 210 270, 300 215, 415 140',
  'M 215 225 C 280 255, 345 210, 415 140',
  'M 300 225 C 340 245, 380 195, 415 140',
]

// Mobile curves: vertical, agents above, super below
const CURVES_MOBILE = [
  'M 60 55  C 60 120, 160 150, 160 200',
  'M 130 55 C 130 110, 160 140, 160 200',
  'M 200 55 C 200 110, 160 140, 160 200',
  'M 270 55 C 270 120, 160 150, 160 200',
  'M 60 115 C 60 160, 160 180, 160 200',
  'M 130 115 C 130 160, 160 175, 160 200',
  'M 200 115 C 200 160, 160 175, 160 200',
  'M 270 115 C 270 160, 160 180, 160 200',
]

export default function HeroAgentAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !visible) setVisible(true) },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const t = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 4200),
    ]
    return () => t.forEach(clearTimeout)
  }, [visible])

  return (
    <section ref={ref} className="relative py-16 md:py-24 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-8 md:mb-14 px-4">
        <p className="text-sm font-bold uppercase tracking-widest text-[#00E5FF] mb-3">Parallel Intelligence</p>
        <h2 className="text-3xl md:text-5xl font-black text-[#F8FAFC] mb-4">
          8 AI Agents. <span className="text-[#00E5FF]">One Decision.</span>
        </h2>
        <p className="text-[#94A3B8] text-base md:text-lg max-w-2xl mx-auto">
          Every trade is analyzed simultaneously by 8 specialized AI agents,
          then synthesized by a Super Agent into one clear action.
        </p>
      </div>

      {/* ═══ DESKTOP PIPELINE (lg+) ═══ */}
      <div className="hidden lg:block mx-auto px-4">

        {/* Row 1: Agent grid (left) + SVG curves → Super Agent (right) + Trade Card */}
        <div className="flex items-center justify-center gap-0 flex-nowrap">

          {/* Left column: agents + SVG curves */}
          <div className="relative shrink-0" style={{ width: 420, height: 280 }}>
            {/* SVG curved flow lines + particles */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 280" preserveAspectRatio="xMidYMid meet">
              {CURVES_DESKTOP.map((d, i) => (
                <g key={i}>
                  <path d={d} fill="none" stroke={AGENTS[i].color} strokeWidth="1" strokeOpacity={phase >= 3 ? 0.25 : 0}
                    style={{ transition: 'stroke-opacity 0.8s' }} />
                  <path id={`curve${i}`} d={d} fill="none" stroke="none" />
                  {phase >= 3 && (
                    <circle r="3.5" fill={AGENTS[i].color} opacity="0.9">
                      <animateMotion dur={`${1.8 + i * 0.12}s`} repeatCount="indefinite" begin={`${i * 0.18}s`}>
                        <mpath href={`#curve${i}`} />
                      </animateMotion>
                    </circle>
                  )}
                  {phase >= 3 && (
                    <circle r="2" fill="#00E5FF" opacity="0.4">
                      <animateMotion dur={`${2.5 + i * 0.1}s`} repeatCount="indefinite" begin={`${0.6 + i * 0.12}s`}>
                        <mpath href={`#curve${i}`} />
                      </animateMotion>
                    </circle>
                  )}
                </g>
              ))}
            </svg>

            {/* Agent nodes — top row */}
            <div className="absolute top-2 left-2 flex gap-4">
              {AGENTS.slice(0, 4).map((a, i) => (
                <AgentNode key={a.label} agent={a} index={i} active={phase >= 2} />
              ))}
            </div>

            {/* Agent nodes — bottom row */}
            <div className="absolute bottom-2 left-2 flex gap-4">
              {AGENTS.slice(4).map((a, i) => (
                <AgentNode key={a.label} agent={a} index={i + 4} active={phase >= 2} />
              ))}
            </div>
          </div>

          {/* Center: Super Agent */}
          <div className="shrink-0 z-10 mx-4">
            <SuperNode phase={phase} />
          </div>

          {/* Right: Trade Output Card */}
          <div className="shrink-0 relative z-30">
            <TradeOutputCard phase={phase} />
          </div>
        </div>
      </div>

      {/* ═══ MOBILE PIPELINE (< lg) ═══ */}
      <div className="lg:hidden max-w-sm mx-auto px-4">
        <div className="relative" style={{ height: 420 }}>

          {/* SVG curved lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 300" preserveAspectRatio="xMidYMid meet">
            {CURVES_MOBILE.map((d, i) => (
              <g key={i}>
                <path d={d} fill="none" stroke={AGENTS[i].color} strokeWidth="1" strokeOpacity={phase >= 3 ? 0.25 : 0}
                  style={{ transition: 'stroke-opacity 0.8s' }} />
                <path id={`mcurve${i}`} d={d} fill="none" stroke="none" />
                {phase >= 3 && (
                  <circle r="2.5" fill={AGENTS[i].color} opacity="0.8">
                    <animateMotion dur={`${1.5 + i * 0.1}s`} repeatCount="indefinite" begin={`${i * 0.15}s`}>
                      <mpath href={`#mcurve${i}`} />
                    </animateMotion>
                  </circle>
                )}
              </g>
            ))}
          </svg>

          {/* Agent grid — 4×2 */}
          <div className="relative z-10 grid grid-cols-4 gap-2 px-1">
            {AGENTS.map((a, i) => (
              <AgentNode key={a.label} agent={a} index={i} active={phase >= 2} small />
            ))}
          </div>

          {/* Super Agent — centered below */}
          <div className="relative z-10 flex flex-col items-center mt-20">
            <SuperNode phase={phase} />
          </div>
        </div>

        {/* Trade card below on mobile */}
        <div className="mt-4">
          <TradeOutputCard phase={phase} />
        </div>
      </div>
    </section>
  )
}

// ── Agent Node ──
function AgentNode({ agent, index, active, small }: {
  agent: typeof AGENTS[0]; index: number; active: boolean; small?: boolean
}) {
  const size = small ? 'w-11 h-11' : 'w-14 h-14'
  const iconSize = small ? 'w-5 h-5' : 'w-6 h-6'
  return (
    <div className="flex flex-col items-center gap-1.5 transition-all"
      style={{
        opacity: active ? 1 : 0.1,
        transform: active ? 'scale(1)' : 'scale(0.6)',
        transition: `all 0.4s ease-out ${index * 80}ms`,
      }}>
      <div className={`${size} rounded-xl border flex items-center justify-center transition-all duration-500`}
        style={{
          borderColor: active ? agent.color : '#1E293B',
          backgroundColor: active ? `${agent.color}0D` : '#0F1629',
          boxShadow: active ? `0 0 16px ${agent.color}1A` : 'none',
        }}>
        <Ic d={agent.path} className={`${iconSize} transition-colors duration-500`}
          style={{ color: active ? agent.color : '#334155' }} />
      </div>
      <span className="text-[9px] sm:text-[10px] text-[#94A3B8] font-medium">{agent.label}</span>
    </div>
  )
}

// ── Super Agent Node ──
function SuperNode({ phase }: { phase: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center transition-all duration-700"
        style={{
          borderColor: phase >= 4 ? '#10B981' : phase >= 3 ? '#00E5FF' : '#1E293B',
          backgroundColor: phase >= 4 ? '#10B98110' : '#0F1629',
          boxShadow: phase >= 4
            ? '0 0 40px rgba(16,185,129,0.25), 0 0 80px rgba(16,185,129,0.08)'
            : phase >= 3 ? '0 0 30px rgba(0,229,255,0.15)' : 'none',
        }}>
        {phase >= 4 ? (
          <Ic d={paths.check} className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#10B981' }} />
        ) : phase >= 3 ? (
          <div className="w-6 h-6 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
        ) : (
          <Ic d={paths.cpu} className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: '#334155' }} />
        )}
        {phase >= 4 && (
          <div className="absolute inset-0 rounded-2xl border-2 border-[#10B981] animate-[decisionRing_1.5s_ease-out_forwards]" />
        )}
      </div>
      <span className="text-xs font-semibold text-[#F8FAFC]">Super Agent</span>
    </div>
  )
}

// ── Live Trade Output Card — always shows profit ──
const DEMO_SIGNALS = [
  { side: 'LONG', ticker: 'BTC', entry: 70580, sl: 68200, tp: 74800, size: 650 },
  { side: 'SHORT', ticker: 'ETH', entry: 2134, sl: 2210, tp: 1980, size: 420 },
  { side: 'LONG', ticker: 'SOL', entry: 98.3, sl: 93.5, tp: 108.5, size: 300 },
  { side: 'LONG', ticker: 'BTC', entry: 69250, sl: 67100, tp: 73400, size: 550 },
  { side: 'SHORT', ticker: 'ETH', entry: 2180, sl: 2260, tp: 2040, size: 380 },
]

function TradeOutputCard({ phase }: { phase: number }) {
  const [tick, setTick] = useState(0)
  const [sigIdx, setSigIdx] = useState(0)

  useEffect(() => {
    if (phase < 4) return
    const iv = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(iv)
  }, [phase])

  // Cycle signal every ~20s
  useEffect(() => {
    if (phase < 4) return
    const iv = setInterval(() => setSigIdx(i => (i + 1) % DEMO_SIGNALS.length), 20000)
    return () => clearInterval(iv)
  }, [phase])

  const sig = DEMO_SIGNALS[sigIdx]
  const isLong = sig.side === 'LONG'

  // Price always moves in profitable direction, growing over time
  const drift = tick * 0.12 + Math.abs(Math.sin(tick * 0.3)) * 0.8
  const pnlPct = Math.round((0.15 + drift) * 100) / 100
  const priceMove = sig.entry * (pnlPct / 100) * (isLong ? 1 : -1)
  const currentPrice = sig.entry + Math.round(priceMove * 100) / 100
  const conf = 76 + Math.round(Math.abs(Math.sin(tick * 0.5)) * 8)
  const color = '#10B981' // always green — always profit

  return (
    <div className="transition-all duration-700"
      style={{
        opacity: phase >= 4 ? 1 : 0,
        transform: phase >= 4 ? 'translateX(0) scale(1)' : 'translateX(16px) scale(0.9)',
      }}>
      <div className={`bg-[#0F1629] border border-[#10B981]/30 rounded-xl p-3.5 w-[210px] shadow-lg shadow-[#10B981]/5`}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs font-bold font-mono" style={{ color }}>
              {sig.side} {sig.ticker}
            </span>
          </div>
          <span className="text-[9px] text-[#94A3B8] font-mono">LIVE</span>
        </div>
        <div className="space-y-1 font-mono text-[11px]">
          <TRow label="Entry" value={`$${sig.entry.toLocaleString()}`} color="#F8FAFC" />
          <TRow label="Now" value={`$${currentPrice.toLocaleString()}`} color={color} live />
          <TRow label="Stop Loss" value={`$${sig.sl.toLocaleString()}`} color="#F43F5E" />
          <TRow label="Take Profit" value={`$${sig.tp.toLocaleString()}`} color="#10B981" />
          <TRow label="Size" value={`$${sig.size}`} color="#F8FAFC" />
          <div className="pt-1.5 mt-1 border-t border-[#1E293B] flex justify-between">
            <span className="text-[#94A3B8]">Confidence</span>
            <span className="text-[#00E5FF] font-bold tabular-nums">{conf}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">PnL</span>
            <span className="font-bold tabular-nums text-[#10B981]">+{pnlPct.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TRow({ label, value, color, live }: { label: string; value: string; color: string; live?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#94A3B8]">{label}</span>
      <span className={`tabular-nums ${live ? 'transition-all duration-300' : ''}`} style={{ color }}>{value}</span>
    </div>
  )
}
