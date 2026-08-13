import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StaticPage } from '@/components/StaticPage';
import { hreflangAlternates, localePath } from '@/lib/hreflang';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'Footer' });
  return {
    title: t('terms'),
    alternates: {
      canonical: localePath('/terms', params.locale),
      languages: hreflangAlternates('/terms'),
    },
  };
}

export default async function TermsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Footer');
  const tp = await getTranslations('StaticPages');

  return (
    <StaticPage title={t('terms')}>
      <p>
        {tp.rich('termsBody', {
          email: (chunks) => <a href="mailto:contact@neop.events">{chunks}</a>,
        })}
      </p>
    </StaticPage>
  );
}
