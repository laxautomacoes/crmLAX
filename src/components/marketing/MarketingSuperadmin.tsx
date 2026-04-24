'use client';

import { useState, useEffect } from 'react';
import { 
    Image as ImageIcon, 
    Film, 
    Layers, 
    PlayCircle, 
    History,
    Upload, 
    Loader2, 
    X, 
    ExternalLink, 
    CheckCircle2,
    Instagram
} from 'lucide-react';
import { getInstagramFeed } from '@/app/_actions/social';
import { MarketingStudio } from './MarketingStudio';
import { MediaUpload } from '../shared/MediaUpload';
import { CreativePostModal } from './CreativePostModal';
import { toast } from 'sonner';

interface MarketingSuperadminProps {
    tenantId: string;
    profileId: string;
}

type PostType = 'single' | 'carousel' | 'reels' | 'stories';

export function MarketingSuperadmin({ tenantId, profileId }: MarketingSuperadminProps) {
    const [activePostType, setActivePostType] = useState<PostType>('single');
    const [images, setImages] = useState<string[]>([]);
    const [videos, setVideos] = useState<string[]>([]);
    const [instaFeed, setInstaFeed] = useState<any[]>([]);
    const [isLoadingFeed, setIsLoadingFeed] = useState(true);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        setIsLoadingFeed(true);
        try {
            const result = await getInstagramFeed();
            if (result.success) {
                setInstaFeed(result.data);
            } else {
                console.error(result.error);
            }
        } catch (error) {
            console.error('Feed fetch error:', error);
        } finally {
            setIsLoadingFeed(false);
        }
    };

    const postTypes = [
        { id: 'single', label: 'Feed Imagem', icon: ImageIcon },
        { id: 'carousel', label: 'Carrossel', icon: Layers },
        { id: 'reels', label: 'Reels', icon: PlayCircle },
        { id: 'stories', label: 'Stories', icon: History },
    ];

    const handleUpload = (type: 'images' | 'videos', urls: any[]) => {
        if (type === 'images') setImages([...images, ...urls]);
        if (type === 'videos') setVideos([...videos, ...urls]);
        toast.success(`${type === 'images' ? 'Imagem' : 'Vídeo'} carregado com sucesso!`);
    };

    const handleRemove = (type: 'images' | 'videos', index: number) => {
        if (type === 'images') setImages(images.filter((_, i) => i !== index));
        if (type === 'videos') setVideos(videos.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-16 pb-20">
            {/* 1. Estúdio IA Minimalista */}
            <MarketingStudio 
                tenantId={tenantId} 
                profileId={profileId} 
                variant="minimal" 
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Lado Esquerdo: Criação e Upload (7 colunas) */}
                <div className="lg:col-span-7 space-y-10">
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-[#404F4F] flex items-center gap-2">
                                <Upload size={20} className="text-accent-icon" />
                                Gestor de Mídias
                            </h3>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                {postTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setActivePostType(type.id as PostType)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${
                                            activePostType === type.id
                                                ? 'bg-white text-[#404F4F] shadow-sm'
                                                : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        <type.icon size={12} />
                                        <span className="hidden sm:inline">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-border/50 p-8 shadow-sm">
                            <MediaUpload 
                                images={images}
                                videos={videos}
                                documents={[]}
                                onUpload={(type, urls) => handleUpload(type as any, urls)}
                                onRemove={(type, index) => handleRemove(type as any, index)}
                                pathPrefix="marketing/superadmin"
                            />
                            
                            <div className="mt-8 pt-6 border-t border-border/50 flex justify-end">
                                <button
                                    onClick={() => setIsPostModalOpen(true)}
                                    disabled={images.length === 0 && videos.length === 0}
                                    className="px-8 h-12 bg-[#404F4F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#2d3939] transition-all shadow-lg shadow-[#404F4F]/20 active:scale-95 disabled:opacity-30"
                                >
                                    Agendar Publicação
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Lado Direito: Preview do Feed (5 colunas) */}
                <div className="lg:col-span-5 space-y-10">
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-[#404F4F] flex items-center gap-2">
                                <Instagram size={20} className="text-[#404F4F]/40" />
                                Feed Atual
                            </h3>
                            <button 
                                onClick={fetchFeed}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Atualizar Feed"
                            >
                                <History size={16} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="bg-[#F9FAFB] rounded-[2rem] border border-border/50 p-6 min-h-[400px]">
                            {isLoadingFeed ? (
                                <div className="grid grid-cols-3 gap-2 animate-pulse">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                                        <div key={i} className="aspect-square bg-gray-200 rounded-lg" />
                                    ))}
                                </div>
                            ) : instaFeed.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {instaFeed.map((item) => (
                                        <a 
                                            key={item.id} 
                                            href={item.permalink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="group relative aspect-square rounded-lg overflow-hidden bg-gray-200 border border-border/10 transition-all hover:scale-[1.02]"
                                        >
                                            <img 
                                                src={item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url} 
                                                alt={item.caption}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                                            />
                                            {item.media_type === 'VIDEO' && (
                                                <div className="absolute top-1.5 right-1.5 text-white drop-shadow-md">
                                                    <PlayCircle size={14} />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <ExternalLink size={16} className="text-white" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-12 text-center text-gray-400 space-y-3">
                                    <Instagram size={40} className="opacity-10" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Nenhuma mídia encontrada</p>
                                </div>
                            )}

                            <div className="mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-border/50 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <CheckCircle2 size={12} className="text-green-500" />
                                Conectado via Conta do Sistema
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Modal de Publicação Customizada */}
            <CreativePostModal 
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                images={images}
                videos={videos}
                postType={activePostType}
                tenantId={tenantId}
            />
        </div>
    );
}
