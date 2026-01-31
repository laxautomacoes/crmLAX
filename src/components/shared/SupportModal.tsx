'use client';

import { Mail, MessageCircle } from 'lucide-react';
import { Modal } from './Modal';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
    const contactOptions = [
        {
            name: 'WhatsApp',
            value: '(48) 98823-1720',
            icon: MessageCircle,
            href: 'https://wa.me/5548988231720',
            color: 'text-green-500',
            bgColor: 'bg-green-500/10'
        },
        {
            name: 'E-mail',
            value: 'suporte@laxperience.online',
            icon: Mail,
            href: 'mailto:suporte@laxperience.online',
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10'
        }
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Suporte ao Cliente" size="sm">
            <div className="space-y-4">
                <p className="text-muted-foreground text-sm text-center mb-6">
                    Precisa de ajuda? Entre em contato conosco através de um dos canais abaixo.
                </p>
                
                {contactOptions.map((option) => (
                    <a
                        key={option.name}
                        href={option.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all group"
                    >
                        <div className={`w-12 h-12 rounded-lg ${option.bgColor} flex items-center justify-center ${option.color} group-hover:scale-110 transition-transform`}>
                            <option.icon size={24} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {option.name}
                            </span>
                            <span className="text-base font-medium text-foreground">
                                {option.value}
                            </span>
                        </div>
                    </a>
                ))}
                
                <div className="pt-4 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                        LAX Automações © 2026
                    </p>
                </div>
            </div>
        </Modal>
    );
}
