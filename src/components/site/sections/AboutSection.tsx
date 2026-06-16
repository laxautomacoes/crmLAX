'use client';

import { useEffect, useRef, useState } from 'react';

interface AboutConfig {
    enabled: boolean;
    title?: string;
    text?: string;
    image?: string;
    stats?: { value: string; label: string }[];
}

interface AboutSectionProps {
    config: AboutConfig;
    tenantName: string;
    branding?: any;
}

function AnimatedCounter({ target, label }: { target: string; label: string }) {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Extrair número do target (ex: "500+" -> 500)
    const numericPart = parseInt(target.replace(/[^\d]/g, '')) || 0;
    const suffix = target.replace(/[\d]/g, '');

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible || numericPart === 0) return;

        const duration = 1500;
        const steps = 40;
        const stepTime = duration / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            // Easing: ease-out cubic
            const progress = 1 - Math.pow(1 - currentStep / steps, 3);
            setCount(Math.round(progress * numericPart));

            if (currentStep >= steps) {
                setCount(numericPart);
                clearInterval(timer);
            }
        }, stepTime);

        return () => clearInterval(timer);
    }, [isVisible, numericPart]);

    return (
        <div ref={ref} className="text-center">
            <p
                className="text-3xl md:text-4xl font-bold text-accent-icon"
            >
                {isVisible ? count : 0}{suffix}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </div>
    );
}

export function AboutSection({ config, tenantName, branding }: AboutSectionProps) {
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

    const title = config.title || 'Sobre Nós';
    const text = config.text || '';
    const stats = config.stats || [];

    return (
        <section ref={ref} className="py-16 md:py-24" id="sobre">
            <div className="max-w-[1600px] mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/* Imagem */}
                    {config.image && (
                        <div
                            className={`transition-all duration-700 ease-out ${
                                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
                            }`}
                        >
                            <div
                                className="overflow-hidden shadow-2xl"
                                style={{ borderRadius: 'var(--site-radius-lg, 16px)' }}
                            >
                                <img
                                    src={config.image}
                                    alt={title}
                                    className="w-full h-[300px] md:h-[450px] object-cover hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Texto */}
                    <div
                        className={`transition-all duration-700 delay-200 ease-out ${
                            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
                        } ${!config.image ? 'md:col-span-2 max-w-3xl mx-auto text-center' : ''}`}
                    >
                        <h2
                            className="text-2xl md:text-3xl font-bold mb-6 text-[var(--site-primary)] dark:text-foreground"
                        >
                            {title}
                        </h2>
                        {text && (
                            <div className="text-base md:text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
                                {text}
                            </div>
                        )}

                        {/* Stats */}
                        {stats.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
                                {stats.map((stat, i) => (
                                    <AnimatedCounter key={i} target={stat.value} label={stat.label} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
