'use client';

import { useEffect, useRef, useState } from 'react';
import {
    Home, Key, Building, TrendingUp, Shield, Search,
    Handshake, FileText, BarChart3, MapPin, Briefcase, Heart
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
    home: Home,
    key: Key,
    building: Building,
    trending: TrendingUp,
    shield: Shield,
    search: Search,
    handshake: Handshake,
    file: FileText,
    chart: BarChart3,
    map: MapPin,
    briefcase: Briefcase,
    heart: Heart,
};

interface ServicesConfig {
    enabled: boolean;
    title?: string;
    items?: { icon: string; title: string; description: string }[];
}

interface ServicesSectionProps {
    config: ServicesConfig;
    tenantName: string;
    branding?: any;
}

export function ServicesSection({ config, tenantName, branding }: ServicesSectionProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const items = config.items || [];
    if (items.length === 0) return null;

    const title = config.title || 'Nossos Serviços';

    return (
        <section
            ref={ref}
            className="py-16 md:py-24"
            style={{ backgroundColor: 'var(--site-primary, #404F4F)' }}
            id="servicos"
        >
            <div className="max-w-[1600px] mx-auto px-4">
                <h2
                    className={`text-2xl md:text-3xl font-bold text-center mb-12 transition-all duration-700 ease-out ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ color: 'var(--site-secondary, #FFE600)' }}
                >
                    {title}
                </h2>

                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(items.length, 4)} gap-6`}>
                    {items.map((item, index) => {
                        const IconComponent = ICON_MAP[item.icon] || Home;

                        return (
                            <div
                                key={index}
                                className={`group p-8 border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-500 cursor-default ${
                                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                                }`}
                                style={{
                                    borderRadius: 'var(--site-radius-lg, 16px)',
                                    transitionDelay: `${200 + index * 100}ms`,
                                }}
                            >
                                <div
                                    className="w-14 h-14 flex items-center justify-center mb-6 transition-colors duration-300"
                                    style={{
                                        backgroundColor: 'var(--site-secondary, #FFE600)',
                                        borderRadius: 'var(--site-radius, 12px)',
                                    }}
                                >
                                    <IconComponent
                                        size={24}
                                        style={{ color: 'var(--site-secondary-foreground, #121414)' }}
                                    />
                                </div>
                                <h3
                                    className="text-lg font-bold mb-3"
                                    style={{ color: 'var(--site-primary-foreground, #ffffff)' }}
                                >
                                    {item.title}
                                </h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    {item.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// Exporta os ícones disponíveis para uso no painel de configuração
export const AVAILABLE_ICONS = Object.keys(ICON_MAP);
