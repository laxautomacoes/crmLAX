'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';

interface CTAConfig {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    button_text?: string;
    button_link?: string;
    background_color?: 'primary' | 'secondary' | 'gradient';
}

interface CTASectionProps {
    config: CTAConfig;
    tenantName: string;
    whatsappNumber?: string | null;
    branding?: any;
}

export function CTASection({ config, tenantName, whatsappNumber, branding }: CTASectionProps) {
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
            { threshold: 0.2 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const title = config.title || 'Quer saber mais?';
    const subtitle = config.subtitle || 'Entre em contato conosco e encontre o imóvel ideal para você.';
    const buttonText = config.button_text || 'Falar no WhatsApp';
    const bgColor = config.background_color || 'primary';

    // Gerar link do botão
    let buttonHref = config.button_link || '#';
    if (config.button_link === 'whatsapp' && whatsappNumber) {
        const cleanNumber = whatsappNumber.replace(/\D/g, '');
        buttonHref = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(`Olá ${tenantName}! Vim pelo site e gostaria de saber mais sobre os imóveis.`)}`;
    }
    const isWhatsApp = config.button_link === 'whatsapp';
    const isExternalOrPage = buttonHref && (buttonHref.startsWith('http') || buttonHref.startsWith('/') || isWhatsApp);

    let bgStyle: React.CSSProperties = {};
    let textColor: string;
    let buttonBg: string;
    let buttonFg: string;

    if (bgColor === 'secondary') {
        bgStyle = { backgroundColor: 'var(--site-secondary, #FFE600)' };
        textColor = 'var(--site-secondary-foreground, #121414)';
        buttonBg = 'var(--site-primary, #404F4F)';
        buttonFg = 'var(--site-primary-foreground, #ffffff)';
    } else if (bgColor === 'gradient') {
        bgStyle = {
            background: `linear-gradient(135deg, var(--site-primary, #404F4F), var(--site-accent, #8B2332))`,
        };
        textColor = 'var(--site-primary-foreground, #ffffff)';
        buttonBg = 'var(--site-secondary, #FFE600)';
        buttonFg = 'var(--site-secondary-foreground, #121414)';
    } else {
        bgStyle = { backgroundColor: 'var(--site-primary, #404F4F)' };
        textColor = 'var(--site-primary-foreground, #ffffff)';
        buttonBg = 'var(--site-secondary, #FFE600)';
        buttonFg = 'var(--site-secondary-foreground, #121414)';
    }

    return (
        <section ref={ref} style={bgStyle} id="contato">
            <div className="max-w-[1600px] mx-auto px-4 py-16 md:py-24">
                <div className="max-w-3xl mx-auto text-center">
                    <h2
                        className={`text-2xl md:text-4xl font-bold mb-4 transition-all duration-700 ease-out ${
                            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                        style={{ color: bgColor === 'secondary' ? textColor : 'var(--site-secondary, #FFE600)' }}
                    >
                        {title}
                    </h2>
                    <p
                        className={`text-base md:text-lg mb-10 transition-all duration-700 delay-200 ease-out ${
                            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                        style={{ color: textColor, opacity: 0.85 }}
                    >
                        {subtitle}
                    </p>
                    <a
                        href={buttonHref}
                        target={isExternalOrPage ? '_blank' : undefined}
                        rel={isExternalOrPage ? 'noopener noreferrer' : undefined}
                        className={`inline-flex items-center gap-3 px-8 py-4 font-bold text-lg transition-all duration-700 delay-400 ease-out hover:scale-105 hover:shadow-xl ${
                            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                        style={{
                            backgroundColor: buttonBg,
                            color: buttonFg,
                            borderRadius: 'var(--site-radius, 12px)',
                        }}
                    >
                        {isWhatsApp ? <MessageCircle size={22} /> : <ArrowRight size={22} />}
                        {buttonText}
                    </a>
                </div>
            </div>
        </section>
    );
}
