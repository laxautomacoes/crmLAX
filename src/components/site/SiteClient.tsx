'use client';

import { useState } from 'react';
import { AssetFilters } from './AssetFilters';
import { AssetsGrid } from './AssetsGrid';
import { AssetsList } from './AssetsList';
import { WhatsAppButton } from './WhatsAppButton';
import { Instagram, Facebook, Linkedin, Youtube, MapPin } from 'lucide-react';

interface SiteClientProps {
    assets: any[];
    tenantName: string;
    whatsappNumber?: string | null;
    branding?: any;
}

export function SiteClient({ assets, tenantName, whatsappNumber, branding }: SiteClientProps) {
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

        // Filtro de dormitórios
        if (filters.quartos) {
            const dormitorios = String(asset.details?.dormitorios || asset.details?.quartos || asset.details?.rooms || '');
            if (!dormitorios.includes(filters.quartos)) {
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
    return (
        <>
            <AssetFilters
                filters={filters}
                onFilterChange={setFilters}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            {assets.length === 0 || filteredAssets.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-border animate-in fade-in zoom-in duration-500">
                    <p className="text-xl font-bold text-foreground mb-2">
                        Nenhum imóvel disponível no momento
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Volte em breve para ver nossos imóveis!
                    </p>
                </div>
            ) : (
                viewMode === 'gallery' ? (
                    <AssetsGrid assets={filteredAssets} />
                ) : (
                    <AssetsList assets={filteredAssets} />
                )
            )}
            {whatsappNumber && <WhatsAppButton phone={whatsappNumber} />}

            {/* Footer */}
            <footer className="mt-20 py-12 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h4 className="font-bold text-lg mb-4 text-[#404F4F]">{tenantName}</h4>
                        <p className="text-sm text-muted-foreground max-w-xs transition-all">
                            Sua melhor escolha em imóveis com a tecnologia do CRM LAX.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-[#404F4F]">Localização</h4>
                        {branding?.address?.street ? (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin size={18} className="text-secondary shrink-0 mt-0.5" />
                                <div>
                                    <p>{branding.address.street}, {branding.address.number}</p>
                                    <p>{branding.address.neighborhood}</p>
                                    <p>{branding.address.city} - {branding.address.state}</p>
                                    <p>{branding.address.zip_code}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Endereço não informado.</p>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold text-sm uppercase tracking-widest mb-2 text-[#404F4F]">Siga-nos</h4>
                        <div className="flex items-center gap-4">
                            {branding?.social_links?.instagram && (
                                <a href={branding.social_links.instagram} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all">
                                    <Instagram size={20} />
                                </a>
                            )}
                            {branding?.social_links?.facebook && (
                                <a href={branding.social_links.facebook} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all">
                                    <Facebook size={20} />
                                </a>
                            )}
                            {branding?.social_links?.linkedin && (
                                <a href={branding.social_links.linkedin} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all">
                                    <Linkedin size={20} />
                                </a>
                            )}
                            {branding?.social_links?.youtube && (
                                <a href={branding.social_links.youtube} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all">
                                    <Youtube size={20} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-muted-foreground uppercase font-bold tracking-tighter">
                    <p>© {new Date().getFullYear()} {tenantName} - Todos os direitos reservados.</p>
                    <p className="flex items-center gap-1">
                        Desenvolvido por <span className="text-[#404F4F] font-black">CRM LAX</span>
                    </p>
                </div>
            </footer>
        </>
    );
}

