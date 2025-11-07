import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export', // Enable static site export
  images: {
    unoptimized: true, // Prevent Image Optimization API (not supported on Pages)
  },
  // If building for GitHub Pages set the repo path, otherwise leave blank for local dev
  basePath: isGithubPages ? "/VRC_Simulator" : "",
  assetPrefix: isGithubPages ? "/VRC_Simulator/" : "",
  // Expose to client code so components can build correct URLs for public assets
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? "/VRC_Simulator" : "",
  },
};

module.exports = nextConfig;