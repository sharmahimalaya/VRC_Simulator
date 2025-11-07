/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    loader: 'custom',
    loaderFile: './image-loader.js',
  },
  basePath: '/VRC_Simulator',
  assetPrefix: '/VRC_Simulator',
};

module.exports = nextConfig;


// C:\Users\himal\Documents\Projects\vrc-simulator\out