/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Aumenta o limite do body para rotas de API — necessário para upload de fotos JPG de câmera
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
}

export default nextConfig
