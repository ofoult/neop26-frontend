import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { StaticPage } from '@/components/StaticPage';
import { CATEGORIES } from '@/lib/categories';
import { hreflangAlternates, localePath } from '@/lib/hreflang';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'Footer' });
  return {
    title: t('sitemap'),
    alternates: {
      canonical: localePath('/sitemap', params.locale),
      languages: hreflangAlternates('/sitemap'),
    },
  };
}

function LinkGroup({ heading, links }: { heading: string; links: [string, string][] }) {
  return (
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--faint)',
          marginBottom: 14,
        }}
      >
        {heading}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {links.map(([label, href]) => (
          <Link key={href} href={href} style={{ fontSize: 15, color: 'var(--dim)' }}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function SitemapPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Footer');
  const tBrowse = await getTranslations('Browse');
  const tCat = await getTranslations('Categories');
  const tp = await getTranslations('StaticPages');

  return (
    <StaticPage title={t('sitemap')}>
      <p>{tp('sitemapIntro')}</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 32,
          marginTop: 8,
        }}
      >
        <LinkGroup
          heading={tBrowse('home')}
          links={[
            [tBrowse('home'), '/'],
            [tBrowse('discoverEvents'), '/browse'],
            ...CATEGORIES.map((cat): [string, string] => [tCat(cat.id), `/browse/${cat.id}`]),
          ]}
        />
        <LinkGroup
          heading={t('learnMore')}
          links={[
            [t('aboutUs'), '/about'],
            [t('partners'), '/partners'],
          ]}
        />
        <LinkGroup
          heading={t('support')}
          links={[
            [t('help'), '/help'],
            [t('faq'), '/faq'],
          ]}
        />
        <LinkGroup
          heading={t('privacy')}
          links={[
            [t('privacy'), '/privacy'],
            [t('terms'), '/terms'],
            [t('cookies'), '/cookies'],
          ]}
        />
      </div>
    </StaticPage>
  );
}
