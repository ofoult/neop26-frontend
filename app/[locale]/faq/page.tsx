import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StaticPage } from '@/components/StaticPage';
import { hreflangAlternates, localePath } from '@/lib/hreflang';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'Footer' });
  return {
    title: t('faq'),
    alternates: {
      canonical: localePath('/faq', params.locale),
      languages: hreflangAlternates('/faq'),
    },
  };
}

export default async function FaqPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Footer');
  const tp = await getTranslations('StaticPages');

  const faqs: [string, React.ReactNode][] = [
    [tp('faqQ1'), tp('faqA1')],
    [tp('faqQ2'), tp('faqA2')],
    [
      tp('faqQ3'),
      tp.rich('faqA3', { email: (chunks) => <a href="mailto:contact@neop.events">{chunks}</a> }),
    ],
  ];

  return (
    <StaticPage title={t('faq')}>
      {faqs.map(([q, a]) => (
        <div key={q}>
          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 17, marginBottom: 6 }}>{q}</div>
          <p style={{ margin: 0 }}>{a}</p>
        </div>
      ))}
    </StaticPage>
  );
}
