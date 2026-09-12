'use client';

import { useEffect, useState } from 'react';

interface Props {
  score: number;        // 0–100
  size?: number;        // diameter in px, default 180
  strokeWidth?: number;
}

function scoreColor(score: number): string {
  if (score >= 75) return '#10b981'; // emerald
  if (score >= 50) return '#f59e0b'; // amber
  return '#ef4444';                  // rose
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Average';
  if (score >= 35) return 'Poor';
  return 'Critical';
}

export default function ATSGauge({ score, size = 180, strokeWidth = 12 }: Props) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const target = Math.min(100, Math.max(0, score));
    let current = 0;
    const step = target / 60; // ~1s at 60fps
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayScore(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const radius      = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress    = (displayScore / 100) * circumference;
  const color       = scoreColor(score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{
            transition: 'stroke-dashoffset 0.016s linear',
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
        {/* Center text — must counter-rotate */}
        <g style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}>
          <text
            x={size / 2}
            y={size / 2 - 8}
            textAnchor="middle"
            fill="var(--text-primary)"
            fontSize={size * 0.22}
            fontWeight="800"
            fontFamily="Inter, sans-serif"
          >
            {displayScore}
          </text>
          <text
            x={size / 2}
            y={size / 2 + 16}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize={size * 0.08}
            fontFamily="Inter, sans-serif"
          >
            / 100
          </text>
        </g>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <span style={{ color, fontWeight: 700, fontSize: '0.9rem' }}>{scoreLabel(score)}</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>ATS Score</p>
      </div>
    </div>
  );
}
