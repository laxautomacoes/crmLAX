'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { usePropertyGeocoding, GeocodingResult } from '@/hooks/use-property-geocoding'
import type { PropertyMapProps } from './PropertyMap'

// Ícone padrão do marcador (mesmo estilo do PropertiesMapViewInner)
const defaultIcon = L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#8B2332;position:relative;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><div style="width:6px;height:6px;background:#fff;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -26],
})

const defaultCenter: [number, number] = [-23.55052, -46.633308]

// Componente para capturar cliques no mapa
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onClick(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}

// Componente para atualizar a view do mapa programaticamente
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap()

    useEffect(() => {
        map.setView(center, zoom)
    }, [center, zoom, map])

    return null
}

export default function PropertyMapInner({
    address,
    lat,
    lng,
    onLocationSelect,
    readOnly = false,
    zoom = 15,
}: PropertyMapProps) {
    const { geocodeAddress, reverseGeocode } = usePropertyGeocoding()
    const [markerPos, setMarkerPos] = useState<[number, number] | null>(
        lat && lng ? [lat, lng] : null
    )
    const [mapCenter, setMapCenter] = useState<[number, number]>(
        lat && lng ? [lat, lng] : defaultCenter
    )
    const geocodedAddressRef = useRef<string | null>(null)

    const handleMapClick = useCallback(async (clickLat: number, clickLng: number) => {
        if (readOnly || !onLocationSelect) return

        setMarkerPos([clickLat, clickLng])

        // Sincronização Reversa: Busca o endereço ao clicar no mapa
        const addressData = await reverseGeocode(clickLat, clickLng)
        onLocationSelect(clickLat, clickLng, addressData || undefined)
    }, [readOnly, onLocationSelect, reverseGeocode])

    // Geocodificação automática ao mudar o endereço (se não houver lat/lng)
    useEffect(() => {
        if (address && !lat && !lng && geocodedAddressRef.current !== address) {
            geocodedAddressRef.current = address
            geocodeAddress(address).then(pos => {
                if (pos) {
                    setMarkerPos([pos.lat, pos.lng])
                    setMapCenter([pos.lat, pos.lng])
                    onLocationSelect?.(pos.lat, pos.lng)
                }
            })
        }
    }, [address, lat, lng, geocodeAddress, onLocationSelect])

    // Atualiza marcador quando as props mudam externamente
    useEffect(() => {
        if (lat && lng) {
            setMarkerPos([lat, lng])
            setMapCenter([lat, lng])
        }
    }, [lat, lng])

    const containerStyle = useMemo(() => ({
        width: '100%',
        height: '300px',
        borderRadius: '4px',
    }), [])

    return (
        <div className="w-full space-y-2">
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                className="w-full h-full"
                style={containerStyle}
                zoomControl={true}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                />

                <MapUpdater center={mapCenter} zoom={zoom} />

                {!readOnly && <MapClickHandler onClick={handleMapClick} />}

                {markerPos && (
                    <Marker position={markerPos} icon={defaultIcon} />
                )}
            </MapContainer>
            {!readOnly && (
                <p className="text-[10px] text-muted-foreground italic">
                    * Clique no mapa para ajustar a localização exata e atualizar o endereço.
                </p>
            )}
        </div>
    )
}
