'use client';

import { Car, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { LeadFormModal } from './LeadFormModal';

interface AssetCardProps {
    asset: {
        id: string;
        title: string;
        price?: number | null;
        images?: string[] | null;
        details?: Record<string, any> | null;
    };
}

export function AssetCard({ asset }: AssetCardProps) {
    const [showLeadForm, setShowLeadForm] = useState(false);

    const imageUrl = asset.images && Array.isArray(asset.images) && asset.images.length > 0
        ? asset.images[0]
        : null;

    const marca = asset.details?.marca || asset.details?.brand || 'N/A';
    const ano = asset.details?.ano || asset.details?.year || 'N/A';
    const km = asset.details?.km || asset.details?.kilometers || null;

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
                                <span className="text-lg font-bold text-[#FFE600]">
                                    R$ {Number(asset.price).toLocaleString('pt-BR')}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-64 bg-gray-200 flex items-center justify-center">
                        <Car className="w-16 h-16 text-gray-400" />
                    </div>
                )}
                
                <div className="p-6">
                    <h3 className="text-xl font-bold text-[#404F4F] mb-3">{asset.title}</h3>
                    
                    <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                        <span><strong>Marca:</strong> {marca}</span>
                        <span><strong>Ano:</strong> {ano}</span>
                        {km && <span><strong>Km:</strong> {Number(km).toLocaleString('pt-BR')}</span>}
                    </div>

                    <button
                        onClick={() => setShowLeadForm(true)}
                        className="w-full bg-[#FFE600] hover:bg-[#F2DB00] text-[#404F4F] font-bold py-3 px-4 rounded-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        <MessageCircle size={20} />
                        Tenho interesse
                    </button>
                </div>
            </div>

            <LeadFormModal
                isOpen={showLeadForm}
                onClose={() => setShowLeadForm(false)}
                assetId={asset.id}
                assetTitle={asset.title}
            />
        </>
    );
}

