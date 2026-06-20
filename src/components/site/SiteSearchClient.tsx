'use client';

import { useState } from 'react';
import { PropertyFilters } from './PropertyFilters';
import { PropertiesGrid } from './PropertiesGrid';
import { PropertiesList } from './PropertiesList';
import { WhatsAppButton } from './WhatsAppButton';
import { PropertiesMapView } from '@/components/shared/PropertiesMapView';
import { filterProperties } from '@/utils/property-filter';

interface SiteSearchClientProps {
    properties: any[]; tenantName: string; tenantSlug: string; whatsappNumber?: string | null; branding?: any;
}

export function SiteSearchClient({ properties = [], tenantSlug, whatsappNumber }: SiteSearchClientProps) {
    const [viewMode, setViewMode] = useState<'gallery' | 'list' | 'map'>('gallery');
    const [filters, setFilters] = useState({
        tipo: '', quartos: '', precoMin: '', precoMax: '', search: '',
        searchMode: 'standard' as 'standard' | 'code' | 'project',
        transactionType: 'venda' as 'venda' | 'aluguel' | 'lancamentos'
    });

    const filteredProperties = filterProperties(properties, filters, tenantSlug);
    const mapClick = (p: any) => p.slug && p.type && window.open(`/site/${tenantSlug}/imovel/${p.type}/${p.slug}`, '_blank');

    return (
        <>
            <PropertyFilters properties={properties} filters={filters} onFilterChange={setFilters} viewMode={viewMode} onViewModeChange={setViewMode} />

            {properties.length === 0 || filteredProperties.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-border animate-in fade-in zoom-in duration-500">
                    <p className="text-xl font-bold text-foreground mb-2">Nenhum imóvel disponível no momento</p>
                    <p className="text-sm text-muted-foreground">Volte em breve para ver nossos imóveis!</p>
                </div>
            ) : (
                <>
                    <div className="hidden md:flex gap-6" style={{ height: '75vh' }}>
                        <div className="w-1/2 overflow-y-auto pr-2 custom-scrollbar">
                            <p className="text-xs text-muted-foreground mb-4 font-medium">{filteredProperties.length} imóveis encontrados</p>
                            {viewMode === 'list' ? <PropertiesList properties={filteredProperties} tenantSlug={tenantSlug} /> : <PropertiesGrid properties={filteredProperties} tenantSlug={tenantSlug} />}
                        </div>
                        <div className="w-1/2 sticky top-0">
                            <PropertiesMapView properties={filteredProperties} tenantSlug={tenantSlug} compact className="h-full" onPropertyClick={mapClick} />
                        </div>
                    </div>

                    <div className="md:hidden">
                        <p className="text-xs text-muted-foreground mb-4 font-medium">{filteredProperties.length} imóveis encontrados</p>
                        {viewMode === 'map' ? (
                            <PropertiesMapView properties={filteredProperties} tenantSlug={tenantSlug} className="animate-in fade-in duration-300" onPropertyClick={mapClick} />
                        ) : viewMode === 'list' ? (
                            <PropertiesList properties={filteredProperties} tenantSlug={tenantSlug} />
                        ) : (
                            <PropertiesGrid properties={filteredProperties} tenantSlug={tenantSlug} />
                        )}
                    </div>
                </>
            )}
            {whatsappNumber && <WhatsAppButton phone={whatsappNumber} />}
        </>
    );
}
