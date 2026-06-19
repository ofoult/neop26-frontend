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
  },
};

export default nextConfig;
