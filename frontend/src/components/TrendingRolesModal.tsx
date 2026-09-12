'use client';

import { useState, useEffect } from 'react';
import { getTrendingRoles, type TrendingRole } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (roleName: string, recommendedDays: number) => void;
}

export default function TrendingRolesModal({ isOpen, onClose, onSelectRole }: Props) {
  const [roles, setRoles] = useState<TrendingRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const fetchRoles = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getTrendingRoles();
        setRoles(data.trending_roles || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load trending roles');
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['All', ...Array.from(new Set(roles.map((r) => r.category).filter(Boolean)))];

  const filteredRoles = selectedCategory === 'All'
    ? roles
    : roles.filter((r) => r.category === selectedCategory);

  const getBadgeStyle = (badge: string) => {
    if (badge.includes('Surging') || badge.includes('🔥')) {
      return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#f87171' };
    }
    if (badge.includes('High') || badge.includes('📈')) {
      return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24' };
    }
    return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399' };
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 350,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          borderRadius: 20,
          width: 'min(820px, 95vw)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fade-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.4rem 1.8rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: '1.2rem' }}>🔥</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Trending Tech Roles in 2025–2026
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Live market intelligence scraped & clustered from developer communities (r/developersIndia, r/cscareerquestions, r/LocalLLaMA)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1.2rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Category Tabs */}
        {categories.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '0.8rem 1.8rem',
              borderBottom: '1px solid var(--border-subtle)',
              overflowX: 'auto',
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: selectedCategory === cat ? 700 : 500,
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  background: selectedCategory === cat ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                  color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Roles List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.8rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <LoadingSpinner message="Scanning developer subreddits for trending career trends..." size={36} />
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-danger)' }}>
              {error}
            </div>
          ) : filteredRoles.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No trending roles found in this category.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {filteredRoles.map((role, idx) => {
                const badgeStyle = getBadgeStyle(role.demand_badge);
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 14,
                      padding: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99, 102, 241, 0.5)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(99, 102, 241, 0.06)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.03)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                    onClick={() => {
                      onSelectRole(role.role_name, role.recommended_timeline_days || 45);
                      onClose();
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                          {role.category}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: badgeStyle.bg,
                            border: `1px solid ${badgeStyle.border}`,
                            color: badgeStyle.text,
                          }}
                        >
                          {role.demand_badge}
                        </span>
                      </div>

                      {/* Role Name */}
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {role.role_name}
                      </h3>

                      {/* Why Trending */}
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
                        {role.why_trending}
                      </p>

                      {/* Key Skills */}
                      {role.key_skills && role.key_skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                          {role.key_skills.map((skill, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 7px',
                                borderRadius: 5,
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Hiring Companies */}
                      {role.sample_hiring_companies && role.sample_hiring_companies.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                          🏢 <strong style={{ color: 'var(--text-secondary)' }}>Hiring:</strong> {role.sample_hiring_companies.join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        ⏱ ~{role.recommended_timeline_days || 45} days prep
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        Select Role →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
