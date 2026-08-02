import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Instrument_Serif, Schibsted_Grotesk } from 'next/font/google';
import '../globals.css';
import { Chrome } from '@/components/Chrome';
import { SITE_URL } from '@/lib/site';
import { Analytics } from '@vercel/analytics/next';
import { routing, type Locale } from '@/i18n/routing';
import { isRtlLocale } from '@/lib/rtl';
import { ogAlternateLocales, ogLocale } from '@/lib/hreflang';

const sans = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Title/description are localized via the `Metadata` namespace (see
// messages/*.json) so pages that don't define their own generateMetadata —
// home, browse, checkout, confirmation — get real per-locale copy instead of
// English text under a translated hreflang. `openGraph.locale`/`alternateLocale`
// are also set here since they're valid for every page regardless of path;
// canonical/hreflang alternates are deliberately NOT set at this level
// (they're path-specific — set only by pages that define their own
// generateMetadata, e.g. the home page and event/performer/venue detail
// pages, so routes without their own metadata keep behaving exactly as
// before rather than inheriting an incorrect "/" canonical).
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const title = t('title');
  const description = t('description');
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: '%s | neop',
    },
    description,
    openGraph: {
      siteName: 'neop',
      title,
      description,
      url: '/',
      type: 'website',
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocales(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enables static rendering for this locale segment (see next-intl docs).
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = isRtlLocale(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={`${sans.variable} ${serif.variable}`}>
      <body>
        <div id="root" style={{ minHeight: '100vh' }}>
          <NextIntlClientProvider messages={messages}>
            <Chrome>{children}</Chrome>
          </NextIntlClientProvider>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
