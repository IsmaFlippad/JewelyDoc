/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ajoutez d'autres configurations si nécessaire
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/app/api/:path*',
      },
    ];
  },
};

export default nextConfig;