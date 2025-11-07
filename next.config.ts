/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 👈 Required for static export (replaces next export)
  images: {
    unoptimized: true, // 👈 Optional: prevents Image Optimization API usage (not supported on Pages)
  },
};

module.exports = nextConfig;
