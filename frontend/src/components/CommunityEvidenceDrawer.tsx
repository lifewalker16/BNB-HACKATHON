'use client';

import { useState } from 'react';
import type { CommunityCitation } from '@/lib/api';

interface Props {
  nodeTitle: string;
  citations: CommunityCitation[];
}

const CONSENSUS_TAG_COLORS: Record<string, string> = {
  'Crucial':         'badge-red',
  'Interview Gotcha': 'badge-amber',
  'Project Idea':    'badge-green',
  'Overhyped':       'badge-cyan',
};

export default function CommunityEvidenceDrawer({ nodeTitle, citations }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (citations.length === 0) {
    return (
      <div className="sources-container">
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
          📡 Community data loading for this topic...
        </p>
      </div>
    );
  }

  return (
    <div className="sources-container">
      <div className="sources-header">
        <span className="sources-badge">📡 Real Community Evidence</span>
        <p className="sources-subtitle">Why "{nodeTitle}" is required by recruiters:</p>
      </div>

      <div className="sources-list">
        {citations.map((cite, i) => (
          <div
            key={i}
            className={`source-card ${expandedIndex === i ? 'source-expanded' : ''}`}
            onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setExpandedIndex(expandedIndex === i ? null : i)}
          >
            <div className="source-card-header">
              <span className="source-num">#{i + 1}</span>
              <span className="source-sub">{cite.subreddit}</span>
              <span className="source-author">u/{cite.author}</span>
              <span className="source-upvotes">▲ {cite.upvotes}</span>
              {cite.consensus_tag && (
                <span className={`badge ${CONSENSUS_TAG_COLORS[cite.consensus_tag] || 'badge-indigo'}`}>
                  {cite.consensus_tag}
                </span>
              )}
              <span className="source-relevance">{cite.relevance_score}% Match</span>
            </div>

            <p className="source-post-title">"{cite.post_title}"</p>
            <blockquote className="source-excerpt">"{cite.excerpt}"</blockquote>

            {expandedIndex === i && cite.post_url && (
              <a
                href={cite.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
                onClick={(e) => e.stopPropagation()}
              >
                View Original Reddit Thread ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
