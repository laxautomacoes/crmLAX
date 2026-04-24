'use client';

import { useState } from 'react';
import { 
    X, 
    Send, 
    Calendar, 
    Loader2, 
    Sparkles,
    Instagram,
    Facebook,
    Monitor
} from 'lucide-react';
import { toast } from 'sonner';

interface CreativePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    videos: string[];
    postType: string;
    tenantId: string;
}

export function CreativePostModal({ isOpen, onClose, images, videos, postType, tenantId }: CreativePostModalProps) {
    const [caption, setCaption] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    if (!isOpen) return null;

    const handlePublish = async () => {
        setIsPosting(true);
        try {
            // Simulação de publicação (Integração com Edge Function será feita na v2)
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast.success('Publicação enviada com sucesso!');
            onClose();
        } catch (error) {
            toast.error('Erro ao publicar criativo.');
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#404F4F]/80 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]">
                {/* Lado Esquerdo: Preview (60%) */}
                <div className="flex-1 bg-gray-100 p-8 flex items-center justify-center overflow-y-auto">
                    <div className="w-full max-w-sm aspect-[4/5] bg-white rounded-3xl shadow-xl overflow-hidden border border-border/50 flex flex-col">
                        <div className="p-4 flex items-center gap-3 border-b border-border/50">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FFE600] to-orange-400" />
                            <div className="flex-1">
                                <div className="h-2 w-24 bg-gray-200 rounded-full mb-1" />
                                <div className="h-2 w-16 bg-gray-100 rounded-full" />
                            </div>
                        </div>
                        
                        <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden">
                            {images.length > 0 ? (
                                <img src={images[0]} className="w-full h-full object-cover" alt="Preview" />
                            ) : videos.length > 0 ? (
                                <video src={videos[0]} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-gray-300 flex flex-col items-center gap-3">
                                    <Monitor size={48} className="opacity-20" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Sem mídia selecionada</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 space-y-3">
                            <div className="flex gap-4">
                                <span className="h-4 w-4 rounded-full border-2 border-gray-300" />
                                <span className="h-4 w-4 rounded-full border-2 border-gray-300" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-gray-100 rounded-full" />
                                <div className="h-2 w-2/3 bg-gray-100 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lado Direito: Opções (40%) */}
                <div className="w-full md:w-[400px] bg-white p-8 flex flex-col border-l border-border/50">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-[#404F4F] uppercase tracking-tighter">Novo Post</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#404F4F]/60 uppercase tracking-widest">Legenda do Post</label>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Escreva sua legenda aqui..."
                                className="w-full h-40 p-4 rounded-2xl bg-gray-50 border border-border/50 text-sm focus:ring-2 focus:ring-ring/30 outline-none resize-none"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-[#404F4F]/60 uppercase tracking-widest">Destinos</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl border-2 border-accent-icon bg-accent-icon/5 flex items-center gap-3">
                                    <Instagram size={18} className="text-[#404F4F]" />
                                    <span className="text-[10px] font-bold">Instagram</span>
                                </div>
                                <div className="p-4 rounded-2xl border border-border/50 bg-gray-50 opacity-40 flex items-center gap-3 grayscale">
                                    <Facebook size={18} />
                                    <span className="text-[10px] font-bold">Facebook</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border/50 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 mb-2">
                            <Calendar size={12} />
                            Agendamento disponível em breve
                        </div>
                        <button
                            onClick={handlePublish}
                            disabled={isPosting || (!images.length && !videos.length)}
                            className="w-full h-14 bg-[#404F4F] hover:bg-[#2d3939] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-30"
                        >
                            {isPosting ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    <Send size={16} />
                                    Publicar Agora
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
