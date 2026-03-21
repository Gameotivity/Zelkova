/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zelkora/shared", "@zelkora/config"],
  experimental: {
    serverComponentsExternalPackages: ["ccxt", "postgres"],
  },
};

module.exports = nextConfig;
