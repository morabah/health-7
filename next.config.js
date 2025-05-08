/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  trailingSlash: true,
  experimental: {
    // No experimental options needed
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      // Handle any requests with /platform in the URL (cleanup old links)
      {
        source: '/platform/book-appointment/:doctorId',
        destination: '/book-appointment/:doctorId',
        permanent: true,
      },
      // Remove the self-redirect which causes an infinite loop
    ];
  },
};

module.exports = nextConfig;
