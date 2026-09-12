'use client';

import { useEffect } from 'react';
import type { FlowNodeData, CompanyIntelligence } from '@/lib/api';
import CommunityEvidenceDrawer from './CommunityEvidenceDrawer';
import CompanyIntelligenceCard from './CompanyIntelligenceCard';
import DifficultyBadge from './DifficultyBadge';

interface Props {
  node: { id: string; data: FlowNodeData } | null;
  companyIntelligence?: CompanyIntelligence | null;
  onClose: () => void;
  onStartMockTest: (nodeId: string, nodeLabel: string) => void;
}

export default function NodeDetailsDrawer({ node, companyIntelligence, onClose, onStartMockTest }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!node) return null;

  const { label, duration_days, difficulty, project_task, citations } = node.data;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          animation: 'fade-up 0.2s ease forwards',
        }}
      />

      {/* Drawer Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 201,
        width: 'min(480px, 95vw)',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-accent)',
        overflowY: 'auto',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        animation: 'slide-in 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      }}>
        <style>{`
          @keyframes slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <DifficultyBadge difficulty={difficulty} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                ⏱ {duration_days} day{duration_days !== 1 ? 's' : ''}
              </span>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {label}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', padding: 4, lineHeight: 1 }}>
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Project Task */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              🛠 Hands-On Project
            </h3>
            <div style={{
              background: 'rgba(6, 182, 212, 0.06)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: 10,
              padding: '1rem',
              fontSize: '0.88rem',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
            }}>
              {project_task}
            </div>
          </div>

          {/* Community Evidence */}
          <CommunityEvidenceDrawer nodeTitle={label} citations={citations} />

          {/* Company Target Intelligence */}
          {companyIntelligence && (
            <div style={{ marginTop: '1.5rem' }}>
              <CompanyIntelligenceCard intel={companyIntelligence} compact />
            </div>
          )}

          {/* Mock Test CTA */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Completed this milestone? Test your knowledge:
            </p>
            <button
              onClick={() => onStartMockTest(node.id, label)}
              className="btn-primary"
              style={{ width: '100%', fontSize: '0.9rem' }}
            >
              🎯 Start Mock Interview →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
