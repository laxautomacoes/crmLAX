'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            onClick={scrollToTop}
            aria-label="Voltar ao topo"
            className={`fixed bottom-6 right-6 z-40 p-3 shadow-xl transition-all duration-300 hover:scale-110 ${
                isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
            style={{
                backgroundColor: 'var(--site-primary, #404F4F)',
                color: 'var(--site-primary-foreground, #ffffff)',
                borderRadius: 'var(--site-radius, 12px)',
            }}
        >
            <ArrowUp size={20} />
        </button>
    );
}
