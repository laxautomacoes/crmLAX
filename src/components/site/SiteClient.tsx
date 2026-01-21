'use client';

import { useState } from 'react';
import { AssetFilters } from './AssetFilters';
import { AssetsGrid } from './AssetsGrid';
import { WhatsAppButton } from './WhatsAppButton';

interface SiteClientProps {
    assets: any[];
    tenantName: string;
    whatsappNumber?: string | null;
}

export function SiteClient({ assets, tenantName, whatsappNumber }: SiteClientProps) {
    const [filters, setFilters] = useState({
        tipo: '',
        quartos: '',
        precoMin: '',
        precoMax: '',
        search: ''
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
            <AssetFilters filters={filters} onFilterChange={setFilters} />
            <AssetsGrid assets={assets} filters={filters} />
            {whatsappNumber && <WhatsAppButton phone={whatsappNumber} />}
        </>
    );
}

