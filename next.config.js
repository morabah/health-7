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
      {
        source: '/book-appointment/:doctorId',
        destination: '/platform/book-appointment/:doctorId',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig; 