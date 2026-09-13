'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMockQuestions,
  evaluateMockAnswers,
  generateMockSummaryText,
  downloadTextFile,
  type MockQuestionsResponse,
  type MockEvaluateResponse,
  type MockAnswer,
} from '@/lib/api';
import MockTerminal from '@/components/MockTerminal';
import ATSGauge from '@/components/ATSGauge';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function MockTestPage() {
  const router = useRouter();

  const [nodeId, setNodeId] = useState('');
  const [nodeLabel, setNodeLabel] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [syllabusContext, setSyllabusContext] = useState('');
  const [questions, setQuestions] = useState<MockQuestionsResponse | null>(null);
  const [result, setResult] = useState<MockEvaluateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Diagnostic Report UI States
  const [activeTab, setActiveTab] = useState<'overview' | 'deep_dive' | 'checklist'>('overview');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = sessionStorage.getItem('mock_node_id') || 'milestone';
    const label = sessionStorage.getItem('mock_node_label') || 'Technical Assessment';
    const role = sessionStorage.getItem('mock_target_role') || '';
    const syllabus = sessionStorage.getItem('mock_syllabus_context') || '';

    setNodeId(id);
    setNodeLabel(label);
    setTargetRole(role);
    setSyllabusContext(syllabus);

    getMockQuestions(label, 'Beginner', syllabus, role)
      .then(data => setQuestions(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (answers: MockAnswer[]) => {
    if (!questions) return;
    setSubmitting(true);
    try {
      const eval_result = await evaluateMockAnswers(
        nodeId,
        nodeLabel,
        answers,
        syllabusContext,
        targetRole,
        'Beginner'
      );
      setResult(eval_result);
      // Store remedial roadmap if available
      if (eval_result.remedial_roadmap) {
        sessionStorage.setItem('current_roadmap', JSON.stringify(eval_result.remedial_roadmap));
      }
    } catch (e: any) {
      setError(e.message || 'Evaluation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleDownloadSummary = () => {
    if (!result) return;
    const summary = generateMockSummaryText(result, nodeLabel);
    downloadTextFile(`mock_interview_evaluation_${nodeLabel.toLowerCase().replace(/\s+/g, '_')}.txt`, summary);
  };

  const toggleActionItem = (id: string) => {
    setCheckedActions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner message={`Preparing syllabus-grounded interview questions for ${nodeLabel}...`} />
    </div>
  );

  if (error) return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '2rem' }}>
      <p style={{ color: 'var(--accent-danger)', textAlign: 'center', fontWeight: 600 }}>{error}</p>
      <button onClick={() => router.back()} className="btn-secondary">← Go Back</button>
    </main>
  );

  const actionItems = result?.action_checklist || [];
  const checkedCount = Object.values(checkedActions).filter(Boolean).length;
  const checklistProgress = actionItems.length > 0 ? Math.round((checkedCount / actionItems.length) * 100) : 0;

  return (
    <main style={{ minHeight: '100vh', padding: '2.5rem 1.5rem', maxWidth: 960, margin: '0 auto' }}>
      
      {/* ── Pre-Evaluation Screen: Interactive Mock Terminal ── */}
      {!result ? (
        <>
          <button
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← Back to Roadmap
          </button>

          <div style={{ marginBottom: '1.5rem' }}>
            <div className="badge badge-indigo" style={{ marginBottom: '0.6rem' }}>
              🎯 Syllabus Milestone Assessment
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
              Mock Technical Interview: <span className="gradient-text">{nodeLabel}</span>
            </h1>
            {syllabusContext && (
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginBottom: '0.6rem' }}>
                ✨ Questions generated directly from your active weekly study schedule & community gotchas.
              </p>
            )}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Answer all 5 questions. Press <strong>Ctrl + Enter</strong> to advance. Your answers will receive detailed diagnostic grading.
            </p>
          </div>

          {questions && (
            <MockTerminal
              questions={questions.questions}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </>
      ) : (
        /* ── Post-Evaluation: Full Diagnostic Dashboard ── */
        <div className="fade-up">

          {/* Top Navigation & Export Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ← Back to Roadmap
            </button>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportPDF}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>📑</span> Export as PDF Report
              </button>
              <button
                onClick={handleDownloadSummary}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>📄</span> Download Summary (.txt)
              </button>
              {result.remedial_roadmap && result.readiness_score < 70 && (
                <button
                  onClick={() => router.push(`/roadmap?id=remedial`)}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span>🗺️</span> 3-Day Remedial Sprint →
                </button>
              )}
            </div>
          </div>

          {/* Header Banner */}
          <div style={{ marginBottom: '2rem' }}>
            <div className="badge badge-indigo" style={{ marginBottom: '0.75rem' }}>
              📊 Complete Milestone Diagnostic
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Technical Interview <span className="gradient-text">Evaluation Report</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 750, lineHeight: 1.5 }}>
              {result.executive_summary || `Comprehensive assessment on ${nodeLabel} evaluating conceptual depth, practical implementation, and debugging trade-offs.`}
            </p>
          </div>

          {/* Diagnostic Metrics Grid */}
          <div className="glass-card" style={{
            padding: '2rem',
            borderRadius: 16,
            marginBottom: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            alignItems: 'center',
          }}>
            {/* Readiness Gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ATSGauge score={result.readiness_score} />
              <span style={{
                marginTop: 10,
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '4px 12px',
                borderRadius: 20,
                background: result.readiness_score >= 80 ? 'rgba(16, 185, 129, 0.15)' : result.readiness_score >= 60 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: result.readiness_score >= 80 ? 'var(--accent-success)' : result.readiness_score >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                border: `1px solid ${result.readiness_score >= 80 ? 'rgba(16, 185, 129, 0.3)' : result.readiness_score >= 60 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}>
                Verdict: {result.overall_verdict}
              </span>
            </div>

            {/* Category Breakdown Progress Bars */}
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.2rem' }}>
                Skill Competency Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { key: 'conceptual', label: '🧠 Conceptual Mastery', score: result.category_scores?.conceptual ?? result.readiness_score },
                  { key: 'practical', label: '🛠️ Practical Implementation', score: result.category_scores?.practical ?? Math.max(0, result.readiness_score - 5) },
                  { key: 'debugging', label: '🐞 Scenario & Debugging', score: result.category_scores?.debugging ?? Math.max(0, result.readiness_score - 10) },
                  { key: 'communication', label: '💬 Technical Clarity', score: result.category_scores?.communication ?? Math.min(100, result.readiness_score + 5) },
                ].map((cat) => (
                  <div key={cat.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{cat.label}</span>
                      <span style={{ fontWeight: 800, color: cat.score >= 75 ? 'var(--accent-success)' : cat.score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>
                        {Math.round(cat.score)}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, cat.score))}%`,
                        height: '100%',
                        background: cat.score >= 75 ? 'var(--accent-success)' : cat.score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                        borderRadius: 3,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: 8,
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '2rem',
            overflowX: 'auto',
            paddingBottom: 4,
          }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '10px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: activeTab === 'overview' ? 'rgba(99,102,241,0.15)' : 'transparent',
                borderBottom: activeTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'overview' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📊</span> Overview & Insights
            </button>
            <button
              onClick={() => setActiveTab('deep_dive')}
              style={{
                padding: '10px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: activeTab === 'deep_dive' ? 'rgba(99,102,241,0.15)' : 'transparent',
                borderBottom: activeTab === 'deep_dive' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'deep_dive' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'deep_dive' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🔍</span> Question Deep Dive ({result.detailed_questions?.length || 5})
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              style={{
                padding: '10px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: activeTab === 'checklist' ? 'rgba(99,102,241,0.15)' : 'transparent',
                borderBottom: activeTab === 'checklist' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'checklist' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'checklist' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📋</span> Action Checklist ({actionItems.length})
            </button>
          </div>

          {/* ── TAB 1: Overview & Insights ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Strengths & Critical Gaps Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* Strengths Card */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>✅</span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--accent-success)' }}>
                      Demonstrated Strengths
                    </h3>
                  </div>
                  {result.strengths && result.strengths.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.strengths.map((s, idx) => (
                        <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                      Solid effort. Continue refining technical depth to establish clear standout strengths.
                    </p>
                  )}
                </div>

                {/* Critical Gaps Card */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#f87171' }}>
                      Identified Knowledge Gaps
                    </h3>
                  </div>
                  {result.critical_gaps && result.critical_gaps.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.critical_gaps.map((g, idx) => (
                        <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {g}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                      No critical blockers identified for this milestone level!
                    </p>
                  )}
                </div>
              </div>

              {/* Weakness Tags */}
              {result.identified_weaknesses && result.identified_weaknesses.length > 0 && (
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 14 }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--text-primary)' }}>
                    🏷️ Priority Review Topics
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.identified_weaknesses.map(w => (
                      <span key={w} className="badge badge-amber" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Remedial Roadmap Banner */}
              {result.remedial_roadmap && result.readiness_score < 70 && (
                <div style={{
                  padding: '1.8rem',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', marginBottom: 4 }}>
                      🚀 3-Day Targeted Remedial Sprint Generated
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 600 }}>
                      Our AI created a focused 3-day recovery sprint addressing precisely the weak topics identified in this assessment.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/roadmap?id=remedial')}
                    className="btn-primary"
                    style={{ padding: '10px 20px', fontSize: '0.85rem' }}
                  >
                    Launch Remedial Plan →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: Question Deep Dive ── */}
          {activeTab === 'deep_dive' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {result.detailed_questions && result.detailed_questions.length > 0 ? (
                result.detailed_questions.map((dq, idx) => {
                  const isExpanded = expandedQuestion === idx;
                  const scoreColor = dq.score >= 80 ? 'var(--accent-success)' : dq.score >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)';
                  return (
                    <div
                      key={dq.question_id || idx}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        borderRadius: 14,
                        border: isExpanded ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Card Header */}
                      <div
                        onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: 8 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--text-primary)',
                          }}>
                            Q{idx + 1}
                          </span>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--accent-primary)',
                          }}>
                            {dq.question_type}
                          </span>
                          <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            {dq.tested_concept || `Question ${idx + 1}`}
                          </h4>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: scoreColor }}>
                            {dq.score}/100
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontWeight: 700,
                            background: dq.score >= 80 ? 'rgba(16, 185, 129, 0.12)' : dq.score >= 60 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: scoreColor,
                          }}>
                            {dq.verdict}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '1rem', marginBottom: '0.8rem' }}>
                        {dq.question_text}
                      </p>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                          
                          {/* Candidate Answer */}
                          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, marginBottom: 4 }}>
                              Your Answer:
                            </p>
                            <p style={{ fontSize: '0.85rem', color: dq.user_answer ? 'var(--text-secondary)' : 'var(--text-muted)', margin: 0, fontStyle: dq.user_answer ? 'normal' : 'italic' }}>
                              {dq.user_answer || '(No answer provided)'}
                            </p>
                          </div>

                          {/* Ideal Benchmark Answer */}
                          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', margin: 0, marginBottom: 4 }}>
                              💡 Ideal Benchmark Answer:
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                              {dq.ideal_answer}
                            </p>
                          </div>

                          {/* Strengths & Missing Points */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                            {dq.strengths && dq.strengths.length > 0 && (
                              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-success)', margin: 0, marginBottom: 4 }}>
                                  ✅ Key Concepts Covered:
                                </p>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {dq.strengths.map((st, sidx) => <li key={sidx}>{st}</li>)}
                                </ul>
                              </div>
                            )}

                            {dq.missing_points && dq.missing_points.length > 0 && (
                              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', margin: 0, marginBottom: 4 }}>
                                  ❌ Key Concepts Missed:
                                </p>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {dq.missing_points.map((mp, midx) => <li key={midx}>{mp}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Evaluator Feedback & Coaching */}
                          {dq.feedback && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                              <strong>Coaching Note:</strong> {dq.feedback}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No detailed question breakdown available.</p>
              )}
            </div>
          )}

          {/* ── TAB 3: Action Checklist ── */}
          {activeTab === 'checklist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Progress Card */}
              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Revision Action Progress
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {checkedCount} of {actionItems.length} completed ({checklistProgress}%)
                  </span>
                </div>
                <div style={{ height: 8, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${checklistProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-success) 100%)',
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>

              {/* Checklist Items */}
              {actionItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {actionItems.map((item, idx) => {
                    const isChecked = !!checkedActions[item.id || `act-${idx}`];
                    const sevColor = item.severity?.toLowerCase() === 'high' ? 'var(--accent-danger)' : item.severity?.toLowerCase() === 'medium' ? 'var(--accent-warning)' : 'var(--accent-primary)';
                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => toggleActionItem(item.id || `act-${idx}`)}
                        className="glass-card"
                        style={{
                          padding: '14px 16px',
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          cursor: 'pointer',
                          background: isChecked ? 'rgba(16, 185, 129, 0.06)' : undefined,
                          borderColor: isChecked ? 'rgba(16, 185, 129, 0.3)' : undefined,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: sevColor,
                              textTransform: 'uppercase',
                            }}>
                              {item.severity || 'Medium'} Priority
                            </span>
                            {item.recommended_study_day && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                                📅 {item.recommended_study_day}
                              </span>
                            )}
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {item.topic}
                            </span>
                          </div>
                          <p style={{
                            fontSize: '0.85rem',
                            color: isChecked ? 'var(--text-muted)' : 'var(--text-secondary)',
                            textDecoration: isChecked ? 'line-through' : 'none',
                            margin: 0,
                            lineHeight: 1.5,
                          }}>
                            {item.action_text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No specific revision tasks generated.</p>
              )}
            </div>
          )}

          {/* Bottom Actions Toolbar */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setResult(null);
                setLoading(true);
                setTimeout(() => setLoading(false), 100);
              }}
              className="btn-primary"
              style={{ fontSize: '0.88rem' }}
            >
              🔄 Retake Assessment
            </button>
            <button
              onClick={() => router.back()}
              className="btn-secondary"
              style={{ fontSize: '0.88rem' }}
            >
              ← Back to Study Plan
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

