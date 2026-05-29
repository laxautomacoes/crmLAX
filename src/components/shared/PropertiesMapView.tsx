'use client'

import dynamic from 'next/dynamic'

// Tipos para o componente
export interface PropertiesMapViewProps {
    properties: any[]
    onPropertyClick?: (property: any) => void
    selectedPropertyId?: string
    className?: string
    tenantSlug?: string
    compact?: boolean
}

// Componente wrapper que carrega o mapa dinamicamente (Leaflet precisa do DOM)
const PropertiesMapViewInner = dynamic(
    () => import('./PropertiesMapViewInner'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-muted/30 rounded-xl">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <span className="text-sm text-muted-foreground font-medium">Carregando mapa...</span>
                </div>
            </div>
        ),
    }
)

export function PropertiesMapView(props: PropertiesMapViewProps) {
    return <PropertiesMapViewInner {...props} />
}
