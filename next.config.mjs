/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next.js knows this is a hybrid app
  distDir: '.next',
  // Configure output to be compatible with Docusaurus
  output: 'standalone',
  // Only process API routes
  experimental: {
    appDir: true,
  },
  // Ensure Next.js doesn't try to build pages
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
}

export default nextConfig

