'use client';

import { useState } from 'react';
import { Home, MapPin, BedDouble, Bath, Car, ChevronRight, Maximize2 } from 'lucide-react';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import { translatePropertyType } from '@/utils/property-translations';
import { stripMarkdown } from '@/utils/text-utils';
import Link from 'next/link';

export function PropertiesListItem({ property, tenantSlug }: { property: any, tenantSlug: string }) {
    const formattedPrice = property.price ? `R$ ${Number(property.price).toLocaleString('pt-BR')}` : 'Sob consulta';
    const tipo = translatePropertyType(property.details?.tipo_property || property.details?.type || property.type);
    const bairro = property.details?.endereco?.bairro || 'Bairro ñ inf.';
    const cidade = property.details?.endereco?.cidade || 'Cidade ñ inf.';
    const propertyType = property.type || property.details?.tipo_property || 'imovel';
    const propertyHref = `/site/${tenantSlug}/imovel/${propertyType}/${property.slug || property.id}`;

    return (
        <>
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-64 aspect-video md:aspect-auto h-auto md:h-40 bg-muted flex-shrink-0 relative">
                        {property.images?.[0] ? <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground/50"><Home size={32} /></div>}
                        <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-bold uppercase tracking-wider text-primary">{tipo}</div>
                    </div>
                    <div className="flex-1 p-5 flex flex-col justify-between">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                            <div>
                                <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{property.title}</h3>
                                {property.description && (
                                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5 italic">
                                        {stripMarkdown(property.description)}
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1"><MapPin size={14} /><span>{bairro}, {cidade}</span></div>
                            </div>
                            <div className="text-xl font-bold text-foreground whitespace-nowrap">{formattedPrice}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
                            <div className="flex items-center gap-1.5 text-muted-foreground" title="Dormitórios">
                                <BedDouble size={18} />
                                <span className="text-sm font-semibold">{property.details?.dormitorios || property.details?.quartos || 0} Dorms</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground" title="Vagas">
                                <Car size={18} />
                                <span className="text-sm font-semibold">{property.details?.vagas || 0} Vagas</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground" title="Área Privativa">
                                <Maximize2 size={18} />
                                <span className="text-sm font-semibold">{property.details?.area_privativa || property.details?.area_util || 0}m² Priv.</span>
                            </div>
                            <div className="flex-1 text-right">
                                <Link href={propertyHref} className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:gap-3 transition-all">Ver Detalhes<ChevronRight size={16} /></Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
