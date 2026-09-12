'use client';

import { useState, useEffect, useRef } from 'react';
import type { MockQuestion, MockAnswer } from '@/lib/api';

interface Props {
  questions:  MockQuestion[];
  onSubmit:   (answers: MockAnswer[]) => void;
  submitting: boolean;
}

function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

const TYPE_ICONS: Record<string, string> = {
  conceptual: '💡',
  practical:  '⚙️',
  debugging:  '🐛',
};

export default function MockTerminal({ questions, onSubmit, submitting }: Props) {
  const [answers,      setAnswers]      = useState<Record<string, string>>({});
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [submitted,    setSubmitted]     = useState<Record<string, boolean>>({});
  const terminalRef = useRef<HTMLDivElement>(null);

  const currentQ  = questions[currentIdx];
  const typeText  = useTypewriter(currentQ ? `Q${currentIdx + 1}: ${currentQ.text}` : '');
  const isLast    = currentIdx === questions.length - 1;
  const allAnswered = questions.every(q => (answers[q.id] || '').trim().length > 0);

  const handleNextQuestion = () => {
    if (!currentQ) return;
    setSubmitted(prev => ({ ...prev, [currentQ.id]: true }));
    if (!isLast) {
      setCurrentIdx(i => i + 1);
      setTimeout(() => terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' }), 50);
    }
  };

  const handleFinalSubmit = () => {
    const answersArray: MockAnswer[] = questions.map(q => ({
      question_id: q.id,
      answer:      answers[q.id] || '',
    }));
    onSubmit(answersArray);
  };

  return (
    <div
      ref={terminalRef}
      className="mono"
      style={{
        background:   '#0d1117',
        border:       '1px solid var(--border-subtle)',
        borderRadius: 14,
        overflow:     'hidden',
        display:      'flex',
        flexDirection: 'column',
        maxHeight:    '70vh',
        minHeight:    400,
      }}
    >
      {/* Terminal chrome */}
      <div style={{ padding: '10px 16px', background: '#161b22', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          RadarDev Mock Interview — {questions.length} Questions
        </span>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Show all submitted questions + answers */}
        {questions.slice(0, currentIdx).map((q, idx) => (
          <div key={q.id}>
            <p style={{ color: '#58a6ff', fontSize: '0.82rem', marginBottom: 4 }}>
              {TYPE_ICONS[q.type] || '❓'} Q{idx + 1}: {q.text}
            </p>
            <p style={{ color: '#3fb950', fontSize: '0.82rem', paddingLeft: 16, borderLeft: '2px solid #238636' }}>
              {'> '}{answers[q.id] || '(skipped)'}
            </p>
          </div>
        ))}

        {/* Current question with typewriter */}
        {currentQ && (
          <div>
            <p style={{ color: '#58a6ff', fontSize: '0.82rem', marginBottom: 10, minHeight: '1.2em' }}>
              {typeText}<span style={{ animation: 'blink 1s step-end infinite', color: '#58a6ff' }}>▋</span>
            </p>
            <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>

            <textarea
              autoFocus
              value={answers[currentQ.id] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  if (!isLast) handleNextQuestion(); else if (allAnswered) handleFinalSubmit();
                }
              }}
              placeholder={`${TYPE_ICONS[currentQ.type]} Type your answer... (Ctrl+Enter to continue)`}
              rows={4}
              style={{
                width: '100%',
                background:   '#161b22',
                border:       '1px solid #30363d',
                borderRadius: 8,
                color:        '#c9d1d9',
                padding:      '10px 12px',
                fontSize:     '0.82rem',
                fontFamily:   'var(--font-mono)',
                resize:       'vertical',
                outline:      'none',
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {!isLast ? (
                <button onClick={handleNextQuestion} className="btn-primary" style={{ fontSize: '0.8rem', padding: '7px 16px' }}>
                  Next → (Ctrl+Enter)
                </button>
              ) : (
                <button
                  onClick={handleFinalSubmit}
                  disabled={!allAnswered || submitting}
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '7px 20px' }}
                >
                  {submitting ? 'Evaluating...' : '🎯 Submit for Evaluation'}
                </button>
              )}
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {currentIdx + 1} / {questions.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
