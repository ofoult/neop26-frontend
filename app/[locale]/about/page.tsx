import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StaticPage } from '@/components/StaticPage';
import { hreflangAlternates, localePath } from '@/lib/hreflang';
import { jsonLdScript, organizationJsonLd } from '@/lib/jsonld';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'About' });
  return {
    title: t('h1'),
    description: t('metaDescription'),
    alternates: {
      canonical: localePath('/about', params.locale),
      languages: hreflangAlternates('/about'),
    },
  };
}

const h2Style = { fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '8px 0 0' };
const emailLink = (chunks: React.ReactNode) => <a href="mailto:contact@neop.events">{chunks}</a>;

export default async function AboutPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('About');

  return (
    <StaticPage title={t('h1')}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd(t('schemaDescription'))) }}
      />

      <section>
        <h2 style={h2Style}>{t('missionTitle')}</h2>
        <p>{t('missionBody')}</p>
      </section>

      <section>
        <h2 style={h2Style}>{t('howTitle')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>{t('howStep1Title')}</div>
            <p style={{ margin: '2px 0 0' }}>{t('howStep1Body')}</p>
          </div>
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>{t('howStep2Title')}</div>
            <p style={{ margin: '2px 0 0' }}>{t('howStep2Body')}</p>
          </div>
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>{t('howStep3Title')}</div>
            <p style={{ margin: '2px 0 0' }}>{t('howStep3Body')}</p>
          </div>
        </div>
        <p style={{ marginTop: 12 }}>{t('howNote')}</p>
      </section>

      <section>
        <h2 style={h2Style}>{t('guaranteeTitle')}</h2>
        <p>{t('guaranteeIntro')}</p>
        <ul style={{ margin: 0, marginInlineStart: 20, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>{t('guaranteeItem1')}</li>
          <li>{t('guaranteeItem2')}</li>
          <li>{t('guaranteeItem3')}</li>
        </ul>
        <p style={{ marginTop: 12 }}>{t.rich('guaranteeHow', { email: emailLink })}</p>
      </section>

      <section>
        <h2 style={h2Style}>{t('securityTitle')}</h2>
        <p>{t('securityBody')}</p>
      </section>

      <section>
        <h2 style={h2Style}>{t('languagesTitle')}</h2>
        <p>{t('languagesBody')}</p>
      </section>

      <section>
        <h2 style={h2Style}>{t('contactTitle')}</h2>
        <p>{t.rich('contactBody', { email: emailLink })}</p>
      </section>

      <section>
        <h2 style={h2Style}>{t('legalTitle')}</h2>
        <p>{t.rich('legalBody', { email: emailLink })}</p>
      </section>
    </StaticPage>
  );
}
