'use client'

import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface PropertyMapProps {
    address?: string
    lat?: number | null
    lng?: number | null
    onLocationSelect?: (lat: number, lng: number) => void
    readOnly?: boolean
    zoom?: number
}

const containerStyle = {
    width: '100%',
    height: '300px',
    borderRadius: '1rem'
}

const defaultCenter = {
    lat: -23.55052, // São Paulo default
    lng: -46.633308
}

export function PropertyMap({ address, lat, lng, onLocationSelect, readOnly = false, zoom = 15 }: PropertyMapProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    })

    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(
        lat && lng ? { lat, lng } : null
    )

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map)
    }, [])

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null)
    }, [])

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (readOnly || !onLocationSelect || !e.latLng) return
        const newLat = e.latLng.lat()
        const newLng = e.latLng.lng()
        setMarkerPos({ lat: newLat, lng: newLng })
        onLocationSelect(newLat, newLng)
    }

    // Geocode address when it changes and we don't have lat/lng
    useEffect(() => {
        if (isLoaded && address && !lat && !lng) {
            const geocoder = new google.maps.Geocoder()
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results?.[0]?.geometry?.location) {
                    const location = results[0].geometry.location
                    const newPos = { lat: location.lat(), lng: location.lng() }
                    setMarkerPos(newPos)
                    if (map) {
                        map.panTo(newPos)
                    }
                    if (onLocationSelect) {
                        onLocationSelect(newPos.lat, newPos.lng)
                    }
                }
            })
        }
    }, [isLoaded, address, lat, lng, map, onLocationSelect])

    // Update marker when lat/lng props change
    useEffect(() => {
        if (lat && lng) {
            const newPos = { lat, lng }
            setMarkerPos(newPos)
            if (map) {
                map.panTo(newPos)
            }
        }
    }, [lat, lng, map])

    if (!isLoaded) {
        return (
            <div style={containerStyle} className="bg-muted flex items-center justify-center">
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
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={handleMapClick}
                options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                }}
            >
                {markerPos && <Marker position={markerPos} />}
            </GoogleMap>
            {!readOnly && (
                <p className="text-[10px] text-muted-foreground italic">
                    * Clique no mapa para ajustar a localização exata do imóvel.
                </p>
            )}
        </div>
    )
}
