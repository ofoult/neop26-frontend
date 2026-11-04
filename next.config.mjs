import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// MapLibre v6 (the /map globe) parses tiles in an ES-module web worker that
// must be served as its own file. Bundling it through webpack fails the
// production build (Terser minifies it as a classic script and chokes on
// `export`), so copy it verbatim into public/ — versioned in the filename for
// cache-busting — every time Next loads its config (dev and build alike; the
// Dockerfile's builder stage runs `pnpm build` before copying public/).
// `.js`, not `.mjs`: guarantees a JavaScript MIME type, which module workers require.
const require = createRequire(import.meta.url);
const maplibreDir = path.dirname(require.resolve('maplibre-gl/package.json'));
const maplibreVersion = JSON.parse(readFileSync(path.join(maplibreDir, 'package.json'), 'utf8')).version;
const maplibreWorkerPath = `/vendor/maplibre-gl-worker-${maplibreVersion}.js`;
mkdirSync('public/vendor', { recursive: true });
copyFileSync(path.join(maplibreDir, 'dist/maplibre-gl-worker.mjs'), `public${maplibreWorkerPath}`);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output bundles a minimal server + only the deps actually used,
  // so the Docker runtime image doesn't need node_modules or the pnpm store.
  output: 'standalone',
  env: { NEXT_PUBLIC_MAPLIBRE_WORKER_URL: maplibreWorkerPath },
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
