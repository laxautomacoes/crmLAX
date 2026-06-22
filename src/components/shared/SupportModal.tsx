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
        <Modal isOpen={isOpen} onClose={onClose} title={<h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">Suporte Clientes</h3>} size="sm">
            <div className="flex flex-col">
                <p className="text-muted-foreground text-sm text-center mb-4">
                    Precisa de ajuda?<br />
                    Entre em contato conosco através de um dos canais abaixo:
                </p>
                
                <div className="flex flex-col gap-1 w-full">
                    {contactOptions.map((option) => (
                        <a
                            key={option.name}
                            href={option.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-4 py-3 px-2 rounded-lg hover:bg-muted/50 transition-all group"
                        >
                            <div className={`w-8 h-8 rounded-full ${option.bgColor} flex items-center justify-center ${option.color} group-hover:scale-110 transition-transform`}>
                                <option.icon size={16} />
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
                </div>
                
                <hr className="border-border my-4" />

                <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                        LAX Automações © 2026
                    </p>
                </div>
            </div>
        </Modal>
    );
}
