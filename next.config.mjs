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
        // Keep generated optimizer widths aligned with audited rendered image slots.
        deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920],
        imageSizes: [24, 38, 48, 52, 56, 60, 72, 80, 88, 120, 180, 200, 220, 260, 340, 360, 420],
        qualities: [75],
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
