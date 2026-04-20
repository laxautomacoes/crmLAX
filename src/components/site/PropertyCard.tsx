'use client';

import { Home, MessageCircle, Info } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { LeadFormModal } from './LeadFormModal';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import { translatePropertyType } from '@/utils/property-translations';
import { stripMarkdown } from '@/utils/text-utils';

interface PropertyCardProps {
    property: {
        id: string;
        title: string;
        slug?: string;
        type?: string;
        price?: number | null;
        images?: string[] | null;
        videos?: string[] | null;
        documents?: any[] | null;
        details?: Record<string, any> | null;
        tenant_id?: string;
    };
    tenantSlug: string;
}

export function PropertyCard({ property, tenantSlug }: PropertyCardProps) {
    const [showLeadForm, setShowLeadForm] = useState(false);

    const imageUrl = property.images && Array.isArray(property.images) && property.images.length > 0
        ? property.images[0]
        : null;

    const tipo = translatePropertyType(property.details?.tipo_property || property.details?.type || (property as any).type);
    const areaPrivativa = property.details?.area_privativa || property.details?.area_util || property.details?.area || 0;
    const quartos = property.details?.dormitorios || property.details?.quartos || property.details?.rooms || 0;
    const vagas = property.details?.vagas || 0;

    const propertyType = property.type || property.details?.tipo_property || 'imovel';
    const propertyHref = `/site/${tenantSlug}/imovel/${propertyType}/${property.slug || property.id}`;

    return (
        <>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {imageUrl ? (
                    <Link 
                        href={propertyHref}
                        className="relative h-64 overflow-hidden block group"
                    >
                        <img
                            src={imageUrl}
                            alt={property.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </Link>
                ) : (
                    <Link 
                        href={propertyHref}
                        className="h-64 bg-muted flex items-center justify-center"
                    >
                        <Home className="w-16 h-16 text-muted-foreground/50" />
                    </Link>
                )}

                <div className="p-6">
                    <div className="flex items-center justify-between gap-4 mb-1">
                        <h3 className="text-xl font-bold text-foreground truncate">{property.title}</h3>
                        <span className="text-lg text-white font-bold whitespace-nowrap">
                            {Number(property.price) > 0 
                                ? `R$ ${Number(property.price).toLocaleString('pt-BR')}` 
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
                        <Link
                            href={propertyHref}
                            className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 px-2 md:px-4 rounded-lg transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[11px] xs:text-xs md:text-sm whitespace-nowrap"
                        >
                            <Info size={16} className="flex-shrink-0" />
                            Ver detalhes
                        </Link>
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

