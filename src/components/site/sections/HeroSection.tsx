'use client';

import { useEffect, useRef, useState } from 'react';

interface HeroConfig {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    cta_text?: string;
    cta_link?: string;
    background_image?: string;
    overlay_opacity?: number;
    style?: 'fullscreen' | 'split' | 'minimal';
}

interface HeroSectionProps {
    config: HeroConfig;
    tenantName: string;
    branding?: any;
}

export function HeroSection({ config, tenantName, branding }: HeroSectionProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const style = config.style || 'fullscreen';
    const overlayOpacity = config.overlay_opacity ?? 0.5;
    const title = config.title || `Encontre o imóvel dos seus sonhos`;
    const subtitle = config.subtitle || `Os melhores imóveis da região com atendimento personalizado.`;
    const ctaText = config.cta_text || 'Ver Imóveis';
    const ctaLink = config.cta_link || '#imoveis';
    const isExternalOrPage = ctaLink && (ctaLink.startsWith('http') || ctaLink.startsWith('/'));

    if (style === 'minimal') {
        return (
            <section
                ref={ref}
                className="relative py-20 md:py-32 overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, var(--site-primary, #404F4F), var(--site-primary-dark, #2d3939))`,
                }}
            >
                <div className="max-w-[1600px] mx-auto px-4 text-center relative z-10">
                    <h2
                        className={`text-3xl md:text-5xl lg:text-6xl font-bold mb-6 transition-all duration-700 ease-out ${
                            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                        style={{ color: 'var(--site-secondary, #FFE600)' }}
                    >
                        {title}
                    </h2>
                    <p
                        className={`text-lg md:text-xl max-w-2xl mx-auto mb-10 transition-all duration-700 delay-200 ease-out ${
                            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                        style={{ color: 'var(--site-primary-foreground, #ffffff)', opacity: 0.85 }}
                    >
                        {subtitle}
                    </p>
                    <a
                        href={ctaLink}
                        target={isExternalOrPage ? "_blank" : undefined}
                        rel={isExternalOrPage ? "noopener noreferrer" : undefined}
                        className={`inline-block px-8 py-4 font-bold text-lg transition-all duration-700 delay-400 ease-out hover:scale-105 hover:shadow-lg ${
                            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                        style={{
                            backgroundColor: 'var(--site-secondary, #FFE600)',
                            color: 'var(--site-secondary-foreground, #121414)',
                            borderRadius: 'var(--site-radius, 12px)',
                        }}
                    >
                        {ctaText}
                    </a>
                </div>
                {/* Decorative elements */}
                <div
                    className="absolute top-0 right-0 w-1/3 h-full opacity-10"
                    style={{
                        background: `radial-gradient(circle at 70% 30%, var(--site-secondary, #FFE600) 0%, transparent 70%)`,
                    }}
                />
            </section>
        );
    }

    if (style === 'split') {
        return (
            <section ref={ref} className="relative overflow-hidden">
                <div className="max-w-[1600px] mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px] md:min-h-[600px]">
                        {/* Texto */}
                        <div
                            className="flex flex-col justify-center p-8 md:p-16"
                            style={{ backgroundColor: 'var(--site-primary, #404F4F)' }}
                        >
                            <h2
                                className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-6 transition-all duration-700 ease-out ${
                                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                                }`}
                                style={{ color: 'var(--site-secondary, #FFE600)' }}
                            >
                                {title}
                            </h2>
                            <p
                                className={`text-base md:text-lg mb-8 transition-all duration-700 delay-200 ease-out ${
                                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                                }`}
                                style={{ color: 'var(--site-primary-foreground, #ffffff)', opacity: 0.85 }}
                            >
                                {subtitle}
                            </p>
                            <div
                                className={`transition-all duration-700 delay-400 ease-out ${
                                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                                }`}
                            >
                                <a
                                    href={ctaLink}
                                    target={isExternalOrPage ? "_blank" : undefined}
                                    rel={isExternalOrPage ? "noopener noreferrer" : undefined}
                                    className="inline-block px-8 py-4 font-bold text-lg hover:scale-105 hover:shadow-lg transition-all"
                                    style={{
                                        backgroundColor: 'var(--site-secondary, #FFE600)',
                                        color: 'var(--site-secondary-foreground, #121414)',
                                        borderRadius: 'var(--site-radius, 12px)',
                                    }}
                                >
                                    {ctaText}
                                </a>
                            </div>
                        </div>
                        {/* Imagem */}
                        <div className="relative min-h-[300px] md:min-h-0">
                            {config.background_image ? (
                                <img
                                    src={config.background_image}
                                    alt={tenantName}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            ) : (
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background: `linear-gradient(135deg, var(--site-primary-light, #506161), var(--site-accent, #8B2332))`,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Fullscreen (default)
    return (
        <section
            ref={ref}
            className="relative min-h-[500px] md:min-h-[650px] flex items-center justify-center overflow-hidden"
        >
            {/* Background */}
            {config.background_image ? (
                <img
                    src={config.background_image}
                    alt={tenantName}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            ) : (
                <div
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(135deg, var(--site-primary, #404F4F), var(--site-primary-dark, #2d3939), var(--site-accent, #8B2332))`,
                    }}
                />
            )}

            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black"
                style={{ opacity: config.background_image ? overlayOpacity : 0.1 }}
            />

            {/* Content */}
            <div className="relative z-10 max-w-[1600px] mx-auto px-4 text-center">
                <h2
                    className={`text-3xl md:text-5xl lg:text-6xl font-bold mb-6 transition-all duration-700 ease-out ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ color: 'var(--site-secondary, #FFE600)' }}
                >
                    {title}
                </h2>
                <p
                    className={`text-lg md:text-xl max-w-2xl mx-auto mb-10 text-white/85 transition-all duration-700 delay-200 ease-out ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                >
                    {subtitle}
                </p>
                <a
                    href={ctaLink}
                    target={isExternalOrPage ? "_blank" : undefined}
                    rel={isExternalOrPage ? "noopener noreferrer" : undefined}
                    className={`inline-block px-8 py-4 font-bold text-lg transition-all duration-700 delay-400 ease-out hover:scale-105 hover:shadow-xl ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{
                        backgroundColor: 'var(--site-secondary, #FFE600)',
                        color: 'var(--site-secondary-foreground, #121414)',
                        borderRadius: 'var(--site-radius, 12px)',
                    }}
                >
                    {ctaText}
                </a>
            </div>
        </section>
    );
}
