/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This is important to allow API routes to work alongside Docusaurus
  // The API routes will be served from /api/* while Docusaurus handles the rest
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "/api/:path*",
      },
    ]
  },
}

module.exports = nextConfig

