'use client'

import { useState, useEffect, useRef } from 'react'
import AgentNode from './agent-node'
import SuperAgentNode from './super-agent-node'
import FlowArrows from './flow-arrows'

type AgentStatus = 'pending' | 'running' | 'complete' | 'failed'
type SuperStatus = 'waiting' | 'thinking' | 'decided'

interface AgentResult {
  name: string
  icon: string
  status: AgentStatus
  signal?: 'buy' | 'sell' | 'neutral'
  confidence?: number
  reasoning?: string
}

interface SuperResult {
  status: SuperStatus
  action?: 'long' | 'short' | 'hold' | 'close'
  confidence?: number
  approved?: boolean
  reasoning?: string
  signalAlignment?: number
}

const DEFAULT_AGENTS: AgentResult[] = [
  { name: 'Fundamentals', icon: '📊', status: 'pending' },
  { name: 'Sentiment', icon: '💭', status: 'pending' },
  { name: 'Technicals', icon: '📈', status: 'pending' },
  { name: 'Macro', icon: '🌍', status: 'pending' },
  { name: 'Debate', icon: '⚔️', status: 'pending' },
  { name: 'Stat Arb', icon: '📐', status: 'pending' },
  { name: 'Trader', icon: '💰', status: 'pending' },
  { name: 'TA Strategy', icon: '🎯', status: 'pending' },
]

interface AgentOrchestrationProps {
  isRunning?: boolean
  results?: {
    agents?: AgentResult[]
    super?: SuperResult
  }
}

export default function AgentOrchestration({ isRunning = false, results }: AgentOrchestrationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [agents, setAgents] = useState<AgentResult[]>(results?.agents || DEFAULT_AGENTS)
  const [superResult, setSuperResult] = useState<SuperResult>(results?.super || { status: 'waiting' })
  const [dims, setDims] = useState({ cx: 250, cy: 220, radius: 170 })

  // Responsive center calculation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      const h = entry.contentRect.height
      setDims({
        cx: w / 2,
        cy: h / 2,
        radius: Math.min(w, h) * 0.35,
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Simulate progression when running (demo mode)
  useEffect(() => {
    if (!isRunning) return

    setAgents(DEFAULT_AGENTS.map(a => ({ ...a, status: 'pending' as AgentStatus })))
    setSuperResult({ status: 'waiting' })

    // Stagger agent starts
    const timers: ReturnType<typeof setTimeout>[] = []
    DEFAULT_AGENTS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setAgents(prev => prev.map((a, j) => j === i ? { ...a, status: 'running' } : a))
      }, 500 + i * 300))

      timers.push(setTimeout(() => {
        const signals: ('buy' | 'sell' | 'neutral')[] = ['buy', 'sell', 'neutral']
        const signal = signals[Math.floor(Math.random() * 3)]
        const conf = 0.4 + Math.random() * 0.5
        setAgents(prev => prev.map((a, j) =>
          j === i ? { ...a, status: 'complete', signal, confidence: conf, reasoning: `Analysis complete for ${a.name}` } : a
        ))
      }, 2000 + i * 400))
    })

    // Super agent thinks
    timers.push(setTimeout(() => setSuperResult({ status: 'thinking' }), 5500))

    // Super agent decides
    timers.push(setTimeout(() => {
      setSuperResult({
        status: 'decided',
        action: Math.random() > 0.5 ? 'long' : 'short',
        confidence: 0.6 + Math.random() * 0.3,
        approved: true,
        reasoning: 'Strong signal alignment across agents with favorable risk-reward.',
        signalAlignment: 6,
      })
    }, 7000))

    return () => timers.forEach(clearTimeout)
  }, [isRunning])

  // Update from external results
  useEffect(() => {
    if (results?.agents) setAgents(results.agents)
    if (results?.super) setSuperResult(results.super)
  }, [results])

  const allActive = agents.some(a => a.status === 'running' || a.status === 'complete')

  return (
    <div className="bg-[#0F1629] border border-[#1E293B] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#F8FAFC]">Agent Orchestration</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#00E5FF] animate-pulse' : 'bg-[#334155]'}`} />
          <span className="text-xs text-[#94A3B8] font-mono">
            {isRunning ? 'RUNNING' : superResult.status === 'decided' ? 'COMPLETE' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Hub-and-spoke layout */}
      <div ref={containerRef} className="relative w-full h-[460px]">
        {/* Flow arrows (SVG layer) */}
        <FlowArrows
          agentCount={8}
          centerX={dims.cx}
          centerY={dims.cy}
          radius={dims.radius}
          active={allActive}
        />

        {/* Agent nodes in a ring */}
        {agents.map((agent, i) => {
          const angle = (i / 8) * 2 * Math.PI - Math.PI / 2
          const x = dims.cx + Math.cos(angle) * dims.radius - 40
          const y = dims.cy + Math.sin(angle) * dims.radius - 40

          return (
            <div
              key={agent.name}
              className="absolute transition-all duration-500"
              style={{ left: `${x}px`, top: `${y}px`, zIndex: 10 }}
            >
              <AgentNode
                name={agent.name}
                icon={agent.icon}
                status={agent.status}
                signal={agent.signal}
                confidence={agent.confidence}
                reasoning={agent.reasoning}
                index={i}
              />
            </div>
          )
        })}

        {/* Super Agent in center */}
        <div
          className="absolute transition-all duration-500"
          style={{
            left: `${dims.cx - 64}px`,
            top: `${dims.cy - 80}px`,
            zIndex: 20,
          }}
        >
          <SuperAgentNode
            status={superResult.status}
            action={superResult.action}
            confidence={superResult.confidence}
            approved={superResult.approved}
            reasoning={superResult.reasoning}
          />
        </div>
      </div>

      {/* Signal alignment bar */}
      {superResult.status === 'decided' && superResult.signalAlignment !== undefined && (
        <div className="mt-4 px-4">
          <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
            <span>Signal Alignment</span>
            <span className="font-mono">{superResult.signalAlignment}/8 agents agree</span>
          </div>
          <div className="h-2 bg-[#06080E] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(superResult.signalAlignment / 8) * 100}%`,
                backgroundColor: superResult.signalAlignment >= 6 ? '#10B981' : superResult.signalAlignment >= 4 ? '#F59E0B' : '#F43F5E',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
