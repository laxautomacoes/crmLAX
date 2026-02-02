'use client';

import { MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WhatsAppButtonProps {
    phone: string;
}

export function WhatsAppButton({ phone }: WhatsAppButtonProps) {
    const [isHidden, setIsHidden] = useState(false);

    useEffect(() => {
        const checkFullscreen = () => {
            setIsHidden(document.body.classList.contains('media-fullscreen-open'));
        };

        // Check initially
        checkFullscreen();

        // Create an observer to watch for class changes on body
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    checkFullscreen();
                }
            });
        });

        observer.observe(document.body, { attributes: true });

        return () => observer.disconnect();
    }, []);

    // Formatar telefone para link do WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}`;

    if (isHidden) return null;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 md:right-8 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold py-4 px-6 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 z-[60] w-56"
        >
            <MessageCircle size={24} />
            <span className="hidden sm:inline">Fale Conosco</span>
        </a>
    );
}

