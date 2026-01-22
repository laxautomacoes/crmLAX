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
}

export function AssetsGrid({ assets }: AssetsGridProps) {
    const filteredAssets = assets;

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

