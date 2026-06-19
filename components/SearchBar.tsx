import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Btn } from './ui';

function Field({ icon, label, val, compact }: { icon: IconName; label: string; val?: string; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: compact ? '0 16px' : '0 20px', flex: 1, minWidth: 0 }}>
      <Icon name={icon} size={18} style={{ color: 'var(--faint)', flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--faint)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 15,
            color: val ? 'var(--text)' : 'var(--dim)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {val || 'Anything'}
        </div>
      </div>
    </div>
  );
}

function Divider(): ReactNode {
  return <span style={{ width: 1, height: 32, background: 'var(--border)' }} />;
}

export function SearchBar({ compact }: { compact?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(13,13,20,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-2)',
        borderRadius: 999,
        padding: '8px',
        gap: 0,
        boxShadow: '0 24px 60px -24px rgba(0,0,0,.7)',
      }}
    >
      <Field icon="search" label="What" val="Search events & artists" compact={compact} />
      <Divider />
      <Field icon="pin" label="Where" compact={compact} />
      <Divider />
      <Field icon="cal" label="When" compact={compact} />
      <Btn href="/browse" icon="search" style={{ flexShrink: 0 }}>
        Search
      </Btn>
    </div>
  );
}
