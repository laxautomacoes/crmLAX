'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PropertyFilters } from './PropertyFilters';
import { PropertiesGrid } from './PropertiesGrid';
import { PropertiesList } from './PropertiesList';
import { WhatsAppButton } from './WhatsAppButton';
import { SiteSectionRenderer } from './SiteSectionRenderer';
import { BackToTop } from './BackToTop';
import { SiteFooter } from './SiteFooter';
import { filterProperties } from '@/utils/property-filter';

interface SiteClientProps {
    properties: any[]; featuredProperties?: any[]; tenantName: string;
    tenantSlug: string; whatsappNumber?: string | null; branding?: any; isHomepage?: boolean;
}

export function SiteClient({
    properties = [], featuredProperties = [], tenantName, tenantSlug, whatsappNumber, branding, isHomepage = true
}: SiteClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [viewMode, setViewMode] = useState<'gallery' | 'list' | 'map'>('gallery');
    const getParam = (k: string, def = '') => searchParams.get(k) || def;
    
    const [filters, setFilters] = useState({
        tipo: getParam('tipo'), quartos: getParam('quartos'), precoMin: getParam('precoMin'), precoMax: getParam('precoMax'),
        search: getParam('search'), cidade: getParam('cidade'), bairro: getParam('bairro'), suites: getParam('suites'),
        banheiros: getParam('banheiros'), vagas: getParam('vagas'), areaMin: getParam('areaMin'), areaMax: getParam('areaMax'),
        codigo: getParam('codigo'), empreendimento: getParam('empreendimento'),
        mobiliado: getParam('mobiliado') === 'true', ofertas: getParam('ofertas') === 'true',
        searchMode: getParam('searchMode', 'standard') as 'standard' | 'code' | 'project',
        transactionType: getParam('transactionType', 'venda') as 'venda' | 'aluguel' | 'lancamentos'
    });

    const getParams = () => {
        const p = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v === true) p.set(k, 'true');
            else if (v && typeof v === 'string' && v !== 'standard' && v !== 'venda') p.set(k, v);
        });
        return p.toString();
    };

    useEffect(() => {
        if (isHomepage) return;
        const query = getParams();
        const currentQuery = window.location.search.replace(/^\?/, '');
        if (query !== currentQuery) {
            const isSitePath = window.location.pathname.startsWith('/site/');
            const targetPath = isSitePath ? `/site/${tenantSlug}/imoveis` : '/imoveis';
            router.replace(`${targetPath}${query ? `?${query}` : ''}`, { scroll: false });
        }
    }, [filters, isHomepage, tenantSlug, router]);

    const handleSearch = () => {
        const isSitePath = window.location.pathname.startsWith('/site/');
        const targetPath = isSitePath ? `/site/${tenantSlug}/imoveis` : '/imoveis';
        router.push(`${targetPath}?${getParams()}`);
    };

    const filteredProperties = filterProperties(properties, filters, tenantSlug);
    const bgImage = branding?.filter_bg_image || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=1920&auto=format&fit=crop';
    const filterTitle = branding?.filter_title || `Encontre seu imóvel em ${tenantName || 'sua cidade'}`;

    const filtersForm = isHomepage ? (
        <div id="imoveis" className="relative w-full py-16 md:py-24 px-4 bg-cover bg-center flex flex-col items-center justify-center min-h-[400px] mb-8" style={{ backgroundImage: `url(${bgImage})` }}>
            <div className="absolute inset-0 bg-black/60 z-0" />
            <div className="relative z-10 w-full max-w-[1200px] text-center space-y-6 md:space-y-8">
                <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-md tracking-tight max-w-[900px] mx-auto leading-tight">{filterTitle}</h1>
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="w-full">
                    <PropertyFilters properties={properties} filters={filters} onFilterChange={setFilters} viewMode={viewMode} onViewModeChange={setViewMode} mapUrl={`/site/${tenantSlug}/busca`} isHomepage={isHomepage} onSearch={handleSearch} />
                </form>
            </div>
        </div>
    ) : (
        <div id="imoveis" className="w-full max-w-[1600px] mx-auto px-4 mt-8 mb-8">
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                <PropertyFilters properties={properties} filters={filters} onFilterChange={setFilters} viewMode={viewMode} onViewModeChange={setViewMode} mapUrl={`/site/${tenantSlug}/busca`} isHomepage={isHomepage} onSearch={handleSearch} />
            </form>
        </div>
    );

    return (
        <>
            {isHomepage ? (
                <SiteSectionRenderer sections={branding?.site_sections} featuredProperties={featuredProperties} tenantName={tenantName} tenantSlug={tenantSlug} whatsappNumber={whatsappNumber} branding={branding}>
                    {filtersForm}
                </SiteSectionRenderer>
            ) : (
                <>
                    {filtersForm}
                    {properties.length === 0 || filteredProperties.length === 0 ? (
                        <div className="text-center py-20 bg-card rounded-2xl border border-border animate-in fade-in zoom-in duration-500">
                            <p className="text-xl font-bold text-foreground mb-2">Nenhum imóvel disponível no momento</p>
                            <p className="text-sm text-muted-foreground">Volte em breve para ver nossos imóveis!</p>
                        </div>
                    ) : (
                        <div className="max-w-[1600px] mx-auto px-4">
                            <p className="text-xs text-muted-foreground mb-4 font-medium">{filteredProperties.length} imóveis encontrados</p>
                            {viewMode === 'list' ? <PropertiesList properties={filteredProperties} tenantSlug={tenantSlug} /> : <PropertiesGrid properties={filteredProperties} tenantSlug={tenantSlug} />}
                        </div>
                    )}
                </>
            )}
            <SiteFooter tenantName={tenantName} branding={branding} />
            {whatsappNumber && <WhatsAppButton phone={whatsappNumber} />}
            <BackToTop />
        </>
    );
}
