'use client'

import { useState } from 'react'

type AgentStatus = 'pending' | 'running' | 'complete' | 'failed'

interface AgentNodeProps {
  name: string
  icon: string
  status: AgentStatus
  signal?: 'buy' | 'sell' | 'neutral'
  confidence?: number
  reasoning?: string
  index: number
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  pending: 'border-[#334155] bg-[#0F1629]',
  running: 'border-[#00E5FF] bg-[#0F1629] shadow-[0_0_20px_rgba(0,229,255,0.15)]',
  complete: 'border-[#10B981] bg-[#0F1629]',
  failed: 'border-[#F43F5E] bg-[#0F1629]',
}

const SIGNAL_COLORS: Record<string, string> = {
  buy: 'text-[#10B981]',
  sell: 'text-[#F43F5E]',
  neutral: 'text-[#F59E0B]',
}

export default function AgentNode({ name, icon, status, signal, confidence, reasoning, index }: AgentNodeProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`relative flex flex-col items-center gap-2 cursor-pointer transition-all duration-300`}
      style={{ animationDelay: `${index * 150}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Agent circle */}
      <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${STATUS_COLORS[status]}`}>
        {status === 'running' ? (
          <div className="w-6 h-6 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-2xl">{icon}</span>
        )}
      </div>

      {/* Status dot */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
        status === 'complete' ? 'bg-[#10B981]' : status === 'running' ? 'bg-[#00E5FF] animate-pulse' : status === 'failed' ? 'bg-[#F43F5E]' : 'bg-[#334155]'
      }`} />

      {/* Name */}
      <span className="text-xs text-[#94A3B8] text-center max-w-[80px] leading-tight">{name}</span>

      {/* Signal badge */}
      {status === 'complete' && signal && (
        <span className={`text-xs font-mono font-bold ${SIGNAL_COLORS[signal] || 'text-[#94A3B8]'}`}>
          {signal.toUpperCase()} {confidence ? `${Math.round(confidence * 100)}%` : ''}
        </span>
      )}

      {/* Expanded card */}
      {expanded && reasoning && (
        <div className="absolute top-full mt-2 z-50 w-64 bg-[#1A2340] border border-[#1E293B] rounded-xl p-3 shadow-xl">
          <p className="text-xs text-[#E2E8F0] leading-relaxed">{reasoning}</p>
          {confidence !== undefined && (
            <div className="mt-2">
              <div className="h-1.5 bg-[#0F1629] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${confidence * 100}%`,
                    backgroundColor: confidence > 0.7 ? '#10B981' : confidence > 0.4 ? '#F59E0B' : '#F43F5E',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
