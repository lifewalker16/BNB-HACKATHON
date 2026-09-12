'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoadmap, generateSummaryText, downloadTextFile, type ATSAnalysisResponse, type IssueDetail } from '@/lib/api';
import ATSGauge from '@/components/ATSGauge';
import ScoreBreakdownBars from '@/components/ScoreBreakdownBars';
import LoadingSpinner from '@/components/LoadingSpinner';
import ATSReportPrintView from '@/components/ATSReportPrintView';

type TabType = 'overview' | 'issues' | 'skills' | 'actions' | 'jd';

export default function ATSScorePage() {
  const router = useRouter();
  const [ats, setAts] = useState<ATSAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedIssue, setExpandedIssue] = useState<number | null>(0);
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    const raw = sessionStorage.getItem('ats_result');
    if (raw) {
      setAts(JSON.parse(raw));
    } else {
      router.replace('/generate');
    }
  }, [router]);

  const handleBridgeRoadmap = async () => {
    if (!ats) return;
    setLoading(true);
    const role = sessionStorage.getItem('selected_role') || 'Full Stack Developer';
    const days = Number(sessionStorage.getItem('timeline_days') || 30);
    const gaps = ats.jd_comparison?.skills_gap || ats.missing_keywords || [];
    try {
      const roadmap = await generateRoadmap({ target_role: role, timeline_days: days, skills_gap: gaps });
      sessionStorage.setItem('current_roadmap', JSON.stringify(roadmap));
      router.push(`/roadmap?id=${roadmap.roadmap_id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleDownloadSummary = () => {
    if (!ats) return;
    const summary = generateSummaryText(ats);
    downloadTextFile('ats_resume_report.txt', summary);
  };

  const toggleActionItem = (key: string) => {
    setCheckedActions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!ats) return <LoadingSpinner message="Loading results..." />;
  if (loading) return <LoadingSpinner message="Building your bridge roadmap..." />;

  const score = Math.round(ats.ATS_score ?? ats.ats_score ?? 0);
  const detailedIssues: IssueDetail[] = ats.detailed_feedback || [];
  const validationDetails = ats.skill_validation_details;
  const strengths = ats.strengths || [];
  const criticalIssues = ats.critical_issues || [];
  const suggestions = ats.suggestions || [];
  const jd = ats.jd_comparison;

  // Collect all action items for checklist tab
  const allActionItems: Array<{ id: string; issueTitle: string; severity: string; text: string }> = [];
  detailedIssues.forEach((issue, iIdx) => {
    (issue.action_items || []).forEach((act, aIdx) => {
      allActionItems.push({
        id: `act-${iIdx}-${aIdx}`,
        issueTitle: issue.issue_title,
        severity: issue.severity_level || 'Medium',
        text: act,
      });
    });
  });

  const filteredIssues = detailedIssues.filter(iss => {
    if (severityFilter === 'all') return true;
    // Normalise 'moderate' (backend) to match 'medium' filter (frontend)
    const lvl = (iss.severity_level || '').toLowerCase().replace('moderate', 'medium');
    return lvl === severityFilter;
  });

  const checkedCount = Object.values(checkedActions).filter(Boolean).length;
  const checklistProgress = allActionItems.length > 0 ? Math.round((checkedCount / allActionItems.length) * 100) : 0;

  return (
    <main style={{ minHeight: '100vh', padding: '2.5rem 1.5rem', maxWidth: 1040, margin: '0 auto' }}>
      {/* Top Navigation & Export Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
        <a href="/generate" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Back to Form
        </a>
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
          <button
            onClick={handleBridgeRoadmap}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>🗺️</span> Bridge Skill Gaps →
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="badge badge-indigo" style={{ marginBottom: '0.75rem' }}>
          📊 Complete Diagnostic Dashboard
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          ATS <span className="gradient-text">Resume Analysis Report</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 700, lineHeight: 1.5 }}>
          {ats.interpretation || "Comprehensive diagnostic assessment across formatting, keyword density, content impact, skill evidence, and ATS parser compatibility."}
        </p>
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
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span>📊</span> Overview & Score
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'issues' ? 'rgba(99,102,241,0.15)' : 'transparent',
            borderBottom: activeTab === 'issues' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'issues' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'issues' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span>🔍</span> Diagnostic Issues ({detailedIssues.length || ats.issues_summary?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'skills' ? 'rgba(99,102,241,0.15)' : 'transparent',
            borderBottom: activeTab === 'skills' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'skills' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'skills' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span>🎯</span> Skill Evidence Matrix ({validationDetails?.validated?.length || 0} verified)
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'actions' ? 'rgba(99,102,241,0.15)' : 'transparent',
            borderBottom: activeTab === 'actions' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'actions' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'actions' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span>⚡</span> Action Checklist ({checkedCount}/{allActionItems.length})
        </button>

        {jd && (
          <button
            onClick={() => setActiveTab('jd')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === 'jd' ? 'rgba(99,102,241,0.15)' : 'transparent',
              borderBottom: activeTab === 'jd' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'jd' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'jd' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <span>📋</span> JD Match ({jd.match_percentage}%)
          </button>
        )}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div>
          {/* Score & Breakdown Top Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) 1fr', gap: '1.5rem', marginBottom: '2rem', alignItems: 'stretch' }}>
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <ATSGauge score={score} />
              <div style={{ marginTop: '1rem' }}>
                <span className="badge" style={{
                  background: score >= 75 ? 'rgba(16,185,129,0.15)' : score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  color: score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444',
                  borderColor: score >= 75 ? 'rgba(16,185,129,0.3)' : score >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
                }}>
                  {score >= 75 ? '✅ Strong ATS Match' : score >= 50 ? '⚠️ Needs Optimization' : '❌ Critical Fixes Needed'}
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📈</span> Category Breakdown
              </h2>
              <ScoreBreakdownBars scores={ats.component_scores} />
            </div>
          </div>

          {/* Strengths Section */}
          {strengths.length > 0 && (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderColor: 'rgba(16,185,129,0.2)' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✨</span> What Your Resume Does Well ({strengths.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {strengths.map((str, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.86rem', color: 'var(--text-secondary)', background: 'rgba(16,185,129,0.06)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                    <span>{str}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Issues Alert Banner */}
          {criticalIssues.length > 0 && (
            <div style={{
              marginBottom: '1.5rem',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              padding: '1.25rem 1.5rem',
            }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔴</span> Critical Issues Blocking ATS ({criticalIssues.length})
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {criticalIssues.map((ci, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>✕</span>
                    <span>{ci}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prioritized Recommendations */}
          {suggestions.length > 0 && (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderColor: 'rgba(99,102,241,0.2)' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>💡</span> Prioritized Improvement Recommendations ({suggestions.length})
              </h2>
              <ol style={{ margin: 0, paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {suggestions.map((s, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Keywords Preview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {ats.missing_keywords && ats.missing_keywords.length > 0 && (
              <div className="glass-card" style={{ padding: '1.5rem', borderColor: 'rgba(239,68,68,0.2)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.8rem', color: '#ef4444' }}>
                  ❌ Missing ATS Keywords ({ats.missing_keywords.length})
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ats.missing_keywords.map(kw => (
                    <span key={kw} className="badge badge-red">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {ats.matched_keywords && ats.matched_keywords.length > 0 && (
              <div className="glass-card" style={{ padding: '1.5rem', borderColor: 'rgba(16,185,129,0.2)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.8rem', color: '#10b981' }}>
                  ✅ Matched Keywords ({ats.matched_keywords.length})
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ats.matched_keywords.slice(0, 15).map(kw => (
                    <span key={kw} className="badge badge-emerald">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: DIAGNOSTIC ISSUE CARDS ── */}
      {activeTab === 'issues' && (
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🛠️</span> Actionable Diagnostic Issues ({detailedIssues.length})
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Grouped and classified by ATS severity, location, and recommended fixes.
              </p>
            </div>

            {/* Severity Filter */}
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'high', 'medium', 'low'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setSeverityFilter(lvl)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    background: severityFilter === lvl ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                    color: severityFilter === lvl ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {filteredIssues.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredIssues.map((issue, idx) => {
                const isExpanded = expandedIssue === idx;
                const isHigh = issue.severity_level?.toLowerCase() === 'high';
                const isMed = issue.severity_level?.toLowerCase() === 'medium';

                return (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${isExpanded ? (isHigh ? '#ef4444' : isMed ? '#f59e0b' : 'var(--accent-primary)') : 'var(--border-subtle)'}`,
                      background: isExpanded ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <button
                      onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: isHigh ? 'rgba(239,68,68,0.15)' : isMed ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                          color: isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#3b82f6',
                        }}>
                          {issue.severity_level?.toUpperCase() || 'ISSUE'}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                          {issue.issue_title}
                        </span>
                        {issue.ats_impact && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            • Impact: {issue.ats_impact}
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                        <div style={{ marginBottom: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {issue.explanation}
                        </div>

                        {issue.where_it_appears && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 6 }}>
                            📍 <strong style={{ color: 'var(--text-secondary)' }}>Where it appears:</strong> {issue.where_it_appears}
                          </div>
                        )}

                        {issue.how_to_fix && (
                          <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            💡 <strong style={{ color: 'var(--accent-primary)' }}>How to fix:</strong> {issue.how_to_fix}
                          </div>
                        )}

                        {issue.action_items && issue.action_items.length > 0 && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                              Action Checklist:
                            </div>
                            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {issue.action_items.map((action, aIdx) => (
                                <li key={aIdx} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                  <span style={{ color: 'var(--accent-primary)' }}>•</span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {issue.example_improvement && (
                          <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
                              Example Improvement:
                            </div>
                            <pre style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'monospace', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                              {issue.example_improvement}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No issues matching severity &quot;{severityFilter}&quot;.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SKILL VALIDATION MATRIX ── */}
      {activeTab === 'skills' && (
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🎯</span> Skill-to-Project Evidence Matrix
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Validates whether listed skills are proven in actual project/experience descriptions vs listed in isolation.
              </p>
            </div>
            {validationDetails && (
              <span className="badge badge-indigo" style={{ fontSize: '0.85rem' }}>
                {validationDetails.validation_pct || Math.round((validationDetails.validated_count / (validationDetails.total || 1)) * 100)}% Evidence Verified
              </span>
            )}
          </div>

          {validationDetails ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✅</span> Validated in Experience / Projects ({validationDetails.validated?.length || 0})
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                  These skills have concrete proof in your resume bullet points and pass strict ATS scrutiny:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {validationDetails.validated?.map((v, i) => (
                    <div key={i} style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '6px 10px', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>{v.skill}</div>
                      {v.projects && v.projects.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          📍 {v.projects.join(', ')}
                        </div>
                      )}
                    </div>
                  )) || <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚠️</span> Unvalidated Skills ({validationDetails.unvalidated?.length || 0})
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                  These skills are mentioned in your skills section but lack project or work experience proof:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {validationDetails.unvalidated?.map((s, i) => (
                    <span key={i} className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)', fontSize: '0.82rem' }}>
                      {s}
                    </span>
                  )) || <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No skill validation data available for this resume.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: ACTION CHECKLIST ── */}
      {activeTab === 'actions' && (
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚡</span> Interactive Action Items Checklist ({allActionItems.length})
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Check off items as you revise your resume to track your progress toward a 90+ score.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: checklistProgress === 100 ? '#10b981' : 'var(--accent-primary)' }}>
                {checklistProgress}% Completed ({checkedCount}/{allActionItems.length})
              </div>
              <div style={{ width: 140, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: `${checklistProgress}%`, height: '100%', background: checklistProgress === 100 ? '#10b981' : 'var(--accent-primary)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          </div>

          {allActionItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {allActionItems.map(item => {
                const isChecked = !!checkedActions[item.id];
                const isHigh = item.severity.toLowerCase() === 'high';
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleActionItem(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: isChecked ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isChecked ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '0.88rem',
                        color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: isChecked ? 'line-through' : 'none',
                      }}>
                        {item.text}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isHigh ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                      color: isHigh ? '#ef4444' : '#f59e0b',
                    }}>
                      {item.issueTitle}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No action items detected.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: JD COMPARISON ── */}
      {activeTab === 'jd' && jd && (
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📋</span> Job Description Comparison
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Detailed keyword match and semantic overlap against your target job description.
              </p>
            </div>
            <span className="badge badge-indigo" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
              {jd.match_percentage}% Match Score
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', marginBottom: '0.8rem' }}>
                ✅ Matched JD Keywords ({jd.matched_keywords?.length || 0})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {jd.matched_keywords?.map((kw, i) => (
                  <span key={i} className="badge badge-emerald">{kw}</span>
                )) || <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.8rem' }}>
                ❌ Missing Critical JD Keywords ({jd.missing_keywords?.length || 0})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {jd.missing_keywords?.map((kw, i) => (
                  <span key={i} className="badge badge-red">{kw}</span>
                )) || <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>}
              </div>
            </div>
          </div>

          {jd.skills_gap && jd.skills_gap.length > 0 && (
            <div style={{ marginTop: '1.25rem', background: 'rgba(245,158,11,0.05)', padding: '1rem', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.4rem' }}>
                ⚠️ High Priority Skills Gap:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {jd.skills_gap.map((gap, i) => (
                  <span key={i} className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }}>
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adaptive Bridge Roadmap Footer CTA */}
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--border-accent)', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(16,185,129,0.05) 100%)', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Ready to bridge your detected skill gaps?
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: 520, margin: '0 auto 1.5rem' }}>
          We will generate a customized, community-backed roadmap to help you master every missing skill and keyword.
        </p>
        <button onClick={handleBridgeRoadmap} className="btn-primary" style={{ fontSize: '1rem', padding: '12px 36px', borderRadius: 8 }}>
          🗺️ Generate Adaptive Bridge Roadmap →
        </button>
      </div>

      {/* Print-Only Template Rendering */}
      <ATSReportPrintView ats={ats} />
    </main>
  );
}
