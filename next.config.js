/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  turbopack: {
    // Force Turbopack to treat this package as the project root when multiple lockfiles exist.
    root: __dirname,
  },
};

module.exports = nextConfig;
