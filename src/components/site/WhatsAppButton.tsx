'use client';

import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
    phone: string;
}

export function WhatsAppButton({ phone }: WhatsAppButtonProps) {
    // Formatar telefone para link do WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold py-4 px-6 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 z-50"
        >
            <MessageCircle size={24} />
            <span className="hidden sm:inline">Fale conosco</span>
        </a>
    );
}

