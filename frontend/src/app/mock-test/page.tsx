'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMockQuestions,
  evaluateMockAnswers,
  type MockQuestionsResponse,
  type MockEvaluateResponse,
  type MockAnswer,
} from '@/lib/api';
import MockTerminal from '@/components/MockTerminal';
import ATSGauge from '@/components/ATSGauge';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function MockTestPage() {
  const router = useRouter();

  const [nodeId,    setNodeId]    = useState('');
  const [nodeLabel, setNodeLabel] = useState('');
  const [questions, setQuestions] = useState<MockQuestionsResponse | null>(null);
  const [result,    setResult]    = useState<MockEvaluateResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    const id    = sessionStorage.getItem('mock_node_id')    || '';
    const label = sessionStorage.getItem('mock_node_label') || 'General Interview';
    setNodeId(id);
    setNodeLabel(label);

    getMockQuestions(label, 'Beginner')
      .then(data => setQuestions(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (answers: MockAnswer[]) => {
    if (!questions) return;
    setSubmitting(true);
    try {
      const eval_result = await evaluateMockAnswers(nodeId, nodeLabel, answers);
      setResult(eval_result);
      // Store remedial roadmap for the roadmap page
      if (eval_result.remedial_roadmap) {
        sessionStorage.setItem('current_roadmap', JSON.stringify(eval_result.remedial_roadmap));
      }
    } catch (e: any) {
      setError(e.message || 'Evaluation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner message="Preparing your interview questions..." />
    </div>
  );

  if (error) return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '2rem' }}>
      <p style={{ color: 'var(--accent-danger)', textAlign: 'center' }}>{error}</p>
      <button onClick={() => router.back()} className="btn-secondary">← Go Back</button>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: 760, margin: '0 auto' }}>
      <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        ← Back to Roadmap
      </button>

      {!result ? (
        <>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.3rem' }}>
            Mock Interview: <span className="gradient-text">{nodeLabel}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Answer all 5 questions. Press Ctrl+Enter to advance. Your answers will be evaluated by AI.
          </p>
          {questions && (
            <MockTerminal
              questions={questions.questions}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </>
      ) : (
        /* Results Screen */
        <div className="fade-up">
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '2rem' }}>
            Interview <span className="gradient-text">Results</span>
          </h1>

          {/* Score + Verdict */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '2rem', marginBottom: '2rem', alignItems: 'center' }}>
            <ATSGauge score={result.readiness_score} />
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Milestone Readiness
              </p>
              <h2 style={{
                fontSize: '2rem', fontWeight: 800,
                color: result.readiness_score >= 80 ? 'var(--accent-success)'
                      : result.readiness_score >= 60 ? 'var(--accent-warning)'
                      : 'var(--accent-danger)',
              }}>
                {result.overall_verdict}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 6 }}>
                {result.readiness_score >= 80 ? "You've mastered this topic. Move to the next milestone!"
                : result.readiness_score >= 60 ? "You have a good grasp but a few areas need review."
                : "Key concepts are unclear. A remedial sprint will help."}
              </p>
            </div>
          </div>

          {/* Weaknesses */}
          {result.identified_weaknesses.length > 0 && (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
                ⚠️ Areas Needing Review
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.identified_weaknesses.map(w => (
                  <span key={w} className="badge badge-amber">{w}</span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {result.remedial_roadmap && result.readiness_score < 70 && (
              <button
                onClick={() => router.push(`/roadmap?id=remedial`)}
                className="btn-primary"
                style={{ fontSize: '0.9rem' }}
              >
                🗺️ View 3-Day Remedial Sprint →
              </button>
            )}
            <button onClick={() => router.back()} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
              Back to Roadmap
            </button>
            <button onClick={() => { setResult(null); setLoading(true); setTimeout(() => setLoading(false), 100); }} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
              Retry Interview
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
