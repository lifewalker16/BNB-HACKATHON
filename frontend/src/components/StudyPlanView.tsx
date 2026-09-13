'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type StudyPlan, type RoadmapResponse, type WeeklyPlan } from '@/lib/api';

interface Props {
  roadmap: RoadmapResponse;
}

export default function StudyPlanView({ roadmap }: Props) {
  const router = useRouter();
  const plan = roadmap.study_plan;
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const handleStartWeekMock = (week: WeeklyPlan) => {
    // Compile rich syllabus context for this week
    let syllabusText = `Week ${week.week_number}: ${week.theme}\nGoal: ${week.goal}\nFocus Milestone: ${week.focus_milestone}\n`;
    week.days.forEach(d => {
      syllabusText += `- Day ${d.day_number} (${d.weekday || 'Mon'}): ${d.title}. Key concepts: ${d.key_concepts.join(', ')}. Practice: ${d.practice_task}\n`;
    });
    if (week.reddit_gotchas && week.reddit_gotchas.length > 0) {
      syllabusText += `Reddit gotchas: ${week.reddit_gotchas.map(g => g.warning).join('; ')}\n`;
    }

    sessionStorage.setItem('mock_node_id', `week-${week.week_number}`);
    sessionStorage.setItem('mock_node_label', week.focus_milestone || week.theme);
    sessionStorage.setItem('mock_syllabus_context', syllabusText);
    sessionStorage.setItem('mock_target_role', roadmap.target_role || '');
    router.push('/mock-test');
  };

  // Load checklist state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`progress_${roadmap.roadmap_id}`);
      if (saved) {
        setCompletedDays(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [roadmap.roadmap_id]);

  const toggleDay = (dayNumber: number) => {
    const updated = { ...completedDays, [dayNumber]: !completedDays[dayNumber] };
    setCompletedDays(updated);
    try {
      localStorage.setItem(`progress_${roadmap.roadmap_id}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleCopyMarkdown = () => {
    if (!plan) return;
    let md = `# ${roadmap.target_role} Comprehensive Study Syllabus\n\n`;
    md += `**Summary**: ${plan.executive_summary}\n`;
    md += `**Total Estimated Hours**: ${plan.estimated_total_hours} hrs across ${roadmap.total_weeks} weeks\n\n`;

    plan.weekly_schedule.forEach((week) => {
      md += `## Week ${week.week_number}: ${week.theme}\n`;
      md += `*Goal*: ${week.goal}\n\n`;
      week.days.forEach((day) => {
        const weekdayTag = day.weekday ? ` (${day.weekday})` : '';
        md += `### Day ${day.day_number}${weekdayTag}: ${day.title} (${day.estimated_hours}h)\n`;
        md += `- **Concepts**: ${day.key_concepts.join(', ')}\n`;
        md += `- **Practice**: ${day.practice_task}\n\n`;
      });
      if (week.reddit_gotchas && week.reddit_gotchas.length > 0) {
        week.reddit_gotchas.forEach((g) => {
          md += `> ⚠️ **Community Warning (${g.source_subreddit})**: ${g.warning}\n\n`;
        });
      }
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!plan) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>No detailed study syllabus generated for this roadmap.</p>
      </div>
    );
  }

  const totalDays = plan.weekly_schedule.reduce((acc, w) => acc + w.days.length, 0);
  const checkedCount = Object.values(completedDays).filter(Boolean).length;
  const progressPercent = totalDays > 0 ? Math.round((checkedCount / totalDays) * 100) : 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', paddingBottom: '5rem' }}>

      {/* ── Top Overview Banner ── */}
      <div className="glass-card fade-up" style={{
        padding: '2rem',
        borderRadius: 16,
        marginBottom: '2rem',
        border: '1px solid var(--border-accent)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
          <div>
            <div className="badge badge-indigo" style={{ marginBottom: '0.8rem' }}>
              🧠 AI-Synthesized Career Plan
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {roadmap.target_role} Study Syllabus
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6, maxWidth: 650 }}>
              {plan.executive_summary}
            </p>
          </div>
          <button
            onClick={handleCopyMarkdown}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {copied ? '✅ Copied to Clipboard!' : '📋 Export Markdown'}
          </button>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '1rem',
          paddingTop: '1.2rem',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Weeks</span>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', margin: '2px 0 0 0' }}>
              {roadmap.total_weeks} Weeks
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Study Budget</span>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-secondary)', margin: '2px 0 0 0' }}>
              ~{plan.estimated_total_hours} Hours
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Milestones</span>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
              {roadmap.total_nodes} Core Skills
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Your Progress</span>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: progressPercent === 100 ? '#10b981' : '#f59e0b', margin: '2px 0 0 0' }}>
              {progressPercent}% ({checkedCount}/{totalDays})
            </p>
          </div>
        </div>
      </div>

      {/* ── Week by Week Breakdown ── */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.2rem', color: 'var(--text-primary)' }}>
        📅 Structured Weekly Schedule
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {plan.weekly_schedule.map((week) => (
          <div key={week.week_number} className="glass-card" style={{
            padding: '1.8rem',
            borderRadius: 14,
            border: '1px solid var(--border-subtle)',
          }}>
            {/* Week Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}>
                  Week {week.week_number}
                </span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {week.theme}
                </h4>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Target: {week.focus_milestone}
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1.2rem' }}>
              <strong>Goal:</strong> {week.goal}
            </p>

            {/* Daily Lessons List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.2rem' }}>
              {week.days.map((day) => {
                const isChecked = !!completedDays[day.day_number];
                return (
                  <div
                    key={day.day_number}
                    onClick={() => toggleDay(day.day_number)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '10px 14px',
                      background: isChecked ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isChecked ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ marginTop: 4, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {day.weekday && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: 'rgba(99, 102, 241, 0.18)',
                              color: 'var(--accent-primary)',
                              border: '1px solid rgba(99, 102, 241, 0.35)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}>
                              {day.weekday}
                            </span>
                          )}
                          <span style={{
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: isChecked ? '#10b981' : 'var(--text-primary)',
                            textDecoration: isChecked ? 'line-through' : 'none',
                          }}>
                            Day {day.day_number}: {day.title}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ⏱ {day.estimated_hours} hrs
                        </span>
                      </div>

                      {/* Key Concepts */}
                      {day.key_concepts && day.key_concepts.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 6px 0' }}>
                          {day.key_concepts.map((concept, ci) => (
                            <span key={ci} style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-secondary)',
                            }}>
                              • {concept}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Practice Task */}
                      {day.practice_task && (
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                          🛠️ <strong style={{ color: 'var(--text-secondary)' }}>Exercise:</strong> {day.practice_task}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reddit Gotchas Callout */}
            {week.reddit_gotchas && week.reddit_gotchas.length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: '1.2rem',
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', margin: 0, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠️ Community Traps to Avoid ({week.reddit_gotchas[0].source_subreddit}):
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {week.reddit_gotchas[0].warning}
                </p>
              </div>
            )}

            {/* Test Week Knowledge Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleStartWeekMock(week)}
                className="btn-secondary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderColor: 'rgba(99, 102, 241, 0.4)',
                  color: 'var(--text-primary)',
                  background: 'rgba(99, 102, 241, 0.08)',
                }}
              >
                <span>🎯</span> Test Week {week.week_number} Knowledge ({week.focus_milestone}) →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Capstone Projects ── */}
      {plan.capstone_projects && plan.capstone_projects.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            🚀 Portfolio Capstone Projects
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {plan.capstone_projects.map((proj, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.5rem', borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {proj.title}
                  </h4>
                  <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>
                    {proj.difficulty}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                  {proj.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {proj.key_technologies.map((tech, ti) => (
                    <span key={ti} className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommended Resources ── */}
      {plan.recommended_resources && plan.recommended_resources.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 14 }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
            📚 Curated Free Resources & Official Docs
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {plan.recommended_resources.map((res, ri) => (
              <li key={ri} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--accent-secondary)' }}>→</span>
                {res}
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}
