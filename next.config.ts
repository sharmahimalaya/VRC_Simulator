import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export',                     // Enable static site export
  images: {
    unoptimized: true,                  // Required for static export + next/image
  },
  basePath: isGithubPages ? "/VRC_Simulator" : "",
  assetPrefix: isGithubPages ? "/VRC_Simulator/" : "",
};

export default nextConfig;
