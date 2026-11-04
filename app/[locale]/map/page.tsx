import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EventsGlobe } from '@/components/EventsGlobe';
import { hreflangAlternates, localePath } from '@/lib/hreflang';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'Map' });
  const canonical = localePath('/map', params.locale);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical, languages: hreflangAlternates('/map') },
    openGraph: { title: `${t('metaTitle')} | neop`, description: t('metaDescription'), url: canonical, type: 'website' },
  };
}

export default async function MapPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Map');
  return (
    <>
      <h1 className="sr-only">{t('h1')}</h1>
      <EventsGlobe />
    </>
  );
}
