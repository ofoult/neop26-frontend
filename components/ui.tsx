'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

// ---------- wordmark ----------
export function Logo({ size = 24, href = '/' }: { size?: number; href?: string }) {
  return (
    <Link
      href={href}
      className="focus-ring"
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 0 }}
      aria-label="neop home"
    >
      <span
        style={{
          width: size * 0.78,
          height: size * 0.78,
          borderRadius: 7,
          background: 'var(--grad)',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 4px 18px -6px var(--accent)',
        }}
      >
        <span style={{ width: size * 0.3, height: size * 0.3, borderRadius: '50%', background: '#fff' }} />
      </span>
      <span style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.04em' }}>neop</span>
    </Link>
  );
}

// ---------- buttons ----------
type BtnVariant = 'solid' | 'light' | 'ghost' | 'soft';
type BtnSize = 'sm' | 'md' | 'lg';

interface BtnProps {
  children?: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: BtnVariant;
  size?: BtnSize;
  full?: boolean;
  icon?: IconName;
  iconR?: IconName;
  style?: CSSProperties;
  type?: 'button' | 'submit';
  /** Open the href in a new tab (for external links like checkout). */
  newTab?: boolean;
}

export function Btn({
  children,
  onClick,
  href,
  variant = 'solid',
  size = 'md',
  full,
  icon,
  iconR,
  style,
  type = 'button',
  newTab,
}: BtnProps) {
  const [h, setH] = useState(false);
  const sizes: Record<BtnSize, { p: string; f: number }> = {
    sm: { p: '9px 16px', f: 14 },
    md: { p: '13px 22px', f: 15 },
    lg: { p: '17px 30px', f: 16.5 },
  };
  const s = sizes[size];
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: s.p,
    fontSize: s.f,
    fontWeight: 600,
    borderRadius: 999,
    letterSpacing: '-0.01em',
    width: full ? '100%' : 'auto',
    transition: 'transform .2s, box-shadow .25s, background .2s, border-color .2s',
    transform: h ? 'translateY(-1px)' : 'none',
    whiteSpace: 'nowrap',
  };
  const variants: Record<BtnVariant, CSSProperties> = {
    solid: {
      background: 'var(--grad)',
      color: 'var(--accent-ink)',
      boxShadow: h ? '0 12px 30px -8px var(--accent)' : '0 6px 18px -8px var(--accent)',
    },
    light: { background: 'var(--text)', color: '#0a0a0f' },
    ghost: { background: h ? 'var(--surface-2)' : 'transparent', color: 'var(--text)', border: '1px solid var(--border-2)' },
    soft: { background: h ? 'var(--surface-2)' : 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  };
  const content = (
    <>
      {icon && <Icon name={icon} size={s.f + 2} />}
      {children}
      {iconR && <Icon name={iconR} size={s.f + 2} />}
    </>
  );
  const styleAll = { ...base, ...variants[variant], ...style };

  if (href) {
    return (
      <Link
        href={href}
        className="focus-ring"
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        style={styleAll}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className="focus-ring"
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={styleAll}
    >
      {content}
    </button>
  );
}

// ---------- category chip ----------
export function CatPill({
  cat,
  active,
  onClick,
  href,
}: {
  cat: { label: string; emoji: string };
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const [h, setH] = useState(false);
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 999,
    fontSize: 14.5,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    border: active ? '1px solid transparent' : '1px solid var(--border)',
    background: active ? 'var(--grad)' : h ? 'var(--surface-2)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text)',
    transition: 'all .2s',
  };
  const inner = (
    <>
      <span style={{ opacity: active ? 1 : 0.7 }}>{cat.emoji}</span>
      {cat.label}
    </>
  );
  if (href) {
    return (
      <Link href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="focus-ring" style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="focus-ring" style={style}>
      {inner}
    </button>
  );
}
