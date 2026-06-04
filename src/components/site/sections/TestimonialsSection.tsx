'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

interface TestimonialItem {
    name: string;
    text: string;
    rating: number;
    avatar?: string;
}

interface TestimonialsConfig {
    enabled: boolean;
    title?: string;
    items?: TestimonialItem[];
}

interface TestimonialsSectionProps {
    config: TestimonialsConfig;
    tenantName: string;
    branding?: any;
}

export function TestimonialsSection({ config, tenantName, branding }: TestimonialsSectionProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const ref = useRef<HTMLElement>(null);
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

    const items = config.items || [];

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

    // Auto-play
    const startAutoPlay = useCallback(() => {
        if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        if (items.length <= 1) return;
        autoPlayRef.current = setInterval(() => {
            setCurrent((prev) => (prev + 1) % items.length);
        }, 5000);
    }, [items.length]);

    useEffect(() => {
        if (isVisible) startAutoPlay();
        return () => {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        };
    }, [isVisible, startAutoPlay]);

    if (items.length === 0) return null;

    const title = config.title || 'O que nossos clientes dizem';

    const goTo = (index: number) => {
        setCurrent(index);
        startAutoPlay();
    };

    const prev = () => goTo((current - 1 + items.length) % items.length);
    const next = () => goTo((current + 1) % items.length);

    const currentItem = items[current];

    return (
        <section ref={ref} className="py-16 md:py-24 bg-muted/30" id="depoimentos">
            <div className="max-w-[1600px] mx-auto px-4">
                <h2
                    className={`text-2xl md:text-3xl font-bold text-center mb-12 transition-all duration-700 ease-out ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ color: 'var(--site-primary, #404F4F)' }}
                >
                    {title}
                </h2>

                <div className="max-w-3xl mx-auto relative">
                    {/* Quote decoration */}
                    <Quote
                        size={60}
                        className="absolute -top-4 -left-4 md:-left-8 opacity-10"
                        style={{ color: 'var(--site-primary, #404F4F)' }}
                    />

                    {/* Testimonial Card */}
                    <div
                        className={`bg-card border border-border p-8 md:p-12 text-center transition-all duration-700 ease-out ${
                            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                        style={{ borderRadius: 'var(--site-radius-lg, 16px)' }}
                    >
                        {/* Avatar */}
                        {currentItem.avatar ? (
                            <img
                                src={currentItem.avatar}
                                alt={currentItem.name}
                                className="w-16 h-16 rounded-full object-cover mx-auto mb-6 border-2"
                                style={{ borderColor: 'var(--site-secondary, #FFE600)' }}
                            />
                        ) : (
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold"
                                style={{
                                    backgroundColor: 'var(--site-primary, #404F4F)',
                                    color: 'var(--site-primary-foreground, #ffffff)',
                                }}
                            >
                                {currentItem.name.charAt(0).toUpperCase()}
                            </div>
                        )}

                        {/* Stars */}
                        <div className="flex items-center justify-center gap-1 mb-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    size={18}
                                    className={i < currentItem.rating ? '' : 'opacity-20'}
                                    style={{
                                        color: i < currentItem.rating
                                            ? 'var(--site-secondary, #FFE600)'
                                            : undefined,
                                        fill: i < currentItem.rating
                                            ? 'var(--site-secondary, #FFE600)'
                                            : 'none',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Text */}
                        <p className="text-base md:text-lg leading-relaxed text-foreground/80 mb-6 italic">
                            &ldquo;{currentItem.text}&rdquo;
                        </p>

                        {/* Name */}
                        <p className="font-bold text-foreground">{currentItem.name}</p>
                    </div>

                    {/* Navigation */}
                    {items.length > 1 && (
                        <>
                            <div className="flex items-center justify-center gap-4 mt-8">
                                <button
                                    onClick={prev}
                                    className="p-2 rounded-full border border-border hover:bg-foreground/10 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="flex items-center gap-2">
                                    {items.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => goTo(i)}
                                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                                                i === current ? 'scale-125' : 'opacity-30'
                                            }`}
                                            style={{
                                                backgroundColor:
                                                    i === current
                                                        ? 'var(--site-secondary, #FFE600)'
                                                        : 'var(--site-primary, #404F4F)',
                                            }}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={next}
                                    className="p-2 rounded-full border border-border hover:bg-foreground/10 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
