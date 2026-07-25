/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse accede a archivos de test en runtime; evitamos que webpack los bundlee
      config.externals = [...(config.externals || []), 'canvas', 'pdfjs-dist']
    }
    return config
  },
}

export default nextConfig
