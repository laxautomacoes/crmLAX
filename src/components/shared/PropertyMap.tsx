'use client'

import { GoogleMap, Marker } from '@react-google-maps/api'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { usePropertyGeocoding, GeocodingResult } from '@/hooks/use-property-geocoding'

interface PropertyMapProps {
    address?: string
    lat?: number | null
    lng?: number | null
    onLocationSelect?: (lat: number, lng: number, addressData?: GeocodingResult) => void
    readOnly?: boolean
    zoom?: number
}

const containerStyle = { width: '100%', height: '300px', borderRadius: '1rem' }
const defaultCenter = { lat: -23.55052, lng: -46.633308 }

export function PropertyMap({ address, lat, lng, onLocationSelect, readOnly = false, zoom = 15 }: PropertyMapProps) {
    const { isLoaded, loadError, geocodeAddress, reverseGeocode } = usePropertyGeocoding()
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(
        lat && lng ? { lat, lng } : null
    )

    const handleMapClick = async (e: google.maps.MapMouseEvent) => {
        if (readOnly || !onLocationSelect || !e.latLng) return
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        setMarkerPos(newPos)
        
        // Sincronização Reversa: Busca o endereço ao clicar no mapa
        const addressData = await reverseGeocode(newPos.lat, newPos.lng)
        onLocationSelect(newPos.lat, newPos.lng, addressData || undefined)
    }

    // Geocodificação automática ao mudar o endereço (se não houver lat/lng)
    useEffect(() => {
        if (isLoaded && address && !lat && !lng) {
            geocodeAddress(address).then(pos => {
                if (pos) {
                    setMarkerPos(pos)
                    map?.panTo(pos)
                    onLocationSelect?.(pos.lat, pos.lng)
                }
            })
        }
    }, [isLoaded, address, lat, lng, map, geocodeAddress, onLocationSelect])

    // Atualiza marcador quando as props mudam externamente
    useEffect(() => {
        if (lat && lng) {
            const newPos = { lat, lng }
            setMarkerPos(newPos)
            map?.panTo(newPos)
        }
    }, [lat, lng, map])

    if (loadError) {
        return (
            <div style={containerStyle} className="bg-red-50 border border-red-100 flex flex-col items-center justify-center p-6 text-center gap-3">
                <AlertTriangle className="text-red-500" size={32} />
                <p className="text-xs font-bold text-red-800">Erro ao carregar o Google Maps</p>
                <p className="text-[10px] text-red-600">Verifique se a chave de API e o faturamento estão ativos no Google Cloud.</p>
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div style={containerStyle} className="bg-muted/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="w-full space-y-2">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={markerPos || defaultCenter}
                zoom={zoom}
                onLoad={setMap}
                onUnmount={() => setMap(null)}
                onClick={handleMapClick}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
            >
                {markerPos && <Marker position={markerPos} />}
            </GoogleMap>
            {!readOnly && (
                <p className="text-[10px] text-muted-foreground italic">
                    * Clique no mapa para ajustar a localização exata e atualizar o endereço.
                </p>
            )}
        </div>
    )
}
