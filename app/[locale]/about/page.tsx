import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StaticPage } from '@/components/StaticPage';
import { hreflangAlternates, localePath } from '@/lib/hreflang';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'Footer' });
  return {
    title: t('aboutUs'),
    alternates: {
      canonical: localePath('/about', params.locale),
      languages: hreflangAlternates('/about'),
    },
  };
}

export default async function AboutPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Footer');
  const tp = await getTranslations('StaticPages');

  return (
    <StaticPage title={t('aboutUs')}>
      <p>{tp('aboutBody')}</p>
    </StaticPage>
  );
}
