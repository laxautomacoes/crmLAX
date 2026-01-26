'use client';

import { Home, MessageCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { LeadFormModal } from './LeadFormModal';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import { translatePropertyType } from '@/utils/property-translations';

interface AssetCardProps {
    asset: {
        id: string;
        title: string;
        price?: number | null;
        images?: string[] | null;
        videos?: string[] | null;
        documents?: any[] | null;
        details?: Record<string, any> | null;
    };
}

export function AssetCard({ asset }: AssetCardProps) {
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const imageUrl = asset.images && Array.isArray(asset.images) && asset.images.length > 0
        ? asset.images[0]
        : null;

    const tipo = translatePropertyType(asset.details?.tipo_imovel || asset.details?.type || (asset as any).type);
    const area = asset.details?.area_util || asset.details?.area || null;
    const quartos = asset.details?.quartos || asset.details?.rooms || null;

    return (
        <>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {imageUrl ? (
                    <div className="relative h-64 overflow-hidden">
                        <img
                            src={imageUrl}
                            alt={asset.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-card/90 px-3 py-1 rounded-lg">
                            {asset.price && (
                                <span className="text-lg font-bold text-primary">
                                    R$ {Number(asset.price).toLocaleString('pt-BR')}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-64 bg-muted flex items-center justify-center">
                        <Home className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                )}

                <div className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-1">{asset.title}</h3>
                    
                    {(asset as any).description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 italic">
                            {(asset as any).description}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                        <span><strong>Tipo:</strong> {tipo}</span>
                        {area && <span><strong>Área:</strong> {area} m²</span>}
                        {quartos && <span><strong>Dormitórios:</strong> {quartos}</span>}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDetails(true)}
                            className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Info size={20} />
                            Ver detalhes
                        </button>
                        <button
                            onClick={() => setShowLeadForm(true)}
                            className="flex-[1.5] bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-3 px-4 rounded-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            <MessageCircle size={20} />
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
            />
        </>
    );
}

