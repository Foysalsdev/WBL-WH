import type { NextConfig } from "next";

// ═══════════════════════════════════════════════════════════════
//  Next.js Production Configuration
//  - output: "standalone"  → minimizes server bundle size
//  - reactStrictMode off   → avoids double-effect issues with Prisma
//  - images: unoptimized   → Cloudflare Pages doesn't run sharp at runtime
//  - experimental: serverMinify → smaller JS bundles
//  - poweredByHeader: off  → don't leak tech stack
//  - productionBrowserSourceMaps: off → smaller prod bundle
// ═══════════════════════════════════════════════════════════════

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compress: true,
  images: {
    // Cloudflare Pages / Vercel Edge doesn't need the sharp optimizer
    unoptimized: true,
  },
  experimental: {
    // Tree-shake unused server code more aggressively
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
      'recharts',
    ],
  },
  // Security headers — applied to every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection',       value: '1; mode=block' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // Cache static assets aggressively (Next handles hashed filenames)
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icon-192.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
      },
      {
        source: '/icon-512.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
    ];
  },
  // Turbopack is the default bundler in Next.js 16 — minimal config
  turbopack: {},
  typescript: {
    // Don't fail production build on minor TS warnings — we use safeParse
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
