/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 👈 Required for static export (replaces next export)
  // When deploying to GitHub Pages under a repo (username.github.io/<repo>),
  // set `basePath` and `assetPrefix` to the repository name so root-relative
  // asset paths resolve correctly.
  // Use the exact GitHub repo name (case-sensitive) so Pages paths match.
  basePath: '/VRC_Simulator',
  assetPrefix: '/VRC_Simulator/',
  // Expose to client code so components can build correct URLs for public assets
  env: {
    NEXT_PUBLIC_BASE_PATH: '/VRC_Simulator',
  },
  images: {
    unoptimized: true, // 👈 Optional: prevents Image Optimization API usage (not supported on Pages)
  },
};

module.exports = nextConfig;


// C:\Users\himal\Documents\Projects\vrc-simulator\out