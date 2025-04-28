/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // serverActions option removed as it's now available by default
  },
  images: {
    domains: ['example.com'],
  },
};

module.exports = nextConfig; 