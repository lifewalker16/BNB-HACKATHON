'use client';

import { useEffect, useState } from 'react';
import type { ATSComponentScores } from '@/lib/api';

interface Props {
  scores: ATSComponentScores;
  maxScores?: Record<string, number>;
}

const DEFAULT_MAX: Record<string, number> = {
  formatting:       20,
  keywords:         25,
  content:          25,
  skill_validation: 15,
  ats_compatibility: 15,
};

const LABELS: Record<string, string> = {
  formatting:        '📐 Formatting',
  keywords:          '🔑 Keywords',
  content:           '📝 Content Quality',
  skill_validation:  '✅ Skill Validation',
  ats_compatibility: '🤖 ATS Compatibility',
};

function barColor(pct: number): string {
  if (pct >= 75) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

export default function ScoreBreakdownBars({ scores, maxScores = DEFAULT_MAX }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(scores).map(([key, value]) => {
        const max = maxScores[key] || 25;
        const pct = Math.min(100, (value / max) * 100);
        const color = barColor(pct);

        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {LABELS[key] || key}
              </span>
              <span style={{ fontSize: '0.8rem', color, fontWeight: 700 }}>
                {value.toFixed(1)} / {max}
              </span>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 99,
                height: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: animated ? `${pct}%` : '0%',
                  background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                  borderRadius: 99,
                  boxShadow: `0 0 8px ${color}66`,
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
