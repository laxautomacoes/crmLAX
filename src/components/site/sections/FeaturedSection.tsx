'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Star, Bed, Car, Maximize } from 'lucide-react';

interface FeaturedConfig {
    enabled: boolean;
    title?: string;
    subtitle?: string;
}

interface FeaturedSectionProps {
    config: FeaturedConfig;
    properties?: any[];
    tenantSlug: string;
    tenantName: string;
    branding?: any;
}

function formatPrice(price: number | string): string {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (!num || isNaN(num)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num);
}

function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        house: 'Casa',
        apartment: 'Apartamento',
        land: 'Terreno',
        commercial: 'Comercial',
        penthouse: 'Cobertura',
        studio: 'Studio',
        rural: 'Rural',
        warehouse: 'Galpão',
        office: 'Sala/Escritório',
        store: 'Loja',
    };
    return labels[type] || type;
}

export function FeaturedSection({ config, properties = [], tenantSlug, tenantName, branding }: FeaturedSectionProps) {
    const [isVisible, setIsVisible] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    if (!properties || properties.length === 0) return null;

    const title = config.title || 'Imóveis em Destaque';
    const subtitle = config.subtitle || 'Selecionados especialmente para você';

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const cardWidth = scrollRef.current.firstElementChild?.clientWidth || 380;
        const amount = direction === 'left' ? -cardWidth - 24 : cardWidth + 24;
        scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    };

    return (
        <section ref={sectionRef} className="py-16 md:py-24" id="destaques">
            <div className="max-w-[1600px] mx-auto px-4">
                {/* Header */}
                <div
                    className={`flex items-end justify-between mb-10 transition-all duration-700 ease-out ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                >
                    <div>
                        <h2
                            className="text-2xl md:text-3xl font-bold"
                            style={{ color: 'var(--site-primary, #404F4F)' }}
                        >
                            {title}
                        </h2>
                        <p className="text-muted-foreground mt-2">{subtitle}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-2 rounded-full border border-border hover:bg-foreground/10 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-2 rounded-full border border-border hover:bg-foreground/10 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Carousel */}
                <div
                    ref={scrollRef}
                    className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-4"
                >
                    {properties.map((property, index) => {
                        const image = property.images?.[0];
                        const bedrooms = property.details?.quartos || property.details?.dormitorios;
                        const area = property.details?.area_privativa || property.details?.area_total;
                        const parking = property.details?.vagas;
                        const neighborhood = property.details?.endereco?.bairro;
                        const city = property.details?.endereco?.cidade;
                        const location = [neighborhood, city].filter(Boolean).join(', ');

                        return (
                            <a
                                key={property.id}
                                href={`/site/${tenantSlug}/imovel/${property.id}`}
                                className={`group flex-none w-[320px] md:w-[380px] snap-start transition-all duration-700 ease-out ${
                                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                                }`}
                                style={{ transitionDelay: `${200 + index * 100}ms` }}
                            >
                                <div
                                    className="bg-card border border-border overflow-hidden hover:shadow-xl transition-shadow duration-300"
                                    style={{ borderRadius: 'var(--site-radius-lg, 16px)' }}
                                >
                                    {/* Image */}
                                    <div className="relative h-[220px] md:h-[260px] overflow-hidden">
                                        {image ? (
                                            <img
                                                src={image}
                                                alt={property.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                <span className="text-muted-foreground text-sm">Sem imagem</span>
                                            </div>
                                        )}

                                        {/* Badge Destaque */}
                                        <div
                                            className="absolute top-3 left-3 px-3 py-1 text-[10px] font-black uppercase tracking-wider"
                                            style={{
                                                backgroundColor: 'var(--site-secondary, #FFE600)',
                                                color: 'var(--site-secondary-foreground, #121414)',
                                                borderRadius: 'var(--site-radius-sm, 8px)',
                                            }}
                                        >
                                            <Star size={10} className="inline mr-1 -mt-0.5" />
                                            Destaque
                                        </div>

                                        {/* Badge Tipo */}
                                        <div
                                            className="absolute top-3 right-3 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white"
                                            style={{ borderRadius: 'var(--site-radius-sm, 8px)' }}
                                        >
                                            {getTypeLabel(property.type)}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3 className="font-bold text-foreground text-base mb-1 truncate group-hover:text-[var(--site-primary)] transition-colors">
                                            {property.title}
                                        </h3>
                                        {location && (
                                            <p className="text-xs text-muted-foreground mb-3 truncate">{location}</p>
                                        )}

                                        {property.price && (
                                            <p
                                                className="text-xl font-bold mb-4"
                                                style={{ color: 'var(--site-primary, #404F4F)' }}
                                            >
                                                {formatPrice(property.price)}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            {bedrooms && (
                                                <span className="flex items-center gap-1">
                                                    <Bed size={14} /> {bedrooms} dorm.
                                                </span>
                                            )}
                                            {area && (
                                                <span className="flex items-center gap-1">
                                                    <Maximize size={14} /> {area}m²
                                                </span>
                                            )}
                                            {parking && (
                                                <span className="flex items-center gap-1">
                                                    <Car size={14} /> {parking} vaga{Number(parking) > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>

                {/* Ver todos */}
                <div className="text-center mt-8">
                    <a
                        href="#imoveis"
                        className="inline-block px-6 py-3 font-bold text-sm border-2 transition-all hover:scale-105"
                        style={{
                            borderColor: 'var(--site-primary, #404F4F)',
                            color: 'var(--site-primary, #404F4F)',
                            borderRadius: 'var(--site-radius, 12px)',
                        }}
                    >
                        Ver todos os imóveis
                    </a>
                </div>
            </div>
        </section>
    );
}
