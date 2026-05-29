'use client';

import { useState } from 'react';
import { PropertyFilters } from './PropertyFilters';
import { PropertiesGrid } from './PropertiesGrid';
import { PropertiesList } from './PropertiesList';
import { WhatsAppButton } from './WhatsAppButton';
import { PropertiesMapView } from '@/components/shared/PropertiesMapView';

interface SiteSearchClientProps {
    properties: any[];
    tenantName: string;
    tenantSlug: string;
    whatsappNumber?: string | null;
    branding?: any;
}

export function SiteSearchClient({ properties, tenantName, tenantSlug, whatsappNumber, branding }: SiteSearchClientProps) {
    const [viewMode, setViewMode] = useState<'gallery' | 'list' | 'map'>('gallery');
    const [filters, setFilters] = useState({
        tipo: '',
        quartos: '',
        precoMin: '',
        precoMax: '',
        search: ''
    });

    const filteredProperties = properties.filter(property => {
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const titleLower = property.title.toLowerCase();
            const tipo = (property.details?.tipo_property || property.details?.type || '').toLowerCase();
            const bairro = (property.details?.endereco?.bairro || '').toLowerCase();
            if (!titleLower.includes(searchLower) && !tipo.includes(searchLower) && !bairro.includes(searchLower)) {
                return false;
            }
        }

        if (filters.tipo) {
            const tipo = (property.details?.tipo_property || property.details?.type || '').toLowerCase();
            if (!tipo.includes(filters.tipo.toLowerCase())) {
                return false;
            }
        }

        if (filters.quartos) {
            const dormitorios = String(property.details?.dormitorios || property.details?.quartos || property.details?.rooms || '');
            if (!dormitorios.includes(filters.quartos)) {
                return false;
            }
        }

        if (filters.precoMax && property.price) {
            const precoMax = parseFloat(filters.precoMax.replace(/[^\d,.-]/g, '').replace(',', '.'));
            if (!isNaN(precoMax) && Number(property.price) > precoMax) {
                return false;
            }
        }

        return true;
    });

    return (
        <>
            <PropertyFilters
                filters={filters}
                onFilterChange={setFilters}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            {properties.length === 0 || filteredProperties.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-border animate-in fade-in zoom-in duration-500">
                    <p className="text-xl font-bold text-foreground mb-2">
                        Nenhum imóvel disponível no momento
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Volte em breve para ver nossos imóveis!
                    </p>
                </div>
            ) : (
                <>
                    {/* Desktop: Split-view (lista + mapa) */}
                    <div className="hidden md:flex gap-6" style={{ height: '75vh' }}>
                        {/* Lista scrollável à esquerda */}
                        <div className="w-1/2 overflow-y-auto pr-2 custom-scrollbar">
                            <p className="text-xs text-muted-foreground mb-4 font-medium">
                                {filteredProperties.length} imóveis encontrados
                            </p>
                            {viewMode === 'list' ? (
                                <PropertiesList properties={filteredProperties} tenantSlug={tenantSlug} />
                            ) : (
                                <PropertiesGrid properties={filteredProperties} tenantSlug={tenantSlug} />
                            )}
                        </div>

                        {/* Mapa fixo à direita */}
                        <div className="w-1/2 sticky top-0">
                            <PropertiesMapView
                                properties={filteredProperties}
                                tenantSlug={tenantSlug}
                                compact
                                className="h-full"
                                onPropertyClick={(prop) => {
                                    if (prop.slug && prop.type) {
                                        window.open(`/site/${tenantSlug}/imovel/${prop.type}/${prop.slug}`, '_blank')
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Mobile: Toggle galeria/lista/mapa */}
                    <div className="md:hidden">
                        <p className="text-xs text-muted-foreground mb-4 font-medium">
                            {filteredProperties.length} imóveis encontrados
                        </p>
                        {viewMode === 'map' ? (
                            <PropertiesMapView
                                properties={filteredProperties}
                                tenantSlug={tenantSlug}
                                className="animate-in fade-in duration-300"
                                onPropertyClick={(prop) => {
                                    if (prop.slug && prop.type) {
                                        window.open(`/site/${tenantSlug}/imovel/${prop.type}/${prop.slug}`, '_blank')
                                    }
                                }}
                            />
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
