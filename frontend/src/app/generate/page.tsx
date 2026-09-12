'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  generateRoadmapStream,
  analyzeResume,
  recommendTimeline,
  getHiringCompanies,
  type RoadmapRequest,
  type ATSAnalysisResponse,
  type ResearchProgressEvent,
  type DynamicTimelineRecommendation,
  type RoleCompanyDiscoveryResponse,
} from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import ResearchStreamModal from '@/components/ResearchStreamModal';
import TrendingRolesModal from '@/components/TrendingRolesModal';

const POPULAR_ROLES = [
  'Cyber Security',
  'Frontend Developer',
  'DevOps Engineer',
  'AI/ML Engineer',
  'Full Stack Developer',
  'Blockchain Developer',
  'iOS / Swift Engineer',
  'Data Engineer',
  'Cloud / SRE',
  'Embedded Systems',
  'Game Developer',
  'QA Automation',
];

const POPULAR_COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Swiggy', 'Flipkart', 'Goldman Sachs', 'Uber', 'Coinbase'];

const TIMELINE_PRESETS = [
  { val: 14, label: '⚡ 2 Weeks' },
  { val: 30, label: '🎯 1 Month' },
  { val: 60, label: '🚀 2 Months' },
  { val: 90, label: '🏛️ 3 Months' },
];

const PREP_GOALS = [
  { id: 'job', label: '💼 Job Placement', subtitle: 'Hiring criteria, resume tips, & salary packages' },
  { id: 'interview', label: '🎯 Technical Interview', subtitle: 'DSA, system design rounds, & live coding gotchas' },
  { id: 'upskill', label: '🚀 Skill Mastery', subtitle: 'Deep architectural foundations & production projects' },
] as const;

const LEVELS = ['beginner', 'intermediate', 'advanced'];

function GenerateContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initialMode  = searchParams.get('mode') === 'questionnaire' ? 'questionnaire' : 'resume';

  const [mode, setMode]               = useState<'resume' | 'questionnaire'>(initialMode);
  const [loading, setLoading]         = useState(false);
  const [loadingMsg, setLoadingMsg]   = useState('');
  const [currentStreamEvent, setCurrentStreamEvent] = useState<ResearchProgressEvent | null>(null);
  const [streamLogs, setStreamLogs]   = useState<string[]>([]);
  const [error, setError]             = useState('');
  const [dragOver, setDragOver]       = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Questionnaire state
  const [role, setRole]                       = useState('Cyber Security');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [targetCompany, setTargetCompany]     = useState('');
  const [prepGoal, setPrepGoal]               = useState<'job' | 'interview' | 'upskill'>('job');
  const [level, setLevel]                     = useState('beginner');
  const [timeline, setTimeline]               = useState(30);
  const [hours, setHours]                     = useState(10);
  const [backgroundDesc, setBackgroundDesc]   = useState('');
  const [jdText, setJdText]                   = useState('');

  // AI Dynamic Market Intelligence State
  const [showTrendingModal, setShowTrendingModal] = useState(false);
  const [timelineRec, setTimelineRec] = useState<DynamicTimelineRecommendation | null>(null);
  const [loadingTimelineRec, setLoadingTimelineRec] = useState(false);
  const [companyDiscovery, setCompanyDiscovery] = useState<RoleCompanyDiscoveryResponse | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const activeRole = customRoleInput.trim() || role;

  // Dynamically fetch AI timeline recommendation & hiring companies when role or background changes
  useEffect(() => {
    if (!activeRole) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      // 1. Fetch Dynamic Timeline Recommendation
      setLoadingTimelineRec(true);
      recommendTimeline(activeRole, backgroundDesc, hours)
        .then((data) => {
          if (!cancelled && data) {
            setTimelineRec(data);
            if (data.recommended_days) {
              setTimeline(data.recommended_days);
            }
          }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoadingTimelineRec(false); });

      // 2. Fetch Role-Based Hiring Companies & Tiers
      setLoadingCompanies(true);
      getHiringCompanies(activeRole)
        .then((data) => {
          if (!cancelled && data) {
            setCompanyDiscovery(data);
          }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoadingCompanies(false); });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeRole, backgroundDesc, hours]);

  const handleFileSelect = (file: File) => {
    if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      setError('Please upload a PDF or DOCX file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5 MB.');
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleQuestionnaire = async () => {
    if (!activeRole) {
      setError('Please enter or select a target role.');
      return;
    }
    setLoading(true);
    setError('');
    setCurrentStreamEvent(null);
    const initialLog = targetCompany.trim()
      ? `Target Role: ${activeRole} · Target Company: ${targetCompany.trim()}`
      : `Target Role: ${activeRole}`;
    setStreamLogs(['Initializing AI Agent Planner...', initialLog, `Timeline: ${timeline} days · Goal: ${prepGoal}`]);
    try {
      const req: RoadmapRequest = {
        target_role:            activeRole,
        experience_level:       level,
        timeline_days:          Number(timeline),
        hours_per_week:         Number(hours),
        background_description: backgroundDesc,
        target_company:         targetCompany.trim(),
        preparation_goal:       prepGoal,
      };
      const roadmap = await generateRoadmapStream(req, (event) => {
        setCurrentStreamEvent(event);
        if (event.detail) {
          setStreamLogs(prev => [...prev.slice(-6), event.detail!]);
        }
      });
      // Store in sessionStorage for the roadmap page
      sessionStorage.setItem('current_roadmap', JSON.stringify(roadmap));
      router.push(`/roadmap?id=${roadmap.roadmap_id}`);
    } catch (e: any) {
      setError(e.message || 'Failed to generate roadmap');
      setLoading(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!selectedFile) { setError('Please select a file first.'); return; }
    setLoading(true);
    setLoadingMsg('Parsing resume and running ATS analysis...');
    setError('');
    try {
      const ats: ATSAnalysisResponse = await analyzeResume(selectedFile, jdText);
      sessionStorage.setItem('ats_result', JSON.stringify(ats));
      sessionStorage.setItem('selected_role', activeRole);
      sessionStorage.setItem('timeline_days', String(timeline));
      router.push('/ats-score');
    } catch (e: any) {
      setError(e.message || 'Resume analysis failed');
      setLoading(false);
    }
  };

  if (loading) {
    if (mode === 'questionnaire') {
      return <ResearchStreamModal currentEvent={currentStreamEvent} logs={streamLogs} />;
    }
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', minWidth: 300 }}>
          <LoadingSpinner message={loadingMsg} size={48} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
            Analyzing resume against 5 ATS scoring factors...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: 760, margin: '0 auto' }}>
      <a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '2rem' }}>
        ← Back
      </a>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        Build Your <span className="gradient-text">Skill Roadmap</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Tell our AI agent your target role and background — we&apos;ll research real developer communities to build your customized path.
      </p>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-secondary)', borderRadius: 12, marginBottom: '2rem' }}>
        {(['resume', 'questionnaire'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} className={mode === m ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, textTransform: 'capitalize', borderRadius: 10, padding: '10px 0' }}>
            {m === 'resume' ? '📄 Resume Upload' : '✏️ Questionnaire'}
          </button>
        ))}
      </div>

      {/* ── Dynamic Questionnaire mode ── */}
      {mode === 'questionnaire' ? (
        <div className="glass-card fade-up" style={{ padding: '1.8rem', marginBottom: '1.5rem', borderRadius: 16 }}>

          {/* 1. Target Role Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                🎯 Target Role in Tech
              </label>
              <button
                type="button"
                onClick={() => setShowTrendingModal(true)}
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(236, 72, 153, 0.2))',
                  border: '1px solid rgba(99, 102, 241, 0.6)',
                  color: '#e0e7ff',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
                }}
              >
                🔥 Explore Trending Roles & Demand
              </button>
            </div>
            <input
              type="text"
              value={customRoleInput || role}
              onChange={(e) => {
                setCustomRoleInput(e.target.value);
                setRole(e.target.value);
              }}
              placeholder="e.g. Blockchain Developer, iOS Swift Engineer, Data Engineer, SRE..."
              style={{
                width: '100%', padding: '12px 14px', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', border: '1px solid var(--border-subtle)',
                borderRadius: 10, fontSize: '0.9rem', marginBottom: 10,
              }}
            />
            {/* Quick Pill Suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {POPULAR_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setCustomRoleInput('');
                  }}
                  style={{
                    fontSize: '0.74rem',
                    padding: '4px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: (customRoleInput === '' && role === r) ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: (customRoleInput === '' && role === r) ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    color: (customRoleInput === '' && role === r) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Target Company (Dynamic Company Tiers) */}
          <div style={{ marginBottom: '1.5rem', padding: '1.2rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                🏢 Targeting a Specific Company? <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
              </label>
              {targetCompany && (
                <button
                  type="button"
                  onClick={() => setTargetCompany('')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', fontSize: '0.74rem', cursor: 'pointer' }}
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="e.g. Google, Amazon, Swiggy, Goldman Sachs, Coinbase, Snowflake..."
              style={{
                width: '100%', padding: '10px 14px', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', border: '1px solid var(--border-subtle)',
                borderRadius: 10, fontSize: '0.88rem', marginBottom: 10,
              }}
            />

            {/* Dynamic Role-Adaptive Company Tiers from Reddit */}
            {loadingCompanies ? (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Discovering top hiring companies & interview tiers for {activeRole}...
              </div>
            ) : companyDiscovery && companyDiscovery.tiers && companyDiscovery.tiers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {companyDiscovery.tiers.map((tierGroup) => (
                  <div key={tierGroup.tier_level || tierGroup.tier_title} style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: (tierGroup.tier_level || tierGroup.tier_title).includes('Tier 1') || (tierGroup.tier_level || tierGroup.tier_title).includes('1') ? '#fbbf24' : (tierGroup.tier_level || tierGroup.tier_title).includes('Tier 2') || (tierGroup.tier_level || tierGroup.tier_title).includes('2') ? '#38bdf8' : '#a78bfa' }}>
                        {tierGroup.tier_title || tierGroup.tier_level}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {tierGroup.typical_package_range && (
                          <span style={{ fontSize: '0.64rem', color: '#a3e635', fontWeight: 600 }}>
                            💰 {tierGroup.typical_package_range}
                          </span>
                        )}
                        {tierGroup.role_specific_focus && (
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                            🎯 {tierGroup.role_specific_focus}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tierGroup.companies.map((compName) => {
                        const isSelected = targetCompany.toLowerCase() === compName.toLowerCase();
                        return (
                          <button
                            key={compName}
                            type="button"
                            onClick={() => setTargetCompany(isSelected ? '' : compName)}
                            title={`${compName} hiring for ${activeRole}`}
                            style={{
                              fontSize: '0.72rem',
                              padding: '3px 8px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              border: '1px solid',
                              borderColor: isSelected ? 'var(--accent-secondary)' : 'var(--border-subtle)',
                              background: isSelected ? 'rgba(6, 182, 212, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                              color: isSelected ? '#38bdf8' : 'var(--text-secondary)',
                              fontWeight: isSelected ? 700 : 400,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>{compName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback Popular Pills */
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {POPULAR_COMPANIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTargetCompany(targetCompany === c ? '' : c)}
                    style={{
                      fontSize: '0.74rem',
                      padding: '4px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: targetCompany === c ? 'var(--accent-secondary)' : 'var(--border-subtle)',
                      background: targetCompany === c ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                      color: targetCompany === c ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                      fontWeight: targetCompany === c ? 700 : 400,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, marginTop: 8 }}>
              💡 Providing a company dynamically triggers targeted Reddit scraping for that company&apos;s interview rounds, DSA topics, and salary standards.
            </p>
          </div>

          {/* 3. Preparation Focus */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
              🎯 Preparation Focus
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {PREP_GOALS.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setPrepGoal(g.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: prepGoal === g.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: prepGoal === g.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: prepGoal === g.id ? 'var(--accent-primary)' : 'var(--text-primary)', marginBottom: 2 }}>
                    {g.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {g.subtitle}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. AI-Driven Dynamic Timeline & Hours */}
          <div style={{ marginBottom: '1.5rem', padding: '1.2rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ⏱️ Target Timeline & Commitment
                </label>
                {loadingTimelineRec && (
                  <span style={{ fontSize: '0.68rem', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.15)', padding: '1px 6px', borderRadius: 4 }}>
                    ✨ AI Calculating...
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                {timeline} Days (~{Math.round(timeline / 7)} Weeks)
              </span>
            </div>

            {/* Dynamic AI Timeline Tiers (or fallback presets) */}
            {timelineRec ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setTimeline(timelineRec.sprint_days)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: timeline === timelineRec.sprint_days ? '#eab308' : 'var(--border-subtle)',
                    background: timeline === timelineRec.sprint_days ? 'rgba(234, 179, 8, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                    color: timeline === timelineRec.sprint_days ? '#fef08a' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', fontWeight: 700 }}>⚡ Sprint</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, margin: '2px 0' }}>{timelineRec.sprint_days} Days</div>
                  <div style={{ fontSize: '0.64rem', opacity: 0.8, lineHeight: 1.1 }}>{timelineRec.sprint_focus || 'High-yield prep'}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeline(timelineRec.recommended_days)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: timeline === timelineRec.recommended_days ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: timeline === timelineRec.recommended_days ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.02)',
                    color: timeline === timelineRec.recommended_days ? '#c7d2fe' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', fontWeight: 700 }}>🎯 Job-Ready</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, margin: '2px 0' }}>{timelineRec.recommended_days} Days</div>
                  <div style={{ fontSize: '0.64rem', opacity: 0.8, lineHeight: 1.1 }}>{timelineRec.recommended_focus || 'Core mastery'}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeline(timelineRec.mastery_days)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: timeline === timelineRec.mastery_days ? '#a855f7' : 'var(--border-subtle)',
                    background: timeline === timelineRec.mastery_days ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                    color: timeline === timelineRec.mastery_days ? '#e9d5ff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', fontWeight: 700 }}>🏛️ Mastery</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, margin: '2px 0' }}>{timelineRec.mastery_days} Days</div>
                  <div style={{ fontSize: '0.64rem', opacity: 0.8, lineHeight: 1.1 }}>{timelineRec.mastery_focus || 'Architecture depth'}</div>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {TIMELINE_PRESETS.map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setTimeline(p.val)}
                    style={{
                      flex: 1,
                      minWidth: 70,
                      fontSize: '0.75rem',
                      padding: '6px 0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: timeline === p.val ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      background: timeline === p.val ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      color: timeline === p.val ? '#fff' : 'var(--text-secondary)',
                      fontWeight: timeline === p.val ? 700 : 400,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Reddit Consensus Quote Rationale */}
            {timelineRec?.community_consensus_quote && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                borderLeft: '3px solid var(--accent-primary)',
                padding: '6px 10px',
                borderRadius: '0 6px 6px 0',
                fontSize: '0.72rem',
                color: '#e0e7ff',
                marginBottom: 12,
                fontStyle: 'italic',
                lineHeight: 1.4,
              }}>
                💬 Community Consensus: &ldquo;{timelineRec.community_consensus_quote}&rdquo;
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Custom Days</label>
                <input
                  type="number"
                  min={3}
                  max={365}
                  value={timeline}
                  onChange={(e) => setTimeline(Math.max(3, Math.min(365, Number(e.target.value))))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Hours / Week</label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* 3. Experience Level & Natural Language Background */}
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                🧠 Your Current Background & Known Skills
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                style={{ padding: '4px 10px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: '0.78rem' }}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </div>
            <textarea
              value={backgroundDesc}
              onChange={(e) => setBackgroundDesc(e.target.value)}
              rows={4}
              placeholder="Describe what you already know, languages/tools you've used, or paste your experience (e.g. 'I know Python and basic SQL, built a small Flask app, but don't know Docker, cloud, or system design...')"
              style={{
                width: '100%', padding: '12px 14px', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', border: '1px solid var(--border-subtle)',
                borderRadius: 10, fontSize: '0.85rem', resize: 'vertical', lineHeight: 1.5,
              }}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              💡 Our AI Agent will analyze your text to filter out known skills and prioritize what you need to learn.
            </p>
          </div>

          {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.82rem', marginTop: 8 }}>{error}</p>}

          <button
            onClick={handleQuestionnaire}
            className="btn-primary"
            style={{ width: '100%', marginTop: '1rem', fontSize: '1rem', padding: '12px 0' }}
          >
            🚀 Launch AI Deep Research & Build Roadmap →
          </button>
        </div>
      ) : (
        /* ── Resume Upload Mode ── */
        <div className="glass-card fade-up" style={{ padding: '1.8rem', marginBottom: '1.5rem', borderRadius: 16 }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Target Role</label>
            <input
              type="text"
              value={customRoleInput || role}
              onChange={(e) => {
                setCustomRoleInput(e.target.value);
                setRole(e.target.value);
              }}
              placeholder="e.g. Full Stack Developer, DevOps..."
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem' }}
            />
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              borderRadius: 12, padding: '2.5rem', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(99,102,241,0.05)' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {selectedFile ? '✅' : '📄'}
            </div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {selectedFile ? selectedFile.name : 'Drop your resume here or click to browse'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>
              PDF or DOCX · Max 5 MB
            </p>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Job Description (optional — improves gap analysis)
            </label>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={4}
              placeholder="Paste job description here..."
              style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, resize: 'vertical', fontSize: '0.85rem' }}
            />
          </div>

          {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.82rem', marginTop: 8 }}>{error}</p>}
          <button onClick={handleResumeUpload} className="btn-primary" style={{ width: '100%', marginTop: '1.2rem', fontSize: '1rem' }}>
            Analyze Resume & Generate Roadmap →
          </button>
        </div>
      )}

      {/* Trending Roles Modal */}
      <TrendingRolesModal
        isOpen={showTrendingModal}
        onClose={() => setShowTrendingModal(false)}
        onSelectRole={(r, days) => {
          setRole(r);
          setCustomRoleInput('');
          if (days) {
            setTimeline(days);
          }
        }}
      />
    </main>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading..." size={48} />
      </main>
    }>
      <GenerateContent />
    </Suspense>
  );
}
