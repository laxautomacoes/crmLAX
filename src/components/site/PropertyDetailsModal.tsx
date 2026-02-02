'use client';

import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { FullscreenMediaViewer } from '@/components/shared/FullscreenMediaViewer';
import { LeadFormModal } from './LeadFormModal';
import { Home, MapPin, BedDouble, Bath, Car, Shield, Waves, Utensils, PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, Video, FileText, Info, DollarSign, ExternalLink, Maximize2, Trees, MessageCircle } from 'lucide-react';
import { translatePropertyType, getPropertyTypeStyles, getStatusStyles, getSituacaoStyles } from '@/utils/property-translations';
import { PropertyMap } from '@/components/shared/PropertyMap';
import { SafeMarkdownRenderer } from '@/components/shared/SafeMarkdownRenderer';

export function PropertyDetailsModal({ isOpen, onClose, asset }: { isOpen: boolean, onClose: () => void, asset: any }) {
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const [showLeadForm, setShowLeadForm] = useState(false);

    if (!asset) return null;
    const details = asset.details || {};
    
    const allMedia = [
        ...(asset.images || []).map((url: string) => ({ type: 'image' as const, url })),
        ...(asset.videos || []).map((url: string) => ({ type: 'video' as const, url }))
    ];

    const amenities = [
        { id: 'portaria_24h', icon: <Shield size={16} />, label: 'Portaria 24h' },
        { id: 'portaria_virtual', icon: <Shield size={16} />, label: 'Portaria Virtual' },
        { id: 'piscina', icon: <Waves size={16} />, label: 'Piscina' },
        { id: 'piscina_aquecida', icon: <Waves size={16} />, label: 'Piscina Aquecida' },
        { id: 'espaco_gourmet', icon: <Utensils size={16} />, label: 'Espaço Gourmet' },
        { id: 'salao_festas', icon: <PartyPopper size={16} />, label: 'Salão de Festas' },
        { id: 'academia', icon: <Dumbbell size={16} />, label: 'Academia' },
        { id: 'sala_jogos', icon: <Gamepad2 size={16} />, label: 'Sala de Jogos' },
        { id: 'sala_estudos_coworking', icon: <BookOpen size={16} />, label: 'Estudos/Coworking' },
        { id: 'sala_cinema', icon: <Film size={16} />, label: 'Sala de Cinema' },
        { id: 'playground', icon: <Baby size={16} />, label: 'Playground' },
        { id: 'brinquedoteca', icon: <Baby size={16} />, label: 'Brinquedoteca' },
        { id: 'home_market', icon: <Home size={16} />, label: 'Home Market' },
    ].filter(a => details[a.id]);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={
                <div className="flex flex-col gap-2 w-full pr-2 mt-1">
                    <div className="flex items-center gap-4 w-full">
                        <h2 className="text-lg font-bold text-muted-foreground dark:text-white uppercase tracking-widest flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-white/10 rounded-lg text-white">
                                <Home size={16} />
                            </div>
                            <span className="truncate">{asset.title}</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar">
                        {details.situacao && (
                            <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-tight md:tracking-widest shadow-sm ${getSituacaoStyles(details.situacao)}`}>
                                {details.situacao}
                            </span>
                        )}
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-tight md:tracking-widest shadow-sm ${getPropertyTypeStyles(asset.type || asset.details?.type)}`}>
                            {translatePropertyType(asset.type || asset.details?.type)}
                        </span>
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-tight md:tracking-widest shadow-sm ${getStatusStyles(asset.status)}`}>
                            {asset.status}
                        </span>
                    </div>
                </div>
            } 
            size="2xl"
        >
            <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-2">
                <div className="flex flex-col gap-8">
                    <div className="space-y-6">
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
                                        selectedMediaIndex === i ? 'border-primary' : 'border-transparent hover:border-border'
                                    }`}
                                >
                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                </div>
                            ))}
                        </div>

                        {/* Videos Section - Always Visible */}
                        <div className="flex flex-col gap-3">
                            <h4 className="text-lg font-bold text-muted-foreground dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <div className="p-1.5 bg-white/10 rounded-lg text-white">
                                    <Video size={16} />
                                </div>
                                Vídeos
                            </h4>
                            {asset.videos?.length > 0 ? (
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                                    {asset.videos.map((url: string, i: number) => (
                                        <div 
                                            key={i} 
                                            onClick={() => {
                                                const videoIndex = (asset.images?.length || 0) + i;
                                                setSelectedMediaIndex(videoIndex);
                                                setIsFullscreenOpen(true);
                                            }}
                                            className="relative flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all snap-start group bg-black cursor-pointer"
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                                <Play size={16} className="text-white fill-white group-hover:scale-110 transition-transform" />
                                            </div>
                                            <video src={url} className="w-full h-full object-cover opacity-60" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="italic text-base text-muted-foreground dark:text-white">Nenhum vídeo disponível.</p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="flex flex-col gap-3">
                        <h4 className="text-lg font-bold text-muted-foreground dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-lg text-white">
                                <DollarSign size={16} />
                            </div>
                            Valor do Imóvel
                        </h4>
                        <div className="text-base text-muted-foreground dark:text-white flex items-center gap-2">
                            <span className="flex-shrink-0">•</span>
                            <span>
                                {Number(asset.price) > 0 
                                    ? `R$ ${Number(asset.price).toLocaleString('pt-BR')}` 
                                    : 'Sob consulta'}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="flex flex-col gap-3">
                        <h4 className="text-lg font-bold text-muted-foreground dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-lg text-white">
                                <MapPin size={16} />
                            </div>
                            Localização
                        </h4>
                        <div className="text-base text-muted-foreground dark:text-white flex items-center gap-2">
                            <span className="flex-shrink-0">•</span>
                            <span>
                                {details.endereco?.bairro && `${details.endereco.bairro}, `}
                                {details.endereco?.cidade && `${details.endereco.cidade} / `}
                                {details.endereco?.estado && `${details.endereco.estado}`}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="flex flex-col gap-3">
                        <h4 className="text-lg font-bold text-muted-foreground dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-lg text-white">
                                <Info size={16} />
                            </div>
                            Dados
                        </h4>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span className="text-base text-muted-foreground dark:text-white">Dormitórios:</span>
                                <span className="text-base text-foreground dark:text-white">{details.dormitorios || details.quartos || 0}</span>
                                {Number(details.suites) > 0 && (
                                    <span className="text-xs text-muted-foreground dark:text-white font-medium">({details.suites} suítes)</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span className="text-base text-muted-foreground dark:text-white">Banheiros:</span>
                                <span className="text-base text-foreground dark:text-white">{details.banheiros || 0}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span className="text-base text-muted-foreground dark:text-white">Vagas:</span>
                                <span className="text-base text-foreground dark:text-white">{details.vagas || 0}</span>
                                {details.vagas_numeracao && (
                                    <span className="text-xs text-muted-foreground dark:text-white font-medium">({details.vagas_numeracao})</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span className="text-base text-muted-foreground dark:text-white">Privativa:</span>
                                <span className="text-base text-foreground dark:text-white">{details.area_privativa || details.area_util || 0}m²</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span className="text-base text-muted-foreground dark:text-white">Total:</span>
                                <span className="text-base text-foreground dark:text-white">{details.area_total || 0}m²</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span className="text-base text-muted-foreground dark:text-white">Terreno:</span>
                                <span className="text-base text-foreground dark:text-white">{details.area_terreno || 0}m²</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span className="text-base text-muted-foreground dark:text-white">Construída:</span>
                                <span className="text-base text-foreground dark:text-white">{details.area_construida || 0}m²</span>
                            </div>
                            {details.torre_bloco && (
                                <div className="flex items-center gap-2">
                                    <span className="flex-shrink-0">•</span>
                                    <span className="text-base text-muted-foreground dark:text-white">Torre/Bloco:</span>
                                    <span className="text-base text-foreground dark:text-white">{details.torre_bloco}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="flex flex-col gap-3">
                        <h4 className="text-lg font-bold text-muted-foreground dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-lg text-white">
                                <FileText size={16} />
                            </div>
                            Descrição
                        </h4>
                        <div className="text-base text-muted-foreground dark:text-white leading-relaxed flex items-start gap-2">
                            <span className="flex-shrink-0">•</span>
                            <div className="flex-1">
                                {asset.description ? (
                                    <SafeMarkdownRenderer content={asset.description} />
                                ) : (
                                    <p className="italic text-base text-muted-foreground dark:text-white">Sem descrição disponível.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Map Location */}
                    {details.endereco?.latitude && details.endereco?.longitude && (
                        <>
                            <div className="border-t border-white/10" />
                            <div className="flex flex-col gap-3">
                                <h4 className="text-lg font-bold text-muted-foreground dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    <div className="p-1.5 bg-white/10 rounded-lg text-white">
                                        <MapPin size={16} />
                                    </div>
                                    Localização
                                </h4>
                                <div className="rounded-xl overflow-hidden border border-border bg-muted/30 p-1 aspect-video">
                                    <PropertyMap 
                                        lat={details.endereco.latitude} 
                                        lng={details.endereco.longitude} 
                                        readOnly={true}
                                        zoom={16}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {amenities.length > 0 && (
                        <>
                            <div className="border-t border-white/10" />
                            <div className="flex flex-col gap-3">
                                <h4 className="text-lg font-bold text-muted-foreground dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    <div className="p-1.5 bg-white/10 rounded-lg text-white">
                                        <Trees size={16} />
                                    </div>
                                    Área comum | Lazer
                                </h4>
                                <div className="flex flex-col gap-3">
                                    {amenities.map(a => (
                                        <div key={a.id} className="text-base text-muted-foreground dark:text-white flex items-center gap-2">
                                             <span className="flex-shrink-0">•</span>
                                             <span>{a.label}</span>
                                         </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Botão Flutuante de Interesse */}
                {!isFullscreenOpen && (
                    <div className="fixed bottom-24 right-6 z-[60] md:absolute md:bottom-24 md:right-8">
                        <button
                            onClick={() => setShowLeadForm(true)}
                            className="bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-4 px-6 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 w-56"
                        >
                            <MessageCircle size={24} />
                            <span className="hidden sm:inline">Tenho interesse</span>
                        </button>
                    </div>
                )}
            </div>

            <FullscreenMediaViewer 
                isOpen={isFullscreenOpen}
                onClose={(index) => {
                    setIsFullscreenOpen(false);
                    setSelectedMediaIndex(index);
                }}
                media={allMedia}
                initialIndex={selectedMediaIndex}
            />

            <LeadFormModal 
                isOpen={showLeadForm}
                onClose={() => setShowLeadForm(false)}
                assetId={asset.id}
                assetTitle={asset.title}
                tenantId={asset.tenant_id}
            />
        </Modal>
    );
}
