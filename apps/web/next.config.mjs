import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

/** Local/API origin for same-origin cookie auth during development. */
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  /**
   * Proxy API under the web origin so HttpOnly refresh cookies are first-party
   * on localhost (cross-port cookies are blocked by modern browsers).
   */
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${API_PROXY_TARGET}/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/platform',
        destination: '/platform/dashboard',
        permanent: false,
      },
    ];
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(self)',
        },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
