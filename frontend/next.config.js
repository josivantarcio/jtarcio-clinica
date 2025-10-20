/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'localhost',
      process.env.NEXT_PUBLIC_API_URL?.replace('https://', '').replace('http://', '') || ''
    ].filter(Boolean),
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Configurações para Railway
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

module.exports = nextConfig
