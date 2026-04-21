import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração padrão sem next-intl
  trailingSlash: false,

  // Configuração de imagens
  images: {
    unoptimized: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90],
  },

  // Experimental: Otimização de CSS para PageSpeed
  experimental: {
    optimizeCss: false, // VETO: Disabling experimental feature to ensure boot reliability
  },
};

export default nextConfig;
