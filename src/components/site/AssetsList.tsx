'use client';

import { Home, MapPin, BedDouble, Bath, Square, Car, ChevronRight } from 'lucide-react';

interface Asset {
    id: string;
    title: string;
    price?: number | null;
    images?: string[] | null;
    details?: Record<string, any> | null;
}

interface AssetsListProps {
    assets: Asset[];
}

export function AssetsList({ assets }: AssetsListProps) {
    if (assets.length === 0) {
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
        <div className="space-y-4">
            {assets.map((asset) => {
                const formattedPrice = asset.price
                    ? `R$ ${Number(asset.price).toLocaleString('pt-BR')}`
                    : 'Sob consulta';

                const tipo = asset.details?.tipo_imovel || asset.details?.type || 'Imóvel';
                const bairro = asset.details?.endereco?.bairro || 'Bairro ñ inf.';
                const cidade = asset.details?.endereco?.cidade || 'Cidade ñ inf.';

                return (
                    <div
                        key={asset.id}
                        className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                        <div className="flex flex-col md:flex-row">
                            <div className="w-full md:w-64 aspect-video md:aspect-auto h-auto md:h-40 bg-muted flex-shrink-0 relative">
                                {asset.images?.[0] ? (
                                    <img src={asset.images[0]} alt={asset.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                        <Home size={32} />
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-bold uppercase tracking-wider text-[#404F4F]">
                                    {tipo}
                                </div>
                            </div>

                            <div className="flex-1 p-5 flex flex-col justify-between">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-bold text-[#404F4F] text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                            {asset.title}
                                        </h3>
                                        <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                                            <MapPin size={14} />
                                            <span>{bairro}, {cidade}</span>
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold text-[#404F4F] whitespace-nowrap">
                                        {formattedPrice}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-6 mt-4 md:mt-0">
                                    <div className="flex items-center gap-1.5 text-muted-foreground" title="Quartos">
                                        <BedDouble size={18} />
                                        <span className="text-sm font-semibold">{asset.details?.quartos || asset.details?.rooms || 0} Dorms</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground" title="Banheiros">
                                        <Bath size={18} />
                                        <span className="text-sm font-semibold">{asset.details?.banheiros || 0} Banh</span>
                                    </div>
                                    {(asset.details?.vagas || asset.details?.parking) && (
                                        <div className="flex items-center gap-1.5 text-muted-foreground" title="Vagas">
                                            <Car size={18} />
                                            <span className="text-sm font-semibold">{asset.details?.vagas || asset.details?.parking || 0} Vagas</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-muted-foreground" title="Área">
                                        <Square size={18} />
                                        <span className="text-sm font-semibold">{asset.details?.area_util || asset.details?.area || 0}m²</span>
                                    </div>
                                    <div className="flex-1 text-right">
                                        <button className="inline-flex items-center gap-2 text-sm font-bold text-[#404F4F] hover:gap-3 transition-all">
                                            Ver Detalhes
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
