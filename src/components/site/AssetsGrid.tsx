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
        marca: string;
        ano: string;
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
            const marca = (asset.details?.marca || asset.details?.brand || '').toLowerCase();
            if (!titleLower.includes(searchLower) && !marca.includes(searchLower)) {
                return false;
            }
        }

        // Filtro de marca
        if (filters.marca) {
            const marca = (asset.details?.marca || asset.details?.brand || '').toLowerCase();
            if (!marca.includes(filters.marca.toLowerCase())) {
                return false;
            }
        }

        // Filtro de ano
        if (filters.ano) {
            const ano = String(asset.details?.ano || asset.details?.year || '');
            if (!ano.includes(filters.ano)) {
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
                    Nenhum veículo encontrado
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

