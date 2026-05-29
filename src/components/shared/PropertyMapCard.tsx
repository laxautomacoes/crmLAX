'use client'

import { Bed, Bath, Car, Maximize } from 'lucide-react'

interface PropertyMapCardProps {
    property: any
    tenantSlug?: string
    onViewDetails?: () => void
}

function formatPrice(price: number | string | null | undefined): string {
    if (!price) return 'Sob consulta'
    const num = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(num)) return 'Sob consulta'
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

const typeLabels: Record<string, string> = {
    house: 'Casa',
    apartment: 'Apartamento',
    land: 'Terreno',
    commercial: 'Comercial',
    penthouse: 'Cobertura',
    studio: 'Studio',
    rural: 'Rural',
    warehouse: 'Galpão',
    office: 'Sala/Escritório',
    store: 'Loja',
}

export function PropertyMapCard({ property, tenantSlug, onViewDetails }: PropertyMapCardProps) {
    const details = property.details || {}
    const endereco = details.endereco || {}
    const firstImage = Array.isArray(property.images) && property.images.length > 0
        ? property.images[0]
        : null

    const dormitorios = details.dormitorios || details.quartos || 0
    const banheiros = details.banheiros || 0
    const vagas = details.vagas || 0
    const area = details.area_privativa || details.area_total || 0
    const bairro = endereco.bairro || ''
    const cidade = endereco.cidade || ''
    const location = [bairro, cidade].filter(Boolean).join(', ')
    const typeLabel = typeLabels[property.type] || property.type || ''

    return (
        <div className="property-map-card">
            {/* Imagem */}
            {firstImage && (
                <div className="property-map-card-image">
                    <img
                        src={firstImage}
                        alt={property.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    {typeLabel && (
                        <span className="property-map-card-badge">
                            {typeLabel}
                        </span>
                    )}
                </div>
            )}

            {/* Conteúdo */}
            <div className="property-map-card-content">
                <h4 className="property-map-card-title">
                    {property.title}
                </h4>

                {location && (
                    <p className="property-map-card-location">
                        {location}
                    </p>
                )}

                <p className="property-map-card-price">
                    {formatPrice(property.price)}
                </p>

                {/* Atributos */}
                <div className="property-map-card-attrs">
                    {dormitorios > 0 && (
                        <span className="property-map-card-attr">
                            <Bed size={13} />
                            {dormitorios}
                        </span>
                    )}
                    {banheiros > 0 && (
                        <span className="property-map-card-attr">
                            <Bath size={13} />
                            {banheiros}
                        </span>
                    )}
                    {vagas > 0 && (
                        <span className="property-map-card-attr">
                            <Car size={13} />
                            {vagas}
                        </span>
                    )}
                    {area > 0 && (
                        <span className="property-map-card-attr">
                            <Maximize size={13} />
                            {area}m²
                        </span>
                    )}
                </div>

                {/* Botão */}
                {onViewDetails && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onViewDetails()
                        }}
                        className="property-map-card-btn"
                    >
                        Ver Detalhes
                    </button>
                )}
            </div>
        </div>
    )
}
