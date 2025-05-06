/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // serverActions option removed as it's now available by default
  },
  images: {
    domains: ['example.com'],
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