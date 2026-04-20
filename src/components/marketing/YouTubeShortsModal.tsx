'use client';

import { useState } from 'react';
import { Youtube, Send, Loader2, Sparkles, X, CheckCircle2, Play, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { toast } from 'sonner';
import { uploadShortToYouTube } from '@/app/_actions/youtube';

interface YouTubeShortsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prop: any;
    tenantId: string;
}

export function YouTubeShortsModal({ isOpen, onClose, prop, tenantId }: YouTubeShortsModalProps) {
    const [selectedVideo, setSelectedVideo] = useState<string>(prop.videos?.[0] || '');
    const [title, setTitle] = useState(prop.title || '');
    const [description, setDescription] = useState(prop.description || '');
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [videoId, setVideoId] = useState('');

    const handleUpload = async () => {
        if (!selectedVideo) {
            toast.error('Selecione um vídeo para enviar.');
            return;
        }

        if (!title.trim()) {
            toast.error('O título do vídeo é obrigatório.');
            return;
        }

        setIsUploading(true);
        try {
            const result = await uploadShortToYouTube({
                tenantId,
                propertyId: prop.id,
                videoUrl: selectedVideo,
                title,
                description,
                privacyStatus: 'public'
            });

            if (result.success) {
                setIsSuccess(true);
                setVideoId(result.videoId || '');
                toast.success('Upload concluído com sucesso!');
            } else {
                throw new Error(result.error || 'Erro desconhecido durante o upload');
            }
        } catch (error: any) {
            console.error('YouTube Upload Error:', error);
            toast.error(`Falha no upload: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Postar YouTube Shorts" size="lg">
            <div className="space-y-8 p-1">
                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-inner">
                            <CheckCircle2 size={56} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-[#404F4F]">Shorts Enviado!</h3>
                            <p className="text-muted-foreground">Seu vídeo está sendo processado pelo YouTube e estará disponível em breve.</p>
                        </div>
                        <a 
                            href={`https://youtube.com/shorts/${videoId}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-8 py-3 bg-[#404F4F] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#2d3939] transition-all"
                        >
                            <Youtube size={20} className="text-[#FFE600]" />
                            Ver no YouTube
                        </a>
                        <button onClick={onClose} className="text-sm font-bold text-muted-foreground hover:text-[#404F4F]">
                            Fechar Janela
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Lado Esquerdo: Seleção e Preview */}
                        <div className="space-y-6">
                            <div className="aspect-[9/16] w-full max-w-[300px] mx-auto rounded-[2rem] overflow-hidden bg-black relative shadow-2xl border-4 border-[#404F4F]/10 group">
                                {selectedVideo ? (
                                    <video 
                                        src={selectedVideo} 
                                        className="w-full h-full object-cover"
                                        controls
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-white/40 p-8 text-center space-y-4">
                                        <div className="p-4 rounded-full bg-white/5">
                                            <Play size={32} />
                                        </div>
                                        <p className="text-xs font-medium italic">Nenhum vídeo selecionado</p>
                                    </div>
                                )}
                                <div className="absolute top-6 left-6 bg-red-600 px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
                                    <Youtube size={14} />
                                    Preview Shorts
                                </div>
                            </div>

                            {prop.videos && prop.videos.length > 1 && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-[#404F4F]/60 uppercase tracking-widest">Escolha o vídeo:</label>
                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {prop.videos.map((v: string, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedVideo(v)}
                                                className={`relative w-20 aspect-[9/16] rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                                                    selectedVideo === v ? 'border-[#FFE600] scale-105 shadow-lg' : 'border-transparent opacity-60'
                                                }`}
                                            >
                                                <video src={v} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!prop.videos || prop.videos.length === 0 && (
                                <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 flex gap-4">
                                    <AlertCircle className="text-amber-500 shrink-0" size={24} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-amber-900">Nenhum vídeo cadastrado</p>
                                        <p className="text-xs text-amber-800 leading-relaxed">Este property não possui vídeos. Faça o upload de um vídeo vertical no cadastro do property para postar no YouTube.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lado Direito: Formulário */}
                        <div className="space-y-6 flex flex-col justify-between">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#404F4F]/60 uppercase tracking-widest ml-1">Título do Vídeo</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ex: Apartamento decorado incrível..."
                                        className="w-full p-4 rounded-2xl border border-border bg-gray-50/50 text-sm focus:ring-2 focus:ring-[#FFE600]/50 outline-none transition-all font-medium"
                                    />
                                    <p className="text-[9px] text-muted-foreground ml-1 italic">* O YouTube adicionará automaticamente #Shorts ao final se você não colocar.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#404F4F]/60 uppercase tracking-widest ml-1">Descrição</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Conte um pouco mais sobre esse property..."
                                        className="w-full h-40 p-4 rounded-2xl border border-border bg-gray-50/50 text-sm focus:ring-2 focus:ring-[#FFE600]/50 outline-none resize-none transition-all font-medium leading-relaxed"
                                    />
                                </div>

                                <div className="bg-[#404F4F]/5 p-4 rounded-2xl border border-[#404F4F]/10 flex gap-3">
                                    <Sparkles className="text-[#404F4F] shrink-0" size={18} />
                                    <p className="text-[11px] text-[#404F4F]/70 leading-relaxed">
                                        <strong>Dica de SEO:</strong> Use o Estúdio de IA para gerar uma descrição vendedora e cole aqui para melhores resultados.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={onClose}
                                    className="h-14 rounded-2xl border border-border font-black text-[#404F4F]/60 uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading || !selectedVideo}
                                    className="h-14 bg-[#FFE600] text-[#404F4F] rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#F2DB00] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FFE600]/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Publicar Shorts
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
