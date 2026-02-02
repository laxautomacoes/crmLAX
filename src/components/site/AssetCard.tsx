'use client';

import { Home, MessageCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { LeadFormModal } from './LeadFormModal';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import { translatePropertyType } from '@/utils/property-translations';
import { stripMarkdown } from '@/utils/text-utils';

interface AssetCardProps {
    asset: {
        id: string;
        title: string;
        price?: number | null;
        images?: string[] | null;
        videos?: string[] | null;
        documents?: any[] | null;
        details?: Record<string, any> | null;
        tenant_id?: string;
    };
}

export function AssetCard({ asset }: AssetCardProps) {
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const imageUrl = asset.images && Array.isArray(asset.images) && asset.images.length > 0
        ? asset.images[0]
        : null;

    const tipo = translatePropertyType(asset.details?.tipo_imovel || asset.details?.type || (asset as any).type);
    const areaPrivativa = asset.details?.area_privativa || asset.details?.area_util || asset.details?.area || 0;
    const quartos = asset.details?.dormitorios || asset.details?.quartos || asset.details?.rooms || 0;
    const vagas = asset.details?.vagas || 0;

    return (
        <>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {imageUrl ? (
                    <div 
                        onClick={() => setShowDetails(true)}
                        className="relative h-64 overflow-hidden cursor-pointer group"
                    >
                        <img
                            src={imageUrl}
                            alt={asset.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                ) : (
                    <div 
                        onClick={() => setShowDetails(true)}
                        className="h-64 bg-muted flex items-center justify-center cursor-pointer"
                    >
                        <Home className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                )}

                <div className="p-6">
                    <div className="flex items-center justify-between gap-4 mb-1">
                        <h3 className="text-xl font-bold text-foreground truncate">{asset.title}</h3>
                        <span className="text-lg text-white font-bold whitespace-nowrap">
                            {Number(asset.price) > 0 
                                ? `R$ ${Number(asset.price).toLocaleString('pt-BR')}` 
                                : 'Sob consulta'}
                        </span>
                    </div>
                    
                    <div className="flex flex-col gap-1 mb-4 text-sm text-muted-foreground">
                        <span><strong>Tipo:</strong> {tipo}</span>
                        <span><strong>Dormitórios:</strong> {quartos}</span>
                        <span><strong>Vagas:</strong> {vagas}</span>
                        <span><strong>Área Privativa:</strong> {areaPrivativa} m²</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDetails(true)}
                            className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 px-2 md:px-4 rounded-lg transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[11px] xs:text-xs md:text-sm whitespace-nowrap"
                        >
                            <Info size={16} className="flex-shrink-0" />
                            Ver detalhes
                        </button>
                        <button
                            onClick={() => setShowLeadForm(true)}
                            className="flex-1 bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-3 px-2 md:px-4 rounded-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-1.5 md:gap-2 text-[11px] xs:text-xs md:text-sm whitespace-nowrap"
                        >
                            <MessageCircle size={16} className="flex-shrink-0" />
                            Tenho interesse
                        </button>
                    </div>
                </div>
            </div>

            <PropertyDetailsModal
                isOpen={showDetails}
                onClose={() => setShowDetails(false)}
                asset={asset}
            />

            <LeadFormModal
                isOpen={showLeadForm}
                onClose={() => setShowLeadForm(false)}
                assetId={asset.id}
                assetTitle={asset.title}
                tenantId={asset.tenant_id}
            />
        </>
    );
}

