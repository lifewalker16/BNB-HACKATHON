'use client';

import React from 'react';
import type { ATSAnalysisResponse } from '@/lib/api';

interface ATSReportPrintViewProps {
  ats: ATSAnalysisResponse;
}

export default function ATSReportPrintView({ ats }: ATSReportPrintViewProps) {
  const score = Math.round(ats.ATS_score ?? ats.ats_score ?? 0);
  const detailedIssues = ats.detailed_feedback || [];
  const sv = ats.skill_validation_details;
  const strengths = ats.strengths || [];
  const jd = ats.jd_comparison;

  return (
    <div className="ats-print-container" style={{ display: 'none' }}>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .ats-print-container, .ats-print-container * {
            visibility: visible;
          }
          .ats-print-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            color: #1a202c !important;
            background: #ffffff !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          .print-page-break {
            page-break-before: always;
            margin-top: 2rem;
          }
          .print-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            background: #f8fafc;
          }
          .print-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '2px solid #4f46e5', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#1e293b' }}>
            RadarDev ATS Diagnostic Report
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
            Comprehensive Candidate Assessment & Career Optimization
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
          <div>Generated: {new Date().toLocaleDateString()}</div>
          <div style={{ fontWeight: 700, color: score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626', fontSize: 18, marginTop: 4 }}>
            ATS Score: {score}/100
          </div>
        </div>
      </div>

      {/* Report 1: Executive Summary & Category Breakdown */}
      <div className="print-card">
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px 0', color: '#334155' }}>
          1. Executive Summary & Category Breakdown
        </h2>
        <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
          {ats.interpretation || 'Your resume has been analyzed against modern ATS filtering criteria.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, textAlign: 'center' }}>
          <div style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Formatting</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{ats.component_scores.formatting}/20</div>
          </div>
          <div style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Keywords</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{ats.component_scores.keywords}/25</div>
          </div>
          <div style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Content</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{ats.component_scores.content}/25</div>
          </div>
          <div style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Skill Evidence</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{ats.component_scores.skill_validation}/15</div>
          </div>
          <div style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>ATS Compat</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{ats.component_scores.ats_compatibility}/15</div>
          </div>
        </div>
      </div>

      {/* Report 2: Strengths */}
      {strengths.length > 0 && (
        <div className="print-card">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px 0', color: '#16a34a' }}>
            2. What Your Resume Does Well ({strengths.length})
          </h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#334155' }}>
            {strengths.map((str, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{str}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Report 3: Skill Validation Breakdown */}
      {sv && (
        <div className="print-card">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px 0', color: '#334155' }}>
            3. Skill-to-Project Evidence Matrix ({sv.validation_pct || Math.round((sv.validated_count / (sv.total || 1)) * 100)}% Verified)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>
                Validated in Experience/Projects ({sv.validated?.length || 0}):
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                {sv.validated?.map(v => v.skill).join(', ') || 'None'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>
                Unvalidated Skills (Need Projects) ({sv.unvalidated?.length || 0}):
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                {sv.unvalidated?.join(', ') || 'None'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report 4: Detailed Diagnostic Feedback & Action Items */}
      {detailedIssues.length > 0 && (
        <div className="print-page-break">
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px 0', color: '#1e293b' }}>
            4. Actionable Diagnostic Issues & Fixes ({detailedIssues.length})
          </h2>

          {detailedIssues.map((issue, idx) => (
            <div key={idx} className="print-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                  {idx + 1}. {issue.issue_title}
                </span>
                <span className="print-badge" style={{
                  background: issue.severity_level?.toLowerCase() === 'high' ? '#fee2e2' : issue.severity_level?.toLowerCase() === 'medium' ? '#fef3c7' : '#e0f2fe',
                  color: issue.severity_level?.toLowerCase() === 'high' ? '#dc2626' : issue.severity_level?.toLowerCase() === 'medium' ? '#d97706' : '#0284c7',
                }}>
                  {issue.severity_level?.toUpperCase()}
                </span>
              </div>

              {issue.where_it_appears && (
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  <strong>Where:</strong> {issue.where_it_appears}
                </div>
              )}

              <p style={{ fontSize: 13, color: '#334155', margin: '4px 0 8px 0' }}>
                {issue.explanation}
              </p>

              {issue.how_to_fix && (
                <div style={{ fontSize: 12, color: '#0f172a', marginBottom: 8, background: '#f1f5f9', padding: 8, borderRadius: 4 }}>
                  <strong>How to Fix:</strong> {issue.how_to_fix}
                </div>
              )}

              {issue.action_items && issue.action_items.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Checklist:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155' }}>
                    {issue.action_items.map((act, aIdx) => (
                      <li key={aIdx}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}

              {issue.example_improvement && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 8, borderRadius: 4, marginTop: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 2 }}>Example Improvement:</div>
                  <pre style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                    {issue.example_improvement}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Report 5: Job Description Comparison */}
      {jd && (
        <div className="print-card" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px 0', color: '#334155' }}>
            5. Job Description Match Analysis ({jd.match_percentage}% Match)
          </h2>
          <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>
            <strong>Matched Keywords:</strong> {jd.matched_keywords?.join(', ') || 'None'}
          </div>
          <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 8 }}>
            <strong>Missing Keywords:</strong> {jd.missing_keywords?.join(', ') || 'None'}
          </div>
          <div style={{ fontSize: 13, color: '#d97706' }}>
            <strong>Skills Gap:</strong> {jd.skills_gap?.join(', ') || 'None'}
          </div>
        </div>
      )}
    </div>
  );
}
