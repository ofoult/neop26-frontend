'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Btn, Logo } from './ui';

const LINKS: [string, string][] = [
  ['Browse', '/browse'],
  ['Music', '/browse?cat=music'],
  ['Sports', '/browse?cat=sports'],
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f();
    window.addEventListener('scroll', f);
    return () => window.removeEventListener('scroll', f);
  }, []);

  const onBrowse = pathname === '/browse';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: scrolled ? 'rgba(7,7,11,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(18px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all .3s',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <Logo href="/" />
        <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {LINKS.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="focus-ring"
              style={{
                padding: '8px 14px',
                fontSize: 14.5,
                fontWeight: 500,
                borderRadius: 999,
                color: onBrowse && label === 'Browse' ? 'var(--text)' : 'var(--dim)',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/browse"
          className="focus-ring"
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 18px',
            borderRadius: 999,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--faint)',
            fontSize: 14,
            minWidth: 230,
            justifyContent: 'flex-start',
          }}
        >
          <Icon name="search" size={17} /> Search events, artists, cities…
        </Link>
        <button
          className="focus-ring"
          style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--dim)', fontSize: 14.5, fontWeight: 500 }}
        >
          <Icon name="globe" size={18} /> EN · USD
        </button>
        <Btn size="sm" variant="soft" icon="user">
          Sign in
        </Btn>
      </div>
    </header>
  );
}
