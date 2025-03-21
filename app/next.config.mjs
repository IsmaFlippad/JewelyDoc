/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  rewrites: async () => [
    {
      source: "/:path*", // Toutes les routes
      destination: "/frontend/:path*", // Fichiers statiques de Docusaurus
    },
  ],
};

export default nextConfig;