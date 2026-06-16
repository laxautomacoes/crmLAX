'use client';

import { useState } from 'react';
import { Home, MapPin, BedDouble, Car, Maximize2, Info, MessageCircle } from 'lucide-react';
import { translatePropertyType } from '@/utils/property-translations';
import { LeadFormModal } from './LeadFormModal';
import Link from 'next/link';

export function PropertiesListItem({ property, tenantSlug }: { property: any, tenantSlug: string }) {
    const [showLeadForm, setShowLeadForm] = useState(false);
    const formattedPrice = property.price ? `R$ ${Number(property.price).toLocaleString('pt-BR')}` : 'Sob consulta';
    const tipo = translatePropertyType(property.details?.tipo_property || property.details?.type || property.type);
    const bairro = property.details?.endereco?.bairro || 'Bairro ñ inf.';
    const cidade = property.details?.endereco?.cidade || 'Cidade ñ inf.';
    const propertyType = property.type || property.details?.tipo_property || 'imovel';
    const propertyHref = `/site/${tenantSlug}/imovel/${propertyType}/${property.slug || property.id}`;

    return (
        <>
            <Link href={propertyHref} target="_blank" rel="noopener noreferrer" className="block">
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer">
                    <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-64 aspect-video md:aspect-auto h-auto md:h-48 bg-muted flex-shrink-0 relative">
                            {property.images?.[0] ? <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-foreground/30"><Home size={32} /></div>}
                        </div>
                        <div className="flex-1 p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                                    <div>
                                        <div className="mb-1.5">
                                            <span className="px-2 py-0.5 bg-foreground/10 rounded text-[10px] font-bold uppercase tracking-wider text-foreground">{tipo}</span>
                                        </div>
                                        <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{property.title}</h3>
                                        <div className="flex items-center gap-1 text-foreground/70 text-sm mt-1"><MapPin size={14} /><span>{bairro}, {cidade}</span></div>
                                    </div>
                                    <div className="text-xl font-bold text-foreground whitespace-nowrap">{formattedPrice}</div>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mt-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-foreground/70" title="Dormitórios">
                                        <BedDouble size={18} />
                                        <span className="text-sm font-semibold text-foreground">{property.details?.dormitorios || property.details?.quartos || 0} Dorms</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-foreground/70" title="Vagas">
                                        <Car size={18} />
                                        <span className="text-sm font-semibold text-foreground">{property.details?.vagas || 0} Vagas</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-foreground/70" title="Área Privativa">
                                        <Maximize2 size={18} />
                                        <span className="text-sm font-semibold text-foreground">{property.details?.area_privativa || property.details?.area_util || 0}m² Priv.</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 md:ml-auto">
                                    <Link
                                        href={propertyHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-muted hover:bg-muted/80 text-foreground font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-xs whitespace-nowrap"
                                    >
                                        <Info size={14} className="flex-shrink-0" />
                                        Ver detalhes
                                    </Link>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLeadForm(true); }}
                                        className="bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-2.5 px-4 rounded-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-xs whitespace-nowrap"
                                    >
                                        <MessageCircle size={14} className="flex-shrink-0" />
                                        Tenho interesse
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>

            <LeadFormModal
                isOpen={showLeadForm}
                onClose={() => setShowLeadForm(false)}
                propertyId={property.id}
                propertyTitle={property.title}
                tenantId={property.tenant_id}
            />
        </>
    );
}
