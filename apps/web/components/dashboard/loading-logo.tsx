"use client";

import { useEffect, useState } from "react";

export function LoadingLogo({ size = 64 }: { size?: number }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const r = size * 0.35;
  const cx = size / 2;
  const cy = size / 2;
  const glowIntensity = 0.5 + Math.sin(phase * 0.05) * 0.3;
  const rotation = phase;
  const pulseScale = 1 + Math.sin(phase * 0.03) * 0.08;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from ${rotation}deg, #00E5FF, #8B5CF6, #00E5FF)`,
            opacity: glowIntensity,
            filter: `blur(${size * 0.15}px)`,
            transform: `scale(${pulseScale})`,
          }}
        />

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="relative z-10"
        >
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Rotating ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="url(#logoGrad)"
            strokeWidth={2}
            strokeDasharray={`${r * 1.5} ${r * 0.7}`}
            strokeLinecap="round"
            filter="url(#glow)"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />

          {/* Counter-rotating inner ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r * 0.6}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth={1.5}
            strokeDasharray={`${r * 0.8} ${r * 1.2}`}
            strokeLinecap="round"
            opacity={0.6}
            style={{
              transform: `rotate(${-rotation * 1.5}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />

          {/* Center Z */}
          <text
            x={cx}
            y={cy + size * 0.06}
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize={size * 0.32}
            fontWeight="bold"
            fontFamily="system-ui"
            style={{
              transform: `scale(${pulseScale})`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            Z
          </text>

          {/* Orbiting dots */}
          {[0, 1, 2].map((i) => {
            const angle = ((rotation * 2 + i * 120) * Math.PI) / 180;
            const orbitR = r * 1.15;
            const dotX = cx + Math.cos(angle) * orbitR;
            const dotY = cy + Math.sin(angle) * orbitR;
            const dotSize = 2 + Math.sin(phase * 0.08 + i) * 1;
            return (
              <circle
                key={i}
                cx={dotX}
                cy={dotY}
                r={dotSize}
                fill={i === 0 ? "#00E5FF" : i === 1 ? "#8B5CF6" : "#10B981"}
                filter="url(#glow)"
              />
            );
          })}
        </svg>
      </div>

      {/* Animated text */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-[#94A3B8]">Loading</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1 w-1 rounded-full bg-[#00E5FF]"
            style={{
              opacity: Math.sin(phase * 0.08 + i * 1.2) > 0 ? 1 : 0.2,
              transform: `scale(${Math.sin(phase * 0.08 + i * 1.2) > 0 ? 1.5 : 1})`,
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingLogo size={80} />
    </div>
  );
}
