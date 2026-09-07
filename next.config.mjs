import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output bundles a minimal server + only the deps actually used,
  // so the Docker runtime image doesn't need node_modules or the pnpm store.
  output: 'standalone',
  images: {
    // Remote event artwork comes from Gigsberg and (in the design reference) Unsplash.
    remotePatterns: [
      { protocol: 'https', hostname: 'gigsberg.com' },
      { protocol: 'https', hostname: '**.gigsberg.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    // AVIF first (smaller than WebP at equal quality); browsers without AVIF
    // support fall back to WebP automatically via content negotiation.
    formats: ['image/avif', 'image/webp'],
  },
};

export default withNextIntl(nextConfig);
