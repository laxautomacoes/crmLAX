'use client';

import { useState, useEffect } from 'react';
import { Instagram, Send, Loader2, Sparkles, X, CheckCircle2, ChevronDown } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { toast } from 'sonner';
import { generatePropertyCopy } from '@/app/_actions/ai-copy';
import { getAIPrompts, AIPrompt } from '@/app/_actions/ai-prompts';

interface InstagramPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    prop: any;
    tenantId: string;
    profileId: string;
}

export function InstagramPostModal({ isOpen, onClose, prop, tenantId, profileId }: InstagramPostModalProps) {
    const [caption, setCaption] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [prompts, setPrompts] = useState<AIPrompt[]>([]);
    const [selectedPromptId, setSelectedPromptId] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            getAIPrompts(tenantId)
                .then(data => setPrompts(data))
                .catch(err => console.error("Erro ao carregar prompts", err));
        }
    }, [isOpen, tenantId]);

    const generateCaption = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const result = await generatePropertyCopy(prop.id, tenantId, profileId, selectedPromptId || undefined);
            
            if (result.success && result.data) {
                // Usamos a versão 'medium' que é otimizada para Instagram/Facebook
                setCaption(result.data.medium);
                toast.success('Legenda gerada com sucesso!');
            } else {
                throw new Error(result.error || 'Erro ao gerar legenda');
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao gerar legenda com IA.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!prop.images?.[0]) {
            toast.error('O property precisa de pelo menos uma imagem para postar.');
            return;
        }

        setIsPublishing(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instagram-publisher`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await (await import('@/lib/supabase/client')).createClient().auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    asset_id: prop.id,
                    profile_id: profileId,
                    image_url: prop.images[0], // Foto principal
                    custom_caption: caption || undefined
                })
            });

            const result = await response.json();

            if (result.success) {
                setIsSuccess(true);
                toast.success('Postado com sucesso no Instagram!');
                setTimeout(() => {
                    onClose();
                    setIsSuccess(false);
                }, 3000);
            } else {
                throw new Error(result.error || 'Erro desconhecido');
            }
        } catch (error: any) {
            console.error('Publish Error:', error);
            toast.error(`Falha ao publicar: ${error.message}`);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={
                <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                    Postar no Instagram
                </h3>
            } 
            size="md"
        >
            <div className="space-y-6">
                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle2 size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-[#404F4F]">Publicado com Sucesso!</h3>
                        <p className="text-muted-foreground text-sm">Seu property já está brilhando no Feed.</p>
                    </div>
                ) : (
                    <>
                        {/* Preview da Imagem */}
                        <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted relative group border border-border/50 shadow-inner">
                            {prop.images?.[0] ? (
                                <img src={prop.images[0]} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                                    Nenhuma imagem disponível
                                </div>
                            )}
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-[10px] font-bold uppercase tracking-[0.1em] shadow-lg">
                                <Instagram size={14} className="text-accent-icon" />
                                Instagram Feed
                            </div>
                        </div>

                        {/* Editor de Legenda */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <label className="text-[10px] font-black text-[#404F4F]/60 uppercase tracking-[0.15em] flex items-center gap-2">
                                        Tom de Voz (IA)
                                    </label>
                                    <div className="relative max-w-[200px]">
                                        <select
                                            value={selectedPromptId}
                                            onChange={(e) => setSelectedPromptId(e.target.value)}
                                            className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-medium rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-secondary/50 transition-all cursor-pointer"
                                        >
                                            <option value="">Padrão do Sistema</option>
                                            {prompts.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={generateCaption}
                                    disabled={isLoading}
                                    className="h-[34px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 px-4 bg-[#404F4F] text-white rounded-lg hover:bg-[#2d3939] transition-all disabled:opacity-50 shadow-sm"
                                >
                                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-accent-icon" />}
                                    Sugerir com IA
                                </button>
                            </div>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Escreva algo sobre este property ou use a IA para gerar uma legenda profissional..."
                                className="w-full h-40 p-4 rounded-xl border border-border bg-gray-50/50 text-sm focus:ring-2 focus:ring-ring/50 outline-none resize-none transition-all leading-relaxed"
                            />
                        </div>

                        {/* Botões de Ação */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="h-12 border border-border rounded-xl font-bold text-[#404F4F] hover:bg-gray-50 transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={isPublishing || !prop.images?.[0]}
                                className="h-12 bg-[#FFE600] text-[#404F4F] rounded-xl font-bold hover:bg-[#F2DB00] transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#FFE600]/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                            >
                                {isPublishing ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Publicando...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Publicar no Feed
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

