'use client'

interface FlowArrowsProps {
  agentCount: number
  centerX: number
  centerY: number
  radius: number
  active: boolean
}

export default function FlowArrows({ agentCount, centerX, centerY, radius, active }: FlowArrowsProps) {
  const arrows = Array.from({ length: agentCount }, (_, i) => {
    const angle = (i / agentCount) * 2 * Math.PI - Math.PI / 2
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius
    return { x, y, index: i }
  })

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <defs>
        <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {arrows.map(({ x, y, index }) => (
        <line
          key={index}
          x1={x}
          y1={y}
          x2={centerX}
          y2={centerY}
          stroke="url(#arrowGrad)"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity={active ? 0.7 : 0.2}
          className="transition-opacity duration-500"
          style={{
            animation: active ? `dashFlow 1.5s linear infinite` : 'none',
            animationDelay: `${index * 100}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes dashFlow {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </svg>
  )
}
