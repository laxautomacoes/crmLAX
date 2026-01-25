'use client';

import { useState } from 'react';
import { Home, MapPin, BedDouble, Bath, Square, Car, ChevronRight } from 'lucide-react';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import { translatePropertyType } from '@/utils/property-translations';

export function AssetsListItem({ asset }: { asset: any }) {
    const [showDetails, setShowDetails] = useState(false);
    const formattedPrice = asset.price ? `R$ ${Number(asset.price).toLocaleString('pt-BR')}` : 'Sob consulta';
    const tipo = translatePropertyType(asset.details?.tipo_imovel || asset.details?.type || asset.type);
    const bairro = asset.details?.endereco?.bairro || 'Bairro ñ inf.';
    const cidade = asset.details?.endereco?.cidade || 'Cidade ñ inf.';

    return (
        <>
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-64 aspect-video md:aspect-auto h-auto md:h-40 bg-muted flex-shrink-0 relative">
                        {asset.images?.[0] ? <img src={asset.images[0]} alt={asset.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground/50"><Home size={32} /></div>}
                        <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-bold uppercase tracking-wider text-primary">{tipo}</div>
                    </div>
                    <div className="flex-1 p-5 flex flex-col justify-between">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                            <div>
                                <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{asset.title}</h3>
                                {asset.description && (
                                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5 italic">
                                        {asset.description}
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1"><MapPin size={14} /><span>{bairro}, {cidade}</span></div>
                            </div>
                            <div className="text-xl font-bold text-foreground whitespace-nowrap">{formattedPrice}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 mt-4 md:mt-0">
                            <div className="flex items-center gap-1.5 text-muted-foreground" title="Dormitórios"><BedDouble size={18} /><span className="text-sm font-semibold">{asset.details?.dormitorios || asset.details?.quartos || 0} Dorms</span></div>
                            <div className="flex items-center gap-1.5 text-muted-foreground" title="Banheiros"><Bath size={18} /><span className="text-sm font-semibold">{asset.details?.banheiros || 0} Banh</span></div>
                            <div className="flex items-center gap-1.5 text-muted-foreground" title="Área"><Square size={18} /><span className="text-sm font-semibold">{asset.details?.area_util || 0}m²</span></div>
                            <div className="flex-1 text-right">
                                <button onClick={() => setShowDetails(true)} className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:gap-3 transition-all">Ver Detalhes<ChevronRight size={16} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <PropertyDetailsModal isOpen={showDetails} onClose={() => setShowDetails(false)} asset={asset} />
        </>
    );
}
