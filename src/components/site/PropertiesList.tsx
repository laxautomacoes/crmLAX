'use client';

import { PropertiesListItem } from './PropertiesListItem';

interface Property {
    id: string;
    title: string;
    price?: number | null;
    images?: string[] | null;
    videos?: string[] | null;
    documents?: any[] | null;
    details?: Record<string, any> | null;
}

interface PropertiesListProps {
    properties: Property[];
    tenantSlug: string;
}

export function PropertiesList({ properties, tenantSlug }: PropertiesListProps) {
    if (properties.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-lg font-semibold text-foreground mb-2">Nenhum property encontrado</p>
                <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {properties.map((property) => (
                <PropertiesListItem key={property.id} property={property} tenantSlug={tenantSlug} />
            ))}
        </div>
    );
}
