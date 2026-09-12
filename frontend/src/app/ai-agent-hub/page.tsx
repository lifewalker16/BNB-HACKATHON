import Link from 'next/link';

interface AgentCard {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  techStack: string[];
  demoPath: string | null;
  status: 'live' | 'powered-by-groq' | 'reddit-backed';
}

const AGENTS: AgentCard[] = [
  {
    id: 'ats-agent',
    emoji: '🔍',
    title: 'ATS Analysis Agent',
    subtitle: 'Resume Intelligence Engine',
    description:
      'Multi-model NLP pipeline using spaCy (en_core_web_md) for entity extraction, ' +
      'SentenceTransformers for semantic keyword matching, and rapidfuzz for fuzzy skill ' +
      'detection. Scores resumes on 5 weighted dimensions: formatting, keywords, content ' +
      'quality, skill validation, and ATS compatibility.',
    techStack: ['spaCy en_core_web_md', 'SentenceTransformers', 'rapidfuzz', 'FastAPI', 'Supabase'],
    demoPath: '/generate',
    status: 'live',
  },
  {
    id: 'roadmap-agent',
    emoji: '🗺️',
    title: 'Adaptive Roadmap Engine',
    subtitle: 'Community-Grounded Path Generator',
    description:
      'Generates time-budgeted React Flow DAGs using a static prerequisite skill graph ' +
      'pruned to fit the user\'s timeline. Every node is enriched with evidence from real ' +
      'developer Reddit discussions retrieved via pgvector cosine similarity search ' +
      '(Supabase, 384-dim all-MiniLM-L6-v2 embeddings).',
    techStack: ['pgvector', 'all-MiniLM-L6-v2', 'Supabase', '@xyflow/react', 'Python asyncio'],
    demoPath: '/generate',
    status: 'reddit-backed',
  },
  {
    id: 'scraper-agent',
    emoji: '📡',
    title: 'Dynamic Reddit Scraper',
    subtitle: 'MCP + Chrome CDP Bridge',
    description:
      'Bypasses Reddit API rate limits using a Model Context Protocol server that controls ' +
      'a locally running Chrome instance via Chrome DevTools Protocol (CDP). On cache miss, ' +
      'spawns `dynamic_scraper.js` as a subprocess from the FastAPI backend, scraping ' +
      '6 subreddits × 4 query templates per role.',
    techStack: ['MCP SDK', 'Chrome CDP', 'Node.js ESM', 'Python subprocess', 'reddit-unofficial-api'],
    demoPath: null,
    status: 'reddit-backed',
  },
  {
    id: 'rag-agent',
    emoji: '🧠',
    title: 'RAG Retrieval Engine',
    subtitle: 'Vector-Grounded Knowledge System',
    description:
      'Cache-aside retrieval pattern: first queries Supabase pgvector for pre-seeded ' +
      'community insights, falls back to live scraping if fewer than 3 high-similarity ' +
      'chunks found. Chunks Reddit discussions at 1000 chars with 200-char overlap. ' +
      'Assigns consensus tags (Crucial, Interview Gotcha, Project Idea, Overhyped) via keyword heuristics.',
    techStack: ['Supabase pgvector', 'IVFFlat index', 'all-MiniLM-L6-v2', 'httpx', 'Python async'],
    demoPath: null,
    status: 'reddit-backed',
  },
  {
    id: 'mock-agent',
    emoji: '🎯',
    title: 'AI Mock Interview Engine',
    subtitle: 'LLM-Powered Readiness Assessment',
    description:
      'Uses Groq (llama-3.3-70b-versatile) to generate 5 contextual questions per milestone ' +
      '(2 conceptual + 2 practical + 1 debugging/scenario). Evaluates answers using 70% ' +
      'SentenceTransformer cosine similarity + 30% length/substance heuristic. ' +
      'Returns a 3-day remedial sprint DAG for critical gaps.',
    techStack: ['Groq llama-3.3-70b-versatile', 'SentenceTransformers', 'scikit-learn', 'FastAPI'],
    demoPath: null,
    status: 'powered-by-groq',
  },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  'live':            { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', label: '● Live Demo' },
  'powered-by-groq': { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', label: '⚡ Groq-Powered' },
  'reddit-backed':   { bg: 'rgba(6, 182, 212, 0.12)',  color: '#06b6d4', label: '📡 Reddit-Backed' },
};

export default function AIAgentHubPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>

      {/* Back */}
      <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', gap: 6, marginBottom: '2rem' }}>
        ← Back to Home
      </Link>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div className="badge badge-indigo" style={{ marginBottom: '1.2rem' }}>
          2026 AI Developer Track
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
          <span className="gradient-text">AI Agent Hub</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
          RadarDev is a <strong style={{ color: 'var(--text-primary)' }}>multi-agent AI system</strong>:
          each capability is powered by a specialized agent that coordinates through a shared
          Supabase backend and a local MCP scraper bridge.
        </p>
      </div>

      {/* Architecture Diagram (ASCII art styled) */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.8rem', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.82rem' }}>
          System Architecture
        </p>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <p>User Browser (Vercel)  →  Next.js 15 Frontend  →  FastAPI Backend (Cloudflare Tunnel)</p>
          <p style={{ paddingLeft: '4ch', color: 'var(--accent-secondary)' }}>
            ├── ATS Agent      (spaCy + SentenceTransformers + rapidfuzz)
          </p>
          <p style={{ paddingLeft: '4ch', color: 'var(--accent-secondary)' }}>
            ├── Roadmap Engine (static graph + pgvector citations)
          </p>
          <p style={{ paddingLeft: '4ch', color: 'var(--accent-secondary)' }}>
            ├── RAG Engine     (Supabase pgvector ↔ Reddit Scraper subprocess)
          </p>
          <p style={{ paddingLeft: '4ch', color: 'var(--accent-secondary)' }}>
            └── Mock Engine    (Groq llama-3.3-70b + cosine similarity eval)
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            Reddit Scraper  →  MCP Server (Node.js)  →  Chrome CDP (port 9222)  →  reddit.com
          </p>
          <p>
            Supabase pgvector  →  community_insights (vector(384))  →  IVFFlat ANN index
          </p>
        </div>
      </div>

      {/* Agent Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1.5rem' }}>
        {AGENTS.map(agent => {
          const statusStyle = STATUS_COLORS[agent.status];
          return (
            <div key={agent.id} className="glass-card" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: '2rem' }}>{agent.emoji}</span>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {agent.title}
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{agent.subtitle}</p>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: statusStyle.bg, color: statusStyle.color, whiteSpace: 'nowrap',
                }}>
                  {statusStyle.label}
                </span>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.7, marginBottom: '1.2rem', flex: 1 }}>
                {agent.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1.2rem' }}>
                {agent.techStack.map(tech => (
                  <span key={tech} className="badge badge-cyan">{tech}</span>
                ))}
              </div>

              {agent.demoPath && (
                <Link href={agent.demoPath} className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', fontSize: '0.85rem', padding: '9px 20px' }}>
                  Try Live Demo →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem', marginTop: '3rem', padding: '1.5rem 2rem',
        background: 'var(--bg-secondary)', borderRadius: 16, textAlign: 'center',
        border: '1px solid var(--border-subtle)',
      }}>
        {[
          { value: '5', label: 'Specialized AI Agents' },
          { value: '384', label: 'Embedding Dimensions' },
          { value: '6', label: 'Subreddits Monitored' },
          { value: '5', label: 'Supported Roles' },
          { value: '5-Factor', label: 'ATS Scoring Model' },
        ].map(({ value, label }) => (
          <div key={label}>
            <p className="gradient-text" style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>
          See it in action
        </h2>
        <Link href="/generate" className="btn-primary" style={{ textDecoration: 'none', fontSize: '1rem', padding: '13px 32px' }}>
          Try RadarDev Now →
        </Link>
      </div>
    </main>
  );
}
