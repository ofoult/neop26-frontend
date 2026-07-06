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
      <div className="nav-inner">
        <Logo href="/" />
        <nav className="nav-links">
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
        <Link href="/browse?focus=1" className="nav-search focus-ring" aria-label="Search events, artists, cities">
          <Icon name="search" size={17} />
          <span className="nav-search-label">Search events, artists, cities…</span>
        </Link>
        <button className="nav-lang focus-ring" aria-label="Language and currency">
          <Icon name="globe" size={18} />
          <span className="nav-lang-label">EN · USD</span>
        </button>
        <Btn size="sm" variant="soft" icon="user">
          Sign in
        </Btn>
      </div>
    </header>
  );
}
