'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { checkHealth } from '@/lib/api';

const ROLES = ['Cyber Security', 'DevOps Engineer', 'Frontend Developer', 'AI/ML Engineer', 'Full Stack Developer'];

export default function HomePage() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [roleIdx, setRoleIdx] = useState(0);

  // Check backend health on mount and poll periodically
  useEffect(() => {
    let mounted = true;
    const runCheck = () => {
      checkHealth()
        .then(() => { if (mounted) setBackendOk(true); })
        .catch(() => { if (mounted) setBackendOk(false); });
    };

    runCheck();
    const interval = setInterval(runCheck, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Cycle through role names
  useEffect(() => {
    const t = setInterval(() => setRoleIdx(i => (i + 1) % ROLES.length), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.2rem 2.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10, 11, 16, 0.8)',
      }}>
        <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
          <span className="gradient-text">RadarDev</span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem', marginLeft: 8 }}>
            SkillBridge AI
          </span>
        </span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: backendOk === true ? '#10b981' : backendOk === false ? '#ef4444' : '#f59e0b',
            boxShadow: backendOk === true ? '0 0 8px #10b981' : 'none',
          }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            {backendOk === true ? 'API Online' : backendOk === false ? 'API Offline' : 'Checking...'}
          </span>
          <Link href="/ai-agent-hub" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.82rem', textDecoration: 'none', borderRadius: 8 }}>
            AI Agents
          </Link>
          <Link href="/generate" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem', textDecoration: 'none', borderRadius: 8 }}>
            Get Started →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', textAlign: 'center' }}>
        <div className="fade-up">
          <div className="badge badge-indigo" style={{ marginBottom: '1.5rem' }}>
            🚀 Built for BnB Hackathon 2026
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.2rem', letterSpacing: '-0.03em' }}>
            Your Career Roadmap,<br />
            Grounded in{' '}
            <span className="gradient-text">Real Dev Communities</span>
          </h1>

          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: 560, lineHeight: 1.7, marginBottom: '0.5rem' }}>
            Stop following generic tutorials. RadarDev scrapes thousands of real Reddit discussions to build{' '}
            <strong style={{ color: 'var(--text-primary)' }}>evidence-backed roadmaps</strong> for becoming a{' '}
            <span style={{ color: 'var(--accent-secondary)', fontWeight: 700, transition: 'all 0.3s ease' }}>
              {ROLES[roleIdx]}
            </span>
            .
          </p>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
            Upload your resume → See your ATS score → Get a personalized roadmap → Ace mock interviews
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/generate" className="btn-primary" style={{ textDecoration: 'none', fontSize: '1rem', padding: '14px 32px' }}>
              Analyze My Resume
            </Link>
            <Link href="/generate?mode=questionnaire" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '1rem', padding: '14px 32px' }}>
              Start Without Resume
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', padding: '3rem 2.5rem', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {[
          { icon: '📡', title: 'Reddit-Grounded Advice', desc: 'Every roadmap node cites real developer discussions from r/developersIndia, r/cscareerquestions, and more.' },
          { icon: '📄', title: 'ATS Resume Analysis', desc: 'Upload your PDF/DOCX to get a 5-factor ATS score with exact missing keywords and improvement steps.' },
          { icon: '🗺️', title: 'Adaptive Roadmaps', desc: 'Set your timeline (7-day sprint to 90-day mastery) and get a pruned, realistic learning path.' },
          { icon: '🎯', title: 'AI Mock Interviews', desc: 'Test each milestone\'s knowledge. Fail a concept → get a 3-day remedial sprint to fix it fast.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="glass-card" style={{ padding: '1.8rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>{icon}</div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.6rem', fontSize: '1rem' }}>{title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{desc}</p>
          </div>
        ))}
      </section>

      {/* ── Footer ── */}
      <footer style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Built with 🔥 for BnB Hackathon 2026 · RadarDev (SkillBridge AI)
      </footer>
    </main>
  );
}
