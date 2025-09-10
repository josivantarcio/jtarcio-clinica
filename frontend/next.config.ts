import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizeCss: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://your-project.web.app/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://your-project.web.app/ws',
  },
  basePath: process.env.NODE_ENV === 'production' ? '/eo-clinica2' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/eo-clinica2' : '',
};

export default nextConfig;
