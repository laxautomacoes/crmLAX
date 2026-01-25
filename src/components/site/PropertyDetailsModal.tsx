'use client';

import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { FullscreenMediaViewer } from '@/components/shared/FullscreenMediaViewer';
import { Home, MapPin, BedDouble, Bath, Square, Car, Shield, Waves, Utensils, PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, Video, FileText, ExternalLink, Maximize2 } from 'lucide-react';
import { translatePropertyType } from '@/utils/property-translations';

export function PropertyDetailsModal({ isOpen, onClose, asset }: { isOpen: boolean, onClose: () => void, asset: any }) {
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

    if (!asset) return null;
    const details = asset.details || {};
    
    const allMedia = [
        ...(asset.images || []).map((url: string) => ({ type: 'image' as const, url })),
        ...(asset.videos || []).map((url: string) => ({ type: 'video' as const, url }))
    ];

    const amenities = [
        { id: 'piscina', icon: <Waves size={16} />, label: 'Piscina' },
        { id: 'academia', icon: <Dumbbell size={16} />, label: 'Academia' },
        { id: 'espaco_gourmet', icon: <Utensils size={16} />, label: 'Espaço Gourmet' },
        { id: 'salao_festas', icon: <PartyPopper size={16} />, label: 'Salão de Festas' },
        { id: 'home_market', icon: <Home size={16} />, label: 'Home Market' },
    ].filter(a => details[a.id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={asset.title} size="xl">
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div 
                            onClick={() => setIsFullscreenOpen(true)}
                            className="relative group aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-zoom-in"
                        >
                            <img src={asset.images?.[selectedMediaIndex]} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105" alt="" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <div className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white">
                                    <Maximize2 size={20} />
                                </div>
                            </div>
                        </div>
                        
                        {/* Images Carousel */}
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                            {asset.images?.map((url: string, i: number) => (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedMediaIndex(i)}
                                    className={`relative flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all snap-start ${
                                        selectedMediaIndex === i ? 'border-secondary' : 'border-transparent hover:border-border'
                                    }`}
                                >
                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                </div>
                            ))}
                        </div>

                        {/* Videos Carousel (Separated) */}
                        {asset.videos?.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-border/50">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
                                    <Video size={12} className="text-secondary" />
                                    Vídeos
                                </h4>
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                                    {asset.videos.map((url: string, i: number) => (
                                        <div 
                                            key={i} 
                                            onClick={() => {
                                                const videoIndex = (asset.images?.length || 0) + i;
                                                setSelectedMediaIndex(videoIndex);
                                                setIsFullscreenOpen(true);
                                            }}
                                            className="relative flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-secondary transition-all snap-start group bg-black cursor-pointer"
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                                <Play size={16} className="text-white fill-white group-hover:scale-110 transition-transform" />
                                            </div>
                                            <video src={url} className="w-full h-full object-cover opacity-60" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-foreground">
                                {asset.price ? `R$ ${Number(asset.price).toLocaleString('pt-BR')}` : 'Sob consulta'}
                            </span>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-muted text-muted-foreground text-[10px] font-bold rounded uppercase tracking-wider">
                                    {translatePropertyType(asset.type || asset.details?.type)}
                                </span>
                                <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full uppercase">{asset.status}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {/* Row 1: Basic Features */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 min-w-0 hover:bg-muted/60 transition-colors">
                                    <BedDouble size={16} className="text-secondary flex-shrink-0" /> 
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Dormitórios</span>
                                        <span className="font-black text-foreground text-lg leading-tight">{details.dormitorios || details.quartos || 0}</span> 
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 min-w-0 hover:bg-muted/60 transition-colors">
                                    <Bath size={16} className="text-secondary flex-shrink-0" /> 
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Banheiros</span>
                                        <span className="font-black text-foreground text-lg leading-tight">{details.banheiros || 0}</span> 
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 min-w-0 hover:bg-muted/60 transition-colors">
                                    <Car size={16} className="text-secondary flex-shrink-0" /> 
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Vagas de Garagem</span>
                                        <span className="font-black text-foreground text-lg leading-tight">{details.vagas || 0}</span> 
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Area Features */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 min-w-0 hover:bg-muted/60 transition-colors">
                                    <Square size={16} className="text-secondary flex-shrink-0" /> 
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Área Privativa</span>
                                        <span className="font-black text-foreground text-lg leading-tight">{details.area_privativa || details.area_util || 0}m²</span> 
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 min-w-0 hover:bg-muted/60 transition-colors">
                                    <Square size={16} className="text-secondary flex-shrink-0" /> 
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Área Total</span>
                                        <span className="font-black text-foreground text-lg leading-tight">{details.area_total || 0}m²</span> 
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 min-w-0 hover:bg-muted/60 transition-colors">
                                    <Square size={16} className="text-secondary flex-shrink-0" /> 
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Área do Terreno</span>
                                        <span className="font-black text-foreground text-lg leading-tight">{details.area_terreno || 0}m²</span> 
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 min-w-0 hover:bg-muted/60 transition-colors">
                                    <Square size={16} className="text-secondary flex-shrink-0" /> 
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Área Construída</span>
                                        <span className="font-black text-foreground text-lg leading-tight">{details.area_construida || 0}m²</span> 
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{asset.description || 'Sem descrição disponível.'}</p>
                        {amenities.length > 0 && (
                            <div className="pt-4 border-t border-border">
                                <h4 className="text-sm font-bold text-foreground mb-3">Diferenciais</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {amenities.map(a => (
                                        <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">{a.icon}</div>
                                            {a.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {(asset.videos?.length > 0 || asset.documents?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
                        {asset.videos?.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-foreground flex items-center gap-2"><Video size={18} className="text-secondary" /> Vídeos</h4>
                                <div className="space-y-2">
                                    {asset.videos.map((url: string, i: number) => (
                                        <button 
                                            key={i} 
                                            onClick={() => {
                                                const videoIndex = (asset.images?.length || 0) + i;
                                                setSelectedMediaIndex(videoIndex);
                                                setIsFullscreenOpen(true);
                                            }}
                                            className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors group"
                                        >
                                            <span className="text-xs font-medium">Vídeo {i + 1}</span>
                                            <div className="flex items-center gap-2">
                                                <Maximize2 size={14} className="text-muted-foreground group-hover:text-secondary" />
                                                <ExternalLink size={14} className="text-muted-foreground group-hover:text-secondary" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {asset.documents?.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-foreground flex items-center gap-2"><FileText size={18} className="text-secondary" /> Documentos</h4>
                                <div className="space-y-2">
                                    {asset.documents.map((doc: any, i: number) => (
                                        <a key={i} href={doc.url} target="_blank" className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors group">
                                            <span className="text-xs font-medium truncate pr-4">{doc.name}</span>
                                            <ExternalLink size={14} className="text-muted-foreground group-hover:text-secondary" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <FullscreenMediaViewer
                isOpen={isFullscreenOpen}
                onClose={() => setIsFullscreenOpen(false)}
                media={allMedia}
                initialIndex={selectedMediaIndex}
            />
        </Modal>
    );
}
