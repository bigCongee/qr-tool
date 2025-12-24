/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: "build",
  basePath: "/qr-tool",
  env: {
    basePath: "/qr-tool"
  },
};

module.exports = nextConfig;
