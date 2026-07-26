import type { Metadata } from 'next';
import { Instrument_Serif, Schibsted_Grotesk } from 'next/font/google';
import './globals.css';
import { Chrome } from '@/components/Chrome';
import { SITE_URL } from '@/lib/site';
import { Analytics } from '@vercel/analytics/next';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <div id="root" style={{ minHeight: '100vh' }}>
          <Chrome>{children}</Chrome>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
