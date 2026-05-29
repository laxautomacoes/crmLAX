'use client'

import { useCallback, useState } from 'react'

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
    const [isGeocoding, setIsGeocoding] = useState(false)

    const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
        if (!address) return null

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=br&limit=1`,
                { headers: { 'Accept-Language': 'pt-BR' } }
            )
            const data = await response.json()

            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                }
            }
            return null
        } catch (error) {
            console.error('Geocoding failed:', error)
            return null
        }
    }, [])

    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<GeocodingResult | null> => {
        setIsGeocoding(true)
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                { headers: { 'Accept-Language': 'pt-BR' } }
            )
            const data = await response.json()

            if (data && data.address) {
                const addr = data.address
                const result: GeocodingResult = {
                    latitude: lat,
                    longitude: lng,
                    rua: addr.road || addr.pedestrian || addr.highway || undefined,
                    bairro: addr.suburb || addr.neighbourhood || addr.city_district || undefined,
                    cidade: addr.city || addr.town || addr.municipality || undefined,
                    estado: addr.state_code?.toUpperCase() || addr.state || undefined,
                    cep: addr.postcode || undefined
                }
                return result
            }
            return null
        } catch (error) {
            console.error('Reverse geocoding failed:', error)
            return null
        } finally {
            setIsGeocoding(false)
        }
    }, [])

    return {
        isLoaded: true, // Nominatim não precisa carregar SDK
        loadError: null,
        isGeocoding,
        geocodeAddress,
        reverseGeocode
    }
}
