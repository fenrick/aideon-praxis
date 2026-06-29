const devHost = process.env.TAURI_DEV_HOST ?? 'localhost';

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  assetPrefix: process.env.NODE_ENV === 'development' ? `http://${devHost}:1420` : undefined,
  // Tauri WebView requests dev resources from 127.0.0.1; Next.js 16.2+ blocks
  // cross-origin dev resource requests by default (security feature added in 16.2.9).
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
