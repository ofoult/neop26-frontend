import { Icon } from './Icon';
import { Logo } from './ui';

const COLS: [string, string[]][] = [
  ['Discover', ['Concerts', 'Festivals', 'Sports', 'Theater', 'Comedy']],
  ['Company', ['About neop', 'Careers', 'Press', 'Partners']],
  ['Support', ['Help center', 'Buyer guarantee', 'Refunds', 'Contact']],
];

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 100, background: 'var(--bg-2)' }}>
      <div
        style={{
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
          padding: '64px 28px 40px',
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr 1fr 1fr',
          gap: 40,
        }}
      >
        <div>
          <Logo />
          <p style={{ color: 'var(--dim)', fontSize: 14.5, lineHeight: 1.6, marginTop: 16, maxWidth: 280 }}>
            Tickets to the world&apos;s best live events. Verified sellers, every seat guaranteed.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 13px',
                borderRadius: 999,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontSize: 13,
                color: 'var(--dim)',
              }}
            >
              <Icon name="lock" size={14} /> 100% guarantee
            </span>
          </div>
        </div>
        {COLS.map(([h, items]) => (
          <div key={h}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--faint)',
                marginBottom: 16,
              }}
            >
              {h}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {items.map((it) => (
                <a key={it} href="#" style={{ fontSize: 14.5, color: 'var(--dim)' }}>
                  {it}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
          padding: '22px 28px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          color: 'var(--faint)',
          fontSize: 13.5,
        }}
      >
        <span>© 2026 neop. All rights reserved.</span>
        <span style={{ display: 'flex', gap: 22 }}>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Cookies</a>
        </span>
      </div>
    </footer>
  );
}
