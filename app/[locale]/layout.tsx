import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Instrument_Serif, Schibsted_Grotesk } from 'next/font/google';
import '../globals.css';
import { Chrome } from '@/components/Chrome';
import { SITE_URL } from '@/lib/site';
import { Analytics } from '@vercel/analytics/next';
import { routing, type Locale } from '@/i18n/routing';

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

const DESCRIPTION = "Tickets to the world's best live events. Verified sellers, every seat guaranteed.";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Base metadata is still English-only in this phase — per-locale metadata
// translation is deferred (see frontend/CLAUDE.md's Internationalization section).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "neop — tickets to the world's best events",
    template: '%s | neop',
  },
  description: DESCRIPTION,
  openGraph: {
    siteName: 'neop',
    title: "neop — tickets to the world's best events",
    description: DESCRIPTION,
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "neop — tickets to the world's best events",
    description: DESCRIPTION,
  },
};

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
  const dir = locale === 'he' ? 'rtl' : 'ltr';

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
