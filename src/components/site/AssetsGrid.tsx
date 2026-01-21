'use client';

import { AssetCard } from './AssetCard';

interface Asset {
    id: string;
    title: string;
    price?: number | null;
    images?: string[] | null;
    details?: Record<string, any> | null;
}

interface AssetsGridProps {
    assets: Asset[];
    filters: {
        tipo: string;
        quartos: string;
        precoMin: string;
        precoMax: string;
        search: string;
    };
}

export function AssetsGrid({ assets, filters }: AssetsGridProps) {
    const filteredAssets = assets.filter(asset => {
        // Filtro de busca
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const titleLower = asset.title.toLowerCase();
            const tipo = (asset.details?.tipo_imovel || asset.details?.type || '').toLowerCase();
            if (!titleLower.includes(searchLower) && !tipo.includes(searchLower)) {
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

    if (filteredAssets.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-lg font-semibold text-[#404F4F] mb-2">
                    Nenhum imóvel encontrado
                </p>
                <p className="text-sm text-muted-foreground">
                    Tente ajustar os filtros de busca.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
            ))}
        </div>
    );
}

