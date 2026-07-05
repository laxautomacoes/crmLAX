'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Image as ImageIcon,
    Layers,
    Film,
    Sparkles,
    Loader2,
    Send,
    Copy,
    Check,
    CheckCircle2,
    Play,
    AlertCircle,
    X,
    ZoomIn,
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { toast } from 'sonner';
import { publishSocialPost } from '@/app/_actions/social';
import { generatePropertyCopy } from '@/app/_actions/ai-copy';

type TabType = 'feed' | 'carrossel' | 'reels';

interface QuickPublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    prop: any;
    tenantId: string;
    profileId: string;
}

export function QuickPublishModal({ isOpen, onClose, prop, tenantId, profileId }: QuickPublishModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('feed');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<string>('');
    const [caption, setCaption] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

    const images: string[] = prop?.images || [];
    const videos: string[] = prop?.videos || [];

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab('feed');
            setSelectedImages(images.length > 0 ? [images[0]] : []);
            setSelectedVideo(videos.length > 0 ? videos[0] : '');
            setCaption('');
            setIsSuccess(false);
            setCopied(false);
            setPreviewMedia(null);
        }
    }, [isOpen]);

    const handleImageToggle = (url: string) => {
        if (activeTab === 'feed') {
            // Feed: apenas 1 imagem
            setSelectedImages([url]);
        } else {
            // Carrossel: múltiplas (2-10)
            setSelectedImages(prev => {
                if (prev.includes(url)) {
                    return prev.filter(u => u !== url);
                }
                if (prev.length >= 10) {
                    toast.error('Máximo de 10 imagens por carrossel.');
                    return prev;
                }
                return [...prev, url];
            });
        }
    };

    const generateCaption = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            const result = await generatePropertyCopy(prop.id, tenantId, profileId);
            if (result.success && result.data) {
                setCaption(result.data.medium);
                toast.success('Legenda gerada com sucesso!');
            } else {
                throw new Error(result.error || 'Erro ao gerar legenda');
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao gerar legenda com IA.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (!caption) return;
        navigator.clipboard.writeText(caption);
        setCopied(true);
        toast.success('Legenda copiada!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePublish = async () => {
        if (activeTab === 'reels') {
            toast.info('Publicação de Reels estará disponível em breve.');
            return;
        }

        if (selectedImages.length === 0) {
            toast.error('Selecione pelo menos uma imagem.');
            return;
        }

        if (activeTab === 'carrossel' && selectedImages.length < 2) {
            toast.error('Selecione pelo menos 2 imagens para o carrossel.');
            return;
        }

        setIsPublishing(true);
        try {
            const result = await publishSocialPost({
                tenantId,
                mediaUrls: selectedImages,
                caption: caption || '',
                networks: { instagram: true, facebook: false }
            });

            if (result.success) {
                setIsSuccess(true);
                toast.success(activeTab === 'feed' ? 'Postado com sucesso no Feed!' : 'Carrossel publicado com sucesso!');
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

    const tabs: { id: TabType; label: string; icon: any }[] = [
        { id: 'feed', label: 'Feed', icon: ImageIcon },
        { id: 'carrossel', label: 'Carrossel', icon: Layers },
        { id: 'reels', label: 'Reels', icon: Film },
    ];

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        if (tab === 'feed') {
            setSelectedImages(images.length > 0 ? [images[0]] : []);
        } else if (tab === 'carrossel') {
            setSelectedImages([]);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Publicar — ${prop?.title || 'Imóvel'}`} size="xl">
            <div className="space-y-6">
                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                            <CheckCircle2 size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Publicado com Sucesso!</h3>
                        <p className="text-muted-foreground text-sm">
                            {activeTab === 'feed' ? 'Seu imóvel já está brilhando no Feed.' : 'Seu carrossel foi publicado.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center border-b border-border overflow-x-auto no-scrollbar mb-4">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`px-6 py-3 text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap border-b-[3px] ${
                                        activeTab === tab.id
                                            ? 'text-foreground active-tab-indicator'
                                            : 'text-muted-foreground hover:text-foreground border-transparent'
                                    }`}
                                >
                                    <tab.icon size={14} strokeWidth={1} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Card Explicativo da Aba Ativa */}
                        {activeTab !== 'reels' && (
                            <div className="p-3 bg-muted rounded-lg border border-border flex items-center gap-3 animate-in fade-in duration-200">
                                {activeTab === 'feed' ? (
                                    <>
                                        <ImageIcon size={16} className="text-secondary shrink-0" />
                                        <p className="text-[11px] text-muted-foreground">
                                            <strong className="text-foreground">Post único</strong> — A imagem selecionada será publicada no Feed do Instagram.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Layers size={16} className="text-secondary shrink-0" />
                                        <p className="text-[11px] text-muted-foreground">
                                            <strong className="text-foreground">Carrossel</strong> — Selecione de 2 a 10 imagens. A ordem de seleção será a ordem do carrossel.
                                        </p>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Conteúdo das Abas */}
                        {activeTab === 'reels' ? (
                            /* === ABA REELS === */
                            <div className="space-y-4">
                                {videos.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Preview do vídeo */}
                                        <div className="aspect-[9/16] max-h-[400px] w-full max-w-[250px] mx-auto rounded-lg overflow-hidden bg-black relative shadow-lg border border-border">
                                            {selectedVideo ? (
                                                <video src={selectedVideo} className="w-full h-full object-cover" controls />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-3">
                                                    <Play size={32} />
                                                    <p className="text-xs font-medium">Selecione um vídeo</p>
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3 bg-red-600 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white text-[9px] font-black uppercase tracking-widest">
                                                <Film size={12} />
                                                Reels
                                            </div>
                                        </div>

                                        {/* Seleção de vídeos */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Escolha o vídeo</label>
                                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                                {videos.map((v: string, i: number) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setSelectedVideo(v)}
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewMedia({ url: v, type: 'video' });
                                                        }}
                                                        className={`group relative w-20 aspect-[9/16] rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                                                            selectedVideo === v ? 'border-secondary scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                                                        }`}
                                                    >
                                                        <video src={v} className="w-full h-full object-cover" />
                                                        {/* Ícone de zoom clicável */}
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPreviewMedia({ url: v, type: 'video' });
                                                            }}
                                                            className="absolute bottom-1 right-1 w-5 h-5 bg-black/60 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80"
                                                        >
                                                            <ZoomIn size={10} className="text-white" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            {prop?.description && (
                                                <div className="space-y-3 mt-6 pt-5 border-t border-border/30">
                                                    <div className="flex items-center justify-between h-[28px]">
                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                            Descrição
                                                        </label>
                                                    </div>
                                                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar rounded-lg bg-foreground/5 border border-border/40 p-3">
                                                        <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{prop.description}</p>
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground/60 italic">Use como referência ou copie trechos para a legenda.</p>
                                                </div>
                                            )}

                                            {/* Editor de legenda */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Legenda</label>
                                                    <button
                                                        onClick={generateCaption}
                                                        disabled={isGenerating}
                                                        className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-all disabled:opacity-50"
                                                    >
                                                        {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-secondary" />}
                                                        Gerar com IA
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={caption}
                                                    onChange={(e) => setCaption(e.target.value)}
                                                    placeholder="Escreva a legenda ou gere com IA..."
                                                    className="w-full h-28 p-4 rounded-lg border border-border bg-foreground/5 text-sm focus:ring-2 focus:ring-ring/50 outline-none resize-none transition-all leading-relaxed text-foreground placeholder:text-muted-foreground/50"
                                                />
                                            </div>

                                            {/* Botão de ação */}
                                            <div className="p-4 bg-muted rounded-lg border border-border flex items-center gap-3">
                                                <AlertCircle size={18} className="text-secondary shrink-0" />
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    A publicação de Reels no Instagram estará disponível em breve. Por enquanto, use o <strong className="text-foreground">YouTube Shorts</strong> na seção de conexões.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                                            <Film size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-foreground">Nenhum vídeo cadastrado</p>
                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                Este imóvel não possui vídeos. Faça o upload de um vídeo vertical no cadastro do imóvel para publicar como Reels.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* === ABA FEED / CARROSSEL === */
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Lado Esquerdo: Grade de imagens */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            {activeTab === 'feed' ? 'Escolha 1 imagem' : 'Selecione as imagens'}
                                        </label>
                                        {activeTab === 'carrossel' && (
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                                                selectedImages.length >= 2 ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {selectedImages.length}/10
                                            </span>
                                        )}
                                    </div>

                                    {images.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2 pr-1">
                                            {images.map((url: string, idx: number) => {
                                                const isSelected = selectedImages.includes(url);
                                                const selectionIndex = selectedImages.indexOf(url);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleImageToggle(url)}
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewMedia({ url, type: 'image' });
                                                        }}
                                                        className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                                            isSelected
                                                                ? 'border-secondary shadow-lg scale-[0.97]'
                                                                : 'border-transparent hover:border-border hover:scale-[0.97]'
                                                        }`}
                                                    >
                                                        <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-secondary/20 flex items-center justify-center">
                                                                <div className="w-7 h-7 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground shadow-md">
                                                                    {activeTab === 'carrossel' ? (
                                                                        <span className="text-[10px] font-black">{selectionIndex + 1}</span>
                                                                    ) : (
                                                                        <Check size={14} strokeWidth={3} />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Indicador de zoom no hover - clicável */}
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPreviewMedia({ url, type: 'image' });
                                                            }}
                                                            className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80"
                                                        >
                                                            <ZoomIn size={12} className="text-white" />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-muted rounded-lg">
                                            <ImageIcon size={28} className="text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground">Nenhuma imagem cadastrada neste imóvel.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Lado Direito: Editor de legenda + ações */}
                                <div className="space-y-4 flex flex-col">
                                    {/* Descrição do Imóvel como referência */}
                                    {prop?.description && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between h-[28px]">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                    Descrição
                                                </label>
                                            </div>
                                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar rounded-lg bg-foreground/5 border border-border/40 p-3">
                                                <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{prop.description}</p>
                                            </div>
                                            <p className="text-[9px] text-muted-foreground/60 italic">Use como referência ou copie trechos para a legenda.</p>
                                        </div>
                                    )}

                                    {/* Editor de legenda */}
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Legenda</label>
                                            <button
                                                onClick={generateCaption}
                                                disabled={isGenerating}
                                                className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-all disabled:opacity-50"
                                            >
                                                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-secondary" />}
                                                Gerar com IA
                                            </button>
                                        </div>
                                        <textarea
                                            value={caption}
                                            onChange={(e) => setCaption(e.target.value)}
                                            placeholder="Escreva a legenda ou gere automaticamente com IA..."
                                            className="w-full h-48 p-4 rounded-lg border border-border bg-foreground/5 text-sm focus:ring-2 focus:ring-ring/50 outline-none resize-none transition-all leading-relaxed text-foreground placeholder:text-muted-foreground/50"
                                        />
                                    </div>

                                    {/* Botões de ação */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <button
                                            onClick={handleCopy}
                                            disabled={!caption}
                                            className="h-11 border border-border rounded-lg font-bold text-foreground hover:bg-muted transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-40"
                                        >
                                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                            {copied ? 'Copiado!' : 'Copiar Legenda'}
                                        </button>
                                        <button
                                            onClick={handlePublish}
                                            disabled={isPublishing || selectedImages.length === 0 || (activeTab === 'carrossel' && selectedImages.length < 2)}
                                            className="h-11 bg-secondary text-secondary-foreground rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-secondary/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                                        >
                                            {isPublishing ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Publicando...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={14} />
                                                    {activeTab === 'feed' ? 'Publicar Feed' : 'Publicar Carrossel'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Lightbox de Preview - Duplo clique ou lupa */}
            {previewMedia && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setPreviewMedia(null)}
                >
                    <div
                        className="relative max-w-[85vw] max-h-[85vh] animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {previewMedia.type === 'image' ? (
                            <img
                                src={previewMedia.url}
                                alt="Preview ampliada"
                                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                            />
                        ) : (
                            <video
                                src={previewMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                            />
                        )}
                        <button
                            onClick={() => setPreviewMedia(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-all shadow-lg"
                        >
                            <X size={16} />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg">
                            <p className="text-white text-[11px] font-medium">Clique fora ou no ✕ para fechar</p>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
