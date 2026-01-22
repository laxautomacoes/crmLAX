'use client';

import { useState } from 'react';
import { AssetFilters } from './AssetFilters';
import { AssetsGrid } from './AssetsGrid';
import { AssetsList } from './AssetsList';
import { WhatsAppButton } from './WhatsAppButton';

interface SiteClientProps {
    assets: any[];
    tenantName: string;
    whatsappNumber?: string | null;
}

export function SiteClient({ assets, tenantName, whatsappNumber }: SiteClientProps) {
    const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
    const [filters, setFilters] = useState({
        tipo: '',
        quartos: '',
        precoMin: '',
        precoMax: '',
        search: ''
    });

    const filteredAssets = assets.filter(asset => {
        // Filtro de busca
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const titleLower = asset.title.toLowerCase();
            const tipo = (asset.details?.tipo_imovel || asset.details?.type || '').toLowerCase();
            const bairro = (asset.details?.endereco?.bairro || '').toLowerCase();
            if (!titleLower.includes(searchLower) && !tipo.includes(searchLower) && !bairro.includes(searchLower)) {
                return false;
            }
        }

        // Filtro de tipo
        if (filters.tipo) {
            const tipo = (asset.details?.tipo_imovel || asset.details?.type || '').toLowerCase();
            if (!tipo.includes(filters.tipo.toLowerCase())) {
                return false;
            }
        }

        // Filtro de quartos
        if (filters.quartos) {
            const quartos = String(asset.details?.quartos || asset.details?.rooms || '');
            if (!quartos.includes(filters.quartos)) {
                return false;
            }
        }

        // Filtro de preço máximo
        if (filters.precoMax && asset.price) {
            const precoMax = parseFloat(filters.precoMax.replace(/[^\d,.-]/g, '').replace(',', '.'));
            if (!isNaN(precoMax) && Number(asset.price) > precoMax) {
                return false;
            }
        }

        return true;
    });

    if (!assets || assets.length === 0) {
        return (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
                <p className="text-lg font-semibold text-[#404F4F] mb-2">
                    Nenhum imóvel disponível no momento
                </p>
                <p className="text-sm text-muted-foreground">
                    Volte em breve para ver nossos imóveis!
                </p>
            </div>
        );
    }

    return (
        <>
            <AssetFilters
                filters={filters}
                onFilterChange={setFilters}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />
            {viewMode === 'gallery' ? (
                <AssetsGrid assets={filteredAssets} />
            ) : (
                <AssetsList assets={filteredAssets} />
            )}
            {whatsappNumber && <WhatsAppButton phone={whatsappNumber} />}
        </>
    );
}

