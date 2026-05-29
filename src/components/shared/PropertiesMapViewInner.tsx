'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { PropertiesMapViewProps } from './PropertiesMapView'
import { PropertyMapCard } from './PropertyMapCard'

// Fix para ícones do Leaflet no Next.js — usando estilos inline para garantir visibilidade
const defaultIcon = L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#8B2332;position:relative;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><div style="width:6px;height:6px;background:#fff;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -26],
})

// Ícone para marcador selecionado
const selectedIcon = L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#404F4F;position:relative;transform:rotate(-45deg) scale(1.15);border:2px solid #FFE600;box-shadow:0 2px 8px rgba(0,0,0,0.35);"><div style="width:7px;height:7px;background:#FFE600;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
})

// Ícone customizado para cluster — estilo limpo (círculos brancos com número)
function createClusterCustomIcon(cluster: any) {
    const count = cluster.getChildCount()
    let px = 38
    let fs = 13
    if (count >= 10) { px = 44; fs = 14 }
    if (count >= 50) { px = 50; fs = 15 }

    return L.divIcon({
        html: `<div style="display:flex;align-items:center;justify-content:center;width:${px}px;height:${px}px;border-radius:50%;background:#fff;color:#333;font-weight:700;font-size:${fs}px;border:2px solid #ccc;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;cursor:pointer;"><span>${count}</span></div>`,
        className: '',
        iconSize: L.point(px, px, true),
    })
}

// Componente para auto-fit dos bounds
function FitBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap()

    useEffect(() => {
        if (positions.length === 0) return

        if (positions.length === 1) {
            map.setView(positions[0], 14)
        } else {
            const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])))
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
        }
    }, [positions, map])

    return null
}

export default function PropertiesMapViewInner({
    properties,
    onPropertyClick,
    selectedPropertyId,
    className = '',
    tenantSlug,
    compact = false,
}: PropertiesMapViewProps) {
    const [activeProperty, setActiveProperty] = useState<any | null>(null)

    // Filtra apenas imóveis com coordenadas válidas
    const geoProperties = useMemo(() => {
        return properties.filter(p => {
            const lat = p.details?.endereco?.latitude
            const lng = p.details?.endereco?.longitude
            return lat && lng && !isNaN(lat) && !isNaN(lng)
        })
    }, [properties])

    // Posições para fit bounds
    const positions = useMemo<[number, number][]>(() => {
        return geoProperties.map(p => [
            p.details.endereco.latitude,
            p.details.endereco.longitude,
        ])
    }, [geoProperties])

    // Centro padrão (Florianópolis) caso não haja imóveis
    const defaultCenter: [number, number] = [-27.5954, -48.5480]

    if (geoProperties.length === 0) {
        return (
            <div className={`w-full flex items-center justify-center bg-card border border-border rounded-xl p-12 ${className}`}
                 style={{ minHeight: compact ? '300px' : '500px' }}
            >
                <div className="text-center">
                    <div className="text-4xl mb-3">📍</div>
                    <p className="text-sm font-bold text-foreground mb-1">
                        Nenhum imóvel com localização
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Os imóveis precisam ter endereço com coordenadas para aparecerem no mapa.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className={`w-full rounded-xl overflow-hidden border border-border shadow-sm relative z-0 ${className}`}
             style={{ minHeight: compact ? '300px' : '500px', height: compact ? '100%' : '70vh' }}
        >
            <MapContainer
                center={positions.length > 0 ? positions[0] : defaultCenter}
                zoom={12}
                className="w-full h-full"
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                />

                <FitBounds positions={positions} />

                <MarkerClusterGroup
                    chunkedLoading
                    iconCreateFunction={createClusterCustomIcon}
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={false}
                    zoomToBoundsOnClick={true}
                    animate={true}
                >
                    {geoProperties.map((property) => {
                        const lat = property.details.endereco.latitude
                        const lng = property.details.endereco.longitude
                        const isSelected = property.id === selectedPropertyId

                        return (
                            <Marker
                                key={property.id}
                                position={[lat, lng]}
                                icon={isSelected ? selectedIcon : defaultIcon}
                                eventHandlers={{
                                    click: () => {
                                        setActiveProperty(property)
                                    },
                                }}
                            >
                                <Popup
                                    closeButton={true}
                                    minWidth={280}
                                    maxWidth={320}
                                    className="property-map-popup"
                                >
                                    <PropertyMapCard
                                        property={property}
                                        tenantSlug={tenantSlug}
                                        onViewDetails={() => onPropertyClick?.(property)}
                                    />
                                </Popup>
                            </Marker>
                        )
                    })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    )
}
