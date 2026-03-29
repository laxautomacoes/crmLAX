'use client'

import { useCallback, useState } from 'react'
import { useJsApiLoader, Libraries } from '@react-google-maps/api'

const libraries: Libraries = ['places', 'geometry']

export interface GeocodingResult {
    rua?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
    latitude: number
    longitude: number
}

export function usePropertyGeocoding() {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries
    })

    const [isGeocoding, setIsGeocoding] = useState(false)

    const geocodeAddress = useCallback(async (address: string): Promise<google.maps.LatLngLiteral | null> => {
        if (!isLoaded || !address) return null

        return new Promise((resolve) => {
            const geocoder = new google.maps.Geocoder()
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results?.[0]?.geometry?.location) {
                    const location = results[0].geometry.location
                    resolve({ lat: location.lat(), lng: location.lng() })
                } else {
                    console.error('Geocoding failed:', status)
                    resolve(null)
                }
            })
        })
    }, [isLoaded])

    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<GeocodingResult | null> => {
        if (!isLoaded) return null

        setIsGeocoding(true)
        return new Promise((resolve) => {
            const geocoder = new google.maps.Geocoder()
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                setIsGeocoding(false)
                if (status === 'OK' && results?.[0]) {
                    const result = results[0]
                    const data: GeocodingResult = {
                        latitude: lat,
                        longitude: lng
                    }

                    // Mapear componentes do endereço
                    result.address_components.forEach((component) => {
                        const types = component.types
                        if (types.includes('route')) data.rua = component.long_name
                        if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
                            data.bairro = component.long_name
                        }
                        if (types.includes('administrative_area_level_2')) data.cidade = component.long_name
                        if (types.includes('administrative_area_level_1')) data.estado = component.short_name
                        if (types.includes('postal_code')) data.cep = component.long_name
                    })

                    resolve(data)
                } else {
                    console.error('Reverse geocoding failed:', status)
                    resolve(null)
                }
            })
        })
    }, [isLoaded])

    return {
        isLoaded,
        loadError,
        isGeocoding,
        geocodeAddress,
        reverseGeocode
    }
}
