'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { GeocodingResult } from '@/hooks/use-property-geocoding'

export interface PropertyMapProps {
    address?: string
    lat?: number | null
    lng?: number | null
    onLocationSelect?: (lat: number, lng: number, addressData?: GeocodingResult) => void
    readOnly?: boolean
    zoom?: number
}

const containerStyle = { width: '100%', height: '300px', borderRadius: '1rem' }

// Carregamento dinâmico (Leaflet precisa do DOM)
const PropertyMapInner = dynamic(
    () => import('./PropertyMapInner'),
    {
        ssr: false,
        loading: () => (
            <div style={containerStyle} className="bg-muted/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" />
            </div>
        ),
    }
)

export function PropertyMap(props: PropertyMapProps) {
    return <PropertyMapInner {...props} />
}
