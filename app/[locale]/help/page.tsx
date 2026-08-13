import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StaticPage } from '@/components/StaticPage';
import { hreflangAlternates, localePath } from '@/lib/hreflang';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'Footer' });
  return {
    title: t('help'),
    alternates: {
      canonical: localePath('/help', params.locale),
      languages: hreflangAlternates('/help'),
    },
  };
}

export default async function HelpPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Footer');
  const tp = await getTranslations('StaticPages');

  return (
    <StaticPage title={t('help')}>
      <p>
        {tp.rich('helpBody', {
          email: (chunks) => <a href="mailto:contact@neop.events">{chunks}</a>,
        })}
      </p>
    </StaticPage>
  );
}
