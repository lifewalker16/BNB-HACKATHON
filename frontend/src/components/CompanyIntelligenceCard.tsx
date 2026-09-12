'use client';

import { useState } from 'react';
import type { CompanyIntelligence } from '@/lib/api';

interface Props {
  intel: CompanyIntelligence;
  compact?: boolean;
}

export default function CompanyIntelligenceCard({ intel, compact = false }: Props) {
  const [showAllThreads, setShowAllThreads] = useState(false);

  if (!intel) return null;

  const getDifficultyColor = (diff: string) => {
    const d = (diff || '').toLowerCase();
    if (d.includes('high') || d.includes('hard')) return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#f87171' };
    if (d.includes('low') || d.includes('easy')) return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399' };
    return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24' };
  };

  const diffStyle = getDifficultyColor(intel.difficulty_rating);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: 14,
        padding: compact ? '1.2rem' : '1.5rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
        backdropFilter: 'blur(10px)',
        marginBottom: '1.2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#fff',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
            }}
          >
            🏢
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
                Target Intelligence
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {intel.company_name}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {intel.salary_range_inr && (
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              💰 {intel.salary_range_inr}
            </span>
          )}
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: diffStyle.text,
              background: diffStyle.bg,
              border: `1px solid ${diffStyle.border}`,
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            🔥 {intel.difficulty_rating || 'Medium'} Bar
          </span>
        </div>
      </div>

      {/* Community Verdict */}
      {intel.community_verdict && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderLeft: '3px solid var(--accent-primary)',
            borderRadius: '0 8px 8px 0',
            padding: '0.75rem 0.9rem',
            fontSize: '0.84rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
              💬 Reddit Community Verdict
            </span>
          </div>
          {intel.community_verdict}
        </div>
      )}

      {/* Interview Rounds Chain */}
      {intel.interview_rounds && intel.interview_rounds.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🎯 Hiring Pipeline & Rounds
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {intel.interview_rounds.map((round, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{round}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Topics */}
      {intel.key_topics && intel.key_topics.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ High-Frequency Topics
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {intel.key_topics.map((topic, i) => (
              <span
                key={i}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  fontWeight: 600,
                }}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Success Tips */}
      {intel.success_tips && intel.success_tips.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💡 Candidate Success Tips
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {intel.success_tips.map((tip, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Reddit Discussions */}
      {intel.top_reddit_threads && intel.top_reddit_threads.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📡 Scraped Company Threads ({intel.top_reddit_threads.length})
            </span>
            {intel.top_reddit_threads.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllThreads(!showAllThreads)}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
              >
                {showAllThreads ? 'Show Less' : `View All (${intel.top_reddit_threads.length})`}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(showAllThreads ? intel.top_reddit_threads : intel.top_reddit_threads.slice(0, 2)).map((thread, i) => (
              <a
                key={i}
                href={thread.post_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(99, 102, 241, 0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0, 0, 0, 0.2)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f97316' }}>
                    {thread.subreddit}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ▲ {thread.upvotes || 0}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.3, marginBottom: 2 }}>
                  {thread.post_title}
                </div>
                {thread.excerpt && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    &ldquo;{thread.excerpt}&rdquo;
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
