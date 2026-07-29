import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Remote event artwork comes from Gigsberg and (in the design reference) Unsplash.
    remotePatterns: [
      { protocol: 'https', hostname: 'gigsberg.com' },
      { protocol: 'https', hostname: '**.gigsberg.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    // Event artwork rarely if ever changes for a given URL — cache optimized
    // variants for 30 days instead of Next's default minute-scale TTL, so
    // repeat crawls/visits of the same page don't re-run image optimization.
    minimumCacheTTL: 2592000,
  },
};

export default withNextIntl(nextConfig);
