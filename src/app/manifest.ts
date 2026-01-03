import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'CRM LAX',
        short_name: 'CRM LAX',
        description: 'Plataforma vertical para revendas de veículos',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#404F4F',
        theme_color: '#404F4F',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    }
}
