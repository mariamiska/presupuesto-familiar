import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Presupuesto Familiar',
    short_name: 'Presupuesto',
    description: 'Gestión de finanzas familiares Servin',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2C3E50',
    orientation: 'portrait',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  }
}
