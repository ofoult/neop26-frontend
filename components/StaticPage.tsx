import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Btn } from './ui';

// Shared shell for the small, static footer-linked pages (about, partners,
// help, FAQ, privacy, terms, cookies, sitemap) — keeps them visually
// consistent without each one re-implementing the same layout.
export async function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  const t = await getTranslations('NotFound');

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 28px 120px' }}>
      <h1 className="serif" style={{ fontSize: 'clamp(34px,5vw,54px)', margin: '0 0 24px', lineHeight: 1.05 }}>
        {title}
      </h1>
      <div style={{ color: 'var(--dim)', fontSize: 16, lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
      <div style={{ marginTop: 40 }}>
        <Btn href="/" variant="soft">
          {t('backHome')}
        </Btn>
      </div>
    </div>
  );
}
