'use client';

import { MessageSquare } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    fromMe: boolean;
    timestamp: string;
    senderName: string;
}

interface LeadWhatsAppConversationProps {
    chat: Message[];
}

export function LeadWhatsAppConversation({ chat }: LeadWhatsAppConversationProps) {
    if (!chat || chat.length === 0) {
        return (
            <div className="bg-muted/5 rounded-lg p-3 border border-border">
                <p className="text-[10px] text-muted-foreground text-center">Nenhuma mensagem sincronizada.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {chat.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex flex-col ${msg.fromMe ? 'items-end' : 'items-start'}`}
                >
                    <div
                        className={`max-w-[85%] p-2 rounded-lg text-[10px] ${
                            msg.fromMe
                                ? 'bg-secondary text-secondary-foreground rounded-tr-none'
                                : 'bg-muted text-foreground rounded-tl-none'
                        }`}
                    >
                        <p className="leading-tight">{msg.text}</p>
                        <span className="text-[8px] opacity-70 mt-1 block text-right">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
