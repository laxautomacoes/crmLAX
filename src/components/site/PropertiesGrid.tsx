'use client';

import { PropertyCard } from './PropertyCard';

interface Property {
    id: string;
    title: string;
    price?: number | null;
    images?: string[] | null;
    videos?: string[] | null;
    documents?: any[] | null;
    details?: Record<string, any> | null;
}

interface PropertiesGridProps {
    properties: Property[];
    tenantSlug: string;
}

export function PropertiesGrid({ properties, tenantSlug }: PropertiesGridProps) {
    const filteredProperties = properties;

    if (filteredProperties.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-lg font-semibold text-foreground mb-2">
                    Nenhum property encontrado
                </p>
                <p className="text-sm text-muted-foreground">
                    Tente ajustar os filtros de busca.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} tenantSlug={tenantSlug} />
            ))}
        </div>
    );
}

