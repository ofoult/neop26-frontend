const CITIES = [
  'New York', 'Tokyo', 'London', 'Berlin', 'Paris', 'Rio',
  'Madrid', 'Sydney', 'Los Angeles', 'Amsterdam', 'Seoul', 'Mexico City',
];

export function CityMarquee() {
  const row = [...CITIES, ...CITIES];
  return (
    <div
      style={{
        overflow: 'hidden',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '18px 0',
        maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
      }}
    >
      <div style={{ display: 'flex', gap: 48, width: 'max-content', animation: 'marquee 38s linear infinite' }}>
        {row.map((c, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 24,
              fontWeight: 600,
              color: 'var(--dim)',
              letterSpacing: '-0.02em',
            }}
          >
            <span className="serif ital" style={{ color: 'var(--text)' }}>
              {c}
            </span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
          </span>
        ))}
      </div>
    </div>
  );
}
