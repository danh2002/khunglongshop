/** @type {import('next').NextConfig} */
for (const key of ["NEXTAUTH_URL", "NEXTAUTH_URL_INTERNAL"]) {
  if (process.env[key]?.trim() === "") delete process.env[key];
}

const nextConfig = {
    compiler: {
      styledComponents: true,
    },
    images: {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60 * 60 * 24 * 30,
        unoptimized: process.env.NODE_ENV === "development",
        remotePatterns: [
          {
            protocol: 'http',
            hostname: 'localhost',
          },
          {
            protocol: 'https',
            hostname: 'placehold.co',
            port: ""
          },
          {
            protocol: 'https',
            hostname: '*.public.blob.vercel-storage.com',
          },
        ],
      },
    experimental: {
      optimizePackageImports: ['react-icons'],
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
          ],
        },
      ];
    },
};

export default nextConfig;
