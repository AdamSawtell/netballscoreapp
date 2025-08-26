import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'netball2025'
  }
};

export default nextConfig;
