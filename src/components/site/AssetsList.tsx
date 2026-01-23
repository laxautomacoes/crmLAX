'use client';

import { AssetsListItem } from './AssetsListItem';

interface Asset {
    id: string;
    title: string;
    price?: number | null;
    images?: string[] | null;
    videos?: string[] | null;
    documents?: any[] | null;
    details?: Record<string, any> | null;
}

interface AssetsListProps {
    assets: Asset[];
}

export function AssetsList({ assets }: AssetsListProps) {
    if (assets.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-lg font-semibold text-foreground mb-2">Nenhum imóvel encontrado</p>
                <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {assets.map((asset) => (
                <AssetsListItem key={asset.id} asset={asset} />
            ))}
        </div>
    );
}
