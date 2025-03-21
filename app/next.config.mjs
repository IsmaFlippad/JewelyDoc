/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Pour une meilleure compatibilité avec Vercel
  distDir: '.next', // Dossier de build Next.js
};

module.exports = nextConfig;