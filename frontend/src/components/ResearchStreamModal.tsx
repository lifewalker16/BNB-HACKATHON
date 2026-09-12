'use client';

import React from 'react';
import { type ResearchProgressEvent } from '@/lib/api';

interface Props {
  currentEvent: ResearchProgressEvent | null;
  logs: string[];
}

export default function ResearchStreamModal({ currentEvent, logs }: Props) {
  const percent = currentEvent?.percent || 20;
  const title   = currentEvent?.title || 'Initializing Research Agent...';
  const detail  = currentEvent?.detail || 'Analyzing target role parameters and career prerequisites...';
  const subreddits = currentEvent?.subreddits || ['r/developersIndia', 'r/cscareerquestions'];
  const sampleQuotes = currentEvent?.sample_quotes || [];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div className="glass-card fade-up" style={{
        maxWidth: 680,
        width: '100%',
        padding: '2.5rem',
        borderRadius: 20,
        background: 'rgba(13, 17, 23, 0.95)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Ambient Top Glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: 2,
          background: 'linear-gradient(90deg, transparent, var(--accent-primary), var(--accent-secondary), transparent)',
        }} />

        {/* Header with Pulse */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}>
              🧠
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  SkillBridge Deep Research
                </h2>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 99,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                Multi-Agent Knowledge Synthesis
              </p>
            </div>
          </div>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>
            {percent}%
          </span>
        </div>

        {/* Progress Track */}
        <div style={{
          width: '100%',
          height: 6,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 99,
          overflow: 'hidden',
          marginBottom: '1.8rem',
        }}>
          <div style={{
            width: `${percent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
            borderRadius: 99,
            transition: 'width 0.4s ease',
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)',
          }} />
        </div>

        {/* Active Stage Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '1.2rem 1.4rem',
          marginBottom: '1.5rem',
        }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {title}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {detail}
          </p>
        </div>

        {/* Subreddit Radar Chips */}
        {subreddits.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Targeted Developer Communities:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {subreddits.map((sub, i) => (
                <span key={i} style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(6, 182, 212, 0.1)',
                  color: 'var(--accent-secondary)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  📡 {sub}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Reddit Quotes Ticker */}
        {sampleQuotes.length > 0 && (
          <div style={{
            background: 'rgba(10, 11, 16, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '1rem',
            marginBottom: '1.5rem',
          }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              ⚡ Live Community Citation Retrieved:
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
              &ldquo;{sampleQuotes[0].snippet}&rdquo;
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>
              — from {sampleQuotes[0].sub}: {sampleQuotes[0].title}
            </p>
          </div>
        )}

        {/* Live Terminal Log Streams */}
        <div style={{
          background: 'rgba(5, 7, 10, 0.9)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: '10px 14px',
          maxHeight: 120,
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: 4, display: 'flex', gap: 6 }}>
              <span style={{ color: 'var(--accent-primary)' }}>›</span>
              <span>{log}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
