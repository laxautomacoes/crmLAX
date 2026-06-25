'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Phone, Video, MoreVertical, Paperclip, Mic, Smile, User } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
    id?: string;
    text?: string;
    message?: string;
    fromMe?: boolean;
    timestamp?: string;
    senderName?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document';
    mediaUrl?: string;
    mediaName?: string;
}

interface LeadWhatsAppConversationProps {
    chat: Message[];
    leadName?: string;
    avatarUrl?: string;
    phone?: string;
    onSendMessage?: (text: string) => Promise<void>;
}

export function LeadWhatsAppConversation({ chat, leadName, avatarUrl, phone, onSendMessage }: LeadWhatsAppConversationProps) {
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chat]);

    const handleSend = async () => {
        if (!newMessage.trim() || !onSendMessage) return;
        setIsSending(true);
        try {
            await onSendMessage(newMessage.trim());
            setNewMessage('');
        } catch (error: any) {
            console.error('Erro ao enviar mensagem:', error);
            toast.error(error.message || 'Erro ao enviar mensagem');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-h-full bg-[#EFEAE2] dark:bg-[#0b141a] border-[8px] border-border rounded-[2rem] overflow-hidden shadow-2xl relative w-full max-w-[340px] mx-auto shrink-0 flex-1">
            {/* Notch / Speaker mockup */}
            <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20 pointer-events-none">
                <div className="w-24 h-6 bg-border rounded-b-2xl"></div>
            </div>

            {/* Header */}
            <div className="bg-[#005C4B] dark:bg-[#202C33] px-3 py-2 flex items-center justify-between pt-7 z-10">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={24} className="text-white/70" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-white font-semibold text-base truncate leading-tight">{leadName || phone || 'Lead'}</span>
                        <span className="text-white/70 text-xs truncate">online</span>
                    </div>
                </div>
                <div className="flex items-center gap-5 text-white shrink-0 ml-2">
                    <Video size={20} className="cursor-pointer" />
                    <Phone size={18} className="cursor-pointer" />
                    <MoreVertical size={20} className="cursor-pointer" />
                </div>
            </div>

            {/* Chat Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative"
                style={{ 
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'repeat',
                    backgroundPosition: 'center'
                }}
            >
                {/* Background overlay for dark mode to tint the wallpaper */}
                <div className="absolute inset-0 bg-[#EFEAE2]/60 dark:bg-[#0b141a]/80 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col justify-end min-h-full space-y-3 pb-2">
                    {(!chat || chat.length === 0) ? (
                        <div className="bg-[#FFEECD] dark:bg-[#182229] text-[#544837] dark:text-[#ffca48] p-3 rounded-lg text-xs text-center self-center max-w-[85%] shadow-sm leading-relaxed font-medium">
                            As mensagens e chamadas são protegidas com a criptografia de ponta a ponta. Ninguém fora desta conversa, nem mesmo o WhatsApp, pode ler ou ouvi-las.
                        </div>
                    ) : (
                        chat.map((msg, index) => (
                            <div
                                key={msg.id || index}
                                className={`flex flex-col ${msg.fromMe ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] p-2 rounded-lg text-[14px] shadow-sm relative group ${
                                        msg.fromMe
                                            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111B21] dark:text-[#e9edef] rounded-tr-none'
                                            : 'bg-white dark:bg-[#202c33] text-[#111B21] dark:text-[#e9edef] rounded-tl-none'
                                    }`}
                                >
                                    {msg.mediaType === 'image' && msg.mediaUrl && (
                                        <div className="mb-2 max-w-full rounded-md overflow-hidden border border-border/10">
                                            <img src={msg.mediaUrl} alt="Imagem" className="w-full max-h-48 object-cover cursor-pointer" onClick={() => window.open(msg.mediaUrl, '_blank')} />
                                        </div>
                                    )}
                                    {msg.mediaType === 'video' && msg.mediaUrl && (
                                        <div className="mb-2 max-w-full rounded-md overflow-hidden border border-border/10">
                                            <video src={msg.mediaUrl} controls className="w-full max-h-48 object-cover" />
                                        </div>
                                    )}
                                    {msg.mediaType === 'audio' && msg.mediaUrl && (
                                        <div className="mb-2 w-full max-w-[280px]">
                                            <audio src={msg.mediaUrl} controls className="w-full h-8" />
                                        </div>
                                    )}
                                    {msg.mediaType === 'document' && msg.mediaUrl && (
                                        <div className="mb-2 p-2 rounded-md bg-black/5 dark:bg-white/5 border border-border/20 flex items-center gap-2 max-w-full">
                                            <Paperclip size={18} className="text-muted-foreground shrink-0" />
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-xs font-bold truncate leading-tight">{msg.mediaName || 'Documento'}</span>
                                                <span className="text-[9px] text-muted-foreground">Documento</span>
                                            </div>
                                            <a 
                                                href={msg.mediaUrl} 
                                                download={msg.mediaName || 'documento'} 
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-xs font-bold text-accent-icon shrink-0"
                                            >
                                                Baixar
                                            </a>
                                        </div>
                                    )}

                                    <p className="leading-snug break-words pr-12 pb-1 whitespace-pre-wrap">{msg.text || msg.message || ''}</p>
                                    <span className="text-[10px] text-black/40 dark:text-white/60 absolute bottom-1.5 right-2">
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-2 flex items-end gap-2 shrink-0 z-10">
                <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-3xl overflow-hidden shadow-sm flex items-end min-h-[44px]">
                    <button className="p-3 text-gray-500 hover:text-gray-700 dark:text-[#8696a0] dark:hover:text-[#d1d7db] transition-colors shrink-0">
                        <Smile size={24} />
                    </button>
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Mensagem"
                        className="w-full bg-transparent border-none focus:ring-0 outline-none focus:outline-none resize-none py-3 px-1 max-h-24 text-[15px] dark:text-[#d1d7db] placeholder:text-gray-400 dark:placeholder:text-[#8696a0]"
                        rows={1}
                        disabled={isSending || !onSendMessage}
                    />
                    <button 
                        className="p-3 text-gray-500 hover:text-gray-700 dark:text-[#8696a0] dark:hover:text-[#d1d7db] transition-colors shrink-0"
                        title="Neste momento o envio de mídias nativo ainda será implementado. Use o WhatsApp para isso."
                    >
                        <Paperclip size={24} />
                    </button>
                </div>
                
                {newMessage.trim() ? (
                    <button 
                        onClick={handleSend}
                        disabled={isSending}
                        className="w-[44px] h-[44px] bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Send size={20} className="ml-1" />
                    </button>
                ) : (
                    <button 
                        className="w-[44px] h-[44px] bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm"
                        title="Neste momento o envio de áudio nativo ainda será implementado."
                    >
                        <Mic size={24} />
                    </button>
                )}
            </div>
        </div>
    );
}
