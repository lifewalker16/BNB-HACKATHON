interface Props {
  message?: string;
  size?: number;
}

export default function LoadingSpinner({ message = 'Loading...', size = 40 }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '2rem' }}>
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid rgba(99, 102, 241, 0.2)`,
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
