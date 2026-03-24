'use client'

type SuperStatus = 'waiting' | 'thinking' | 'decided'

interface SuperAgentNodeProps {
  status: SuperStatus
  action?: 'long' | 'short' | 'hold' | 'close'
  confidence?: number
  approved?: boolean
  reasoning?: string
}

export default function SuperAgentNode({ status, action, confidence, approved, reasoning }: SuperAgentNodeProps) {
  const isDecided = status === 'decided'

  const actionColor = action === 'long' ? '#10B981' : action === 'short' ? '#F43F5E' : '#F59E0B'
  const borderColor = isDecided ? (approved ? '#10B981' : '#F43F5E') : status === 'thinking' ? '#00E5FF' : '#334155'

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main brain circle */}
      <div
        className="relative w-28 h-28 rounded-full flex items-center justify-center border-2 transition-all duration-700"
        style={{
          borderColor,
          backgroundColor: '#0F1629',
          boxShadow: status === 'thinking'
            ? '0 0 40px rgba(0,229,255,0.2), 0 0 80px rgba(0,229,255,0.05)'
            : isDecided && approved
            ? '0 0 40px rgba(16,185,129,0.2)'
            : 'none',
        }}
      >
        {status === 'thinking' ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 border-3 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-[#00E5FF] font-mono">ANALYZING</span>
          </div>
        ) : isDecided ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">{approved ? '✓' : '✗'}</span>
            <span className="text-sm font-bold font-mono" style={{ color: actionColor }}>
              {action?.toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">🧠</span>
            <span className="text-[10px] text-[#94A3B8] font-mono">WAITING</span>
          </div>
        )}

        {/* Pulse ring when thinking */}
        {status === 'thinking' && (
          <div className="absolute inset-0 rounded-full border-2 border-[#00E5FF] animate-ping opacity-20" />
        )}
      </div>

      {/* Label */}
      <span className="text-sm font-semibold text-[#F8FAFC]">Super Agent</span>

      {/* Confidence bar */}
      {isDecided && confidence !== undefined && (
        <div className="w-32">
          <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
            <span>Confidence</span>
            <span className="font-mono">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="h-2 bg-[#0F1629] rounded-full overflow-hidden border border-[#1E293B]">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${confidence * 100}%`,
                backgroundColor: confidence > 0.7 ? '#10B981' : confidence > 0.4 ? '#F59E0B' : '#F43F5E',
              }}
            />
          </div>
        </div>
      )}

      {/* Reasoning */}
      {isDecided && reasoning && (
        <p className="text-xs text-[#94A3B8] text-center max-w-[250px] leading-relaxed mt-1">
          {reasoning.slice(0, 150)}{reasoning.length > 150 ? '...' : ''}
        </p>
      )}
    </div>
  )
}
