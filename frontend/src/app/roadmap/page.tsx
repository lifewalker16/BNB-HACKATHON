'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getRoadmap, type RoadmapResponse, type FlowNode } from '@/lib/api';
import dynamic from 'next/dynamic';
import NodeDetailsDrawer from '@/components/NodeDetailsDrawer';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudyPlanView from '@/components/StudyPlanView';
import CompanyIntelligenceCard from '@/components/CompanyIntelligenceCard';

const RoadmapDAG = dynamic(() => import('@/components/RoadmapDAG'), { ssr: false });

function RoadmapContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const roadmapId    = searchParams.get('id');

  const [roadmap, setRoadmap]           = useState<RoadmapResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [activeTab, setActiveTab]       = useState<'graph' | 'syllabus'>('graph');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  useEffect(() => {
    const loadRoadmap = async () => {
      // Try session storage first (instant, no network)
      const cached = sessionStorage.getItem('current_roadmap');
      if (cached) {
        try {
          const parsed: RoadmapResponse = JSON.parse(cached);
          if (!roadmapId || parsed.roadmap_id === roadmapId) {
            setRoadmap(parsed);
            setLoading(false);
            return;
          }
        } catch {
          // ignore parsing error and proceed to fetch
        }
      }
      // Fall back to fetching from API
      if (!roadmapId) { router.replace('/generate'); return; }
      try {
        const data = await getRoadmap(roadmapId);
        setRoadmap(data);
      } catch (e: any) {
        setError(e.message || 'Failed to load roadmap');
      } finally {
        setLoading(false);
      }
    };
    loadRoadmap();
  }, [roadmapId, router]);

  const handleStartMockTest = useCallback((nodeId: string, nodeLabel: string) => {
    sessionStorage.setItem('mock_node_id', nodeId);
    sessionStorage.setItem('mock_node_label', nodeLabel);
    router.push('/mock-test');
  }, [router]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner message="Loading your roadmap..." />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: 'var(--accent-danger)', fontSize: '1rem' }}>{error}</p>
      <button onClick={() => router.push('/generate')} className="btn-secondary">← Go Back</button>
    </div>
  );

  if (!roadmap) return null;

  const totalDays = roadmap.nodes.reduce((acc, n) => acc + (n.data?.duration_days || 0), 0);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.8rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 11, 16, 0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 10,
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Back
          </button>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {roadmap.target_role} Roadmap
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
              {roadmap.total_nodes} milestones · {totalDays} days · {roadmap.total_weeks} weeks
              {roadmap.community_backing && <span style={{ color: 'var(--accent-secondary)', marginLeft: 8 }}>📡 Community-backed</span>}
            </p>
          </div>
        </div>

        {/* Dual-View Switcher Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: 3,
          background: 'var(--bg-secondary)',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => setActiveTab('graph')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'graph' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'graph' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            🗺️ Visual Graph
          </button>
          <button
            onClick={() => setActiveTab('syllabus')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'syllabus' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'syllabus' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            📋 Deep Study Syllabus
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {roadmap.company_intelligence && (
            <button
              onClick={() => setShowCompanyModal(true)}
              style={{
                fontSize: '0.8rem',
                padding: '6px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#c084fc',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
              }}
            >
              🏢 {roadmap.company_intelligence.company_name} Intel
            </button>
          )}

          <button onClick={() => router.push('/generate')} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '7px 14px' }}>
            New Roadmap
          </button>
        </div>
      </div>

      {/* ── Main View Container ── */}
      {activeTab === 'graph' ? (
        <div style={{ flex: 1, position: 'relative' }}>
          <RoadmapDAG
            nodes={roadmap.nodes}
            edges={roadmap.edges}
            onNodeClick={setSelectedNode}
          />

          {/* Legend */}
          <div style={{
            position: 'absolute', top: 16, left: 16, zIndex: 5,
            background: 'rgba(10, 11, 16, 0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)', borderRadius: 10,
            padding: '10px 14px', fontSize: '0.72rem', color: 'var(--text-muted)',
          }}>
            <p style={{ marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Legend</p>
            {[['📡', 'Has Reddit Citations'], ['⏱', 'Duration (days)'], ['🎯', 'Click to mock test']].map(([icon, label]) => (
              <p key={label} style={{ margin: '3px 0' }}>{icon} {label}</p>
            ))}
          </div>

          {/* Node Details Drawer */}
          <NodeDetailsDrawer
            node={selectedNode}
            companyIntelligence={roadmap.company_intelligence}
            onClose={() => setSelectedNode(null)}
            onStartMockTest={handleStartMockTest}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <StudyPlanView roadmap={roadmap} />
        </div>
      )}

      {/* Company Intelligence Modal */}
      {showCompanyModal && roadmap.company_intelligence && (
        <div
          onClick={() => setShowCompanyModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 620,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 16,
              animation: 'fade-up 0.2s ease forwards',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                onClick={() => setShowCompanyModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                }}
              >
                ×
              </button>
            </div>
            <CompanyIntelligenceCard intel={roadmap.company_intelligence} />
          </div>
        </div>
      )}

    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading your roadmap..." />
      </div>
    }>
      <RoadmapContent />
    </Suspense>
  );
}
