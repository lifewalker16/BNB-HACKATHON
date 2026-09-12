import ATSGauge from '@/components/ATSGauge';
import ScoreBreakdownBars from '@/components/ScoreBreakdownBars';
import CommunityEvidenceDrawer from '@/components/CommunityEvidenceDrawer';
import DifficultyBadge from '@/components/DifficultyBadge';
import LoadingSpinner from '@/components/LoadingSpinner';

const mockScores = {
  formatting: 16,
  keywords: 18,
  content: 20,
  skill_validation: 12,
  ats_compatibility: 13,
};

const mockCitations = [
  {
    subreddit: 'r/developersIndia',
    post_title: 'Getting a job in cybersecurity as a fresher',
    author: 'SecureDevGuru',
    post_url: 'https://reddit.com',
    upvotes: 234,
    excerpt: 'You absolutely need hands-on lab experience. HTB and TryHackMe are mandatory. No cert alone will get you hired.',
    relevance_score: 92,
    consensus_tag: 'Crucial' as const,
  },
];

export default function TestPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '2rem' }}>
        Component Test Page
      </h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>ATSGauge</h2>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <ATSGauge score={79} />
          <ATSGauge score={55} />
          <ATSGauge score={28} />
        </div>
      </section>

      <section className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>ScoreBreakdownBars</h2>
        <ScoreBreakdownBars scores={mockScores} />
      </section>

      <section className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>CommunityEvidenceDrawer</h2>
        <CommunityEvidenceDrawer nodeTitle="Linux Fundamentals" citations={mockCitations} />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Badges & Spinner</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <DifficultyBadge difficulty="Beginner" />
          <DifficultyBadge difficulty="Intermediate" />
          <DifficultyBadge difficulty="Advanced" />
          <LoadingSpinner message="Scanning communities..." size={32} />
        </div>
      </section>
    </div>
  );
}
