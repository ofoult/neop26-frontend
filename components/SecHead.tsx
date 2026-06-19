import Link from 'next/link';
import { Icon } from './Icon';

// Section header with optional serif kicker + an arrow "action" link.
export function SecHead({
  kicker,
  title,
  action,
  actionHref,
}: {
  kicker?: string;
  title: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
      <div>
        {kicker && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent)',
              marginBottom: 10,
            }}
          >
            {kicker}
          </div>
        )}
        <h2 className="serif" style={{ fontSize: 'clamp(30px,4vw,46px)', margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>
          {title}
        </h2>
      </div>
      {action && actionHref && (
        <Link
          href={actionHref}
          className="focus-ring"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--dim)', flexShrink: 0 }}
        >
          {action} <Icon name="arrow" size={16} />
        </Link>
      )}
    </div>
  );
}
