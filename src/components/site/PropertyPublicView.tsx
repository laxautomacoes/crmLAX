'use client';

import { useState, useRef, useEffect } from 'react';
import { 
    Home, BedDouble, Bath, Square, Car, Waves, Utensils, 
    PartyPopper, Dumbbell, MessageCircle, MapPin,
    ChevronLeft, ChevronRight, Maximize2, Play, Video, FileText,
    Baby, Flame, Droplets, Laptop, PawPrint, Trophy,
    Briefcase, User, NotebookPen, Fence, FileType
} from 'lucide-react';
import { translatePropertyType, translateStatus, getSituacaoStyles, getPropertyTypeStyles } from '@/utils/property-translations';
import { PropertyMap } from '@/components/shared/PropertyMap';
import { FullscreenMediaViewer } from '@/components/shared/FullscreenMediaViewer';
import { SafeMarkdownRenderer } from '@/components/shared/SafeMarkdownRenderer';

interface PropertyPublicViewProps {
    property: any;
    broker: any;
    tenant: any;
    config?: {
        title: boolean;
        price: boolean;
        showCondo?: boolean;
        showIptu?: boolean;
        description: 'full' | 'none';
        location: 'exact' | 'approximate' | 'none';
        showBedrooms: boolean;
        showSuites: boolean;
        showArea: boolean;
        showType: boolean;
        showSacada?: boolean;
        showEscritorio?: boolean;
        showDependencia?: boolean;
        showObservations?: boolean;
        imageIndices: number[] | null;
        videoIndices: number[] | null;
        docIndices: number[] | null;
    };
}

export function PropertyPublicView({ property, broker, tenant, config }: PropertyPublicViewProps) {
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const [fullscreenIndex, setFullscreenIndex] = useState(0);
    const [videoTime, setVideoTime] = useState<{ [key: string]: number }>({});
    const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const mainVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (thumbnailRefs.current[selectedMediaIndex]) {
            thumbnailRefs.current[selectedMediaIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [selectedMediaIndex]);

    useEffect(() => {
        const currentMedia = allMedia[selectedMediaIndex];
        if (currentMedia?.type === 'video' && mainVideoRef.current) {
            const savedTime = videoTime[currentMedia.url] || 0;
            if (savedTime > 0) {
                mainVideoRef.current.currentTime = savedTime;
            }
        }
    }, [selectedMediaIndex]);

    if (!property) return null;
    
    // Filter media based on config
    const filteredImages = config?.imageIndices 
        ? (property.images || []).filter((_: string, i: number) => config.imageIndices?.includes(i))
        : (property.images || []);

    const filteredVideos = config?.videoIndices
        ? (property.videos || []).filter((_: string, i: number) => config.videoIndices?.includes(i))
        : (property.videos || []);

    // Separating media types
    const imageMedia = filteredImages.map((url: string) => ({ type: 'image' as const, url }));
    const videoMedia = filteredVideos.map((url: string) => ({ type: 'video' as const, url }));
    
    // Current media shown in main viewer
    const allMedia = [...imageMedia, ...videoMedia];

    const filteredDocs = config?.docIndices
        ? (property.documents || []).filter((_: any, i: number) => config.docIndices?.includes(i))
        : (property.documents || []);

    const handleNext = () => {
        if (allMedia.length === 0) return;
        setSelectedMediaIndex((prev) => (prev + 1) % allMedia.length);
    };

    const handlePrev = () => {
        if (allMedia.length === 0) return;
        setSelectedMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    };
    
    const details = property.details || {};
    const amenities = [
        { id: 'piscina', icon: <Waves size={20} />, label: 'Piscina' },
        { id: 'academia', icon: <Dumbbell size={20} />, label: 'Academia' },
        { id: 'espaco_gourmet', icon: <Utensils size={20} />, label: 'Espaço Gourmet' },
        { id: 'salao_festas', icon: <PartyPopper size={20} />, label: 'Salão de Festas' },
        { id: 'playground', icon: <Baby size={20} />, label: 'Playground' },
        { id: 'brinquedoteca', icon: <Baby size={20} />, label: 'Brinquedoteca' },
        { id: 'churrasqueira', icon: <Flame size={20} />, label: 'Churrasqueira' },
        { id: 'sauna', icon: <Droplets size={20} />, label: 'Sauna' },
        { id: 'coworking', icon: <Laptop size={20} />, label: 'Coworking' },
        { id: 'pet_place', icon: <PawPrint size={20} />, label: 'Pet Place' },
        { id: 'quadra', icon: <Trophy size={20} />, label: 'Quadra' },
    ].filter(a => details[a.id]);

    const brokerPhone = broker?.whatsapp_number || tenant?.branding?.whatsapp || '';
    const cleanBrokerPhone = brokerPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanBrokerPhone.startsWith('55') ? '' : '55'}${cleanBrokerPhone}?text=${encodeURIComponent(`Olá! Vi o imóvel "${property.title}" no site e gostaria de mais informações.`)}`;

    // Handle title and price visibility
    const displayTitle = config?.title === false ? 'Imóvel disponível' : property.title;
    const displayPrice = config?.price === false ? 'Valor sob consulta' : (property.price ? `R$ ${Number(property.price).toLocaleString('pt-BR')}` : 'Valor sob consulta');

    // Condomínio e IPTU
    const showCondo = config?.showCondo !== false;
    const showIptu = config?.showIptu !== false;
    const formattedCondo = details.valor_condominio
        ? `R$ ${Number(details.valor_condominio).toLocaleString('pt-BR')}`
        : null;
    const formattedIptu = details.valor_iptu
        ? `R$ ${Number(details.valor_iptu).toLocaleString('pt-BR')}`
        : null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="space-y-8">
                <div className="space-y-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {config?.showType !== false && (
                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-widest shadow-sm ${getPropertyTypeStyles(property.type || property.details?.type)}`}>
                                    {translatePropertyType(property.type || property.details?.type)}
                                </span>
                            )}
                            {details.situacao && (
                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-widest shadow-sm ${getSituacaoStyles(details.situacao)}`}>
                                    {details.situacao}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-6 md:gap-4 mb-2">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-3xl font-bold text-foreground">{displayTitle}</h1>
                                {config?.location !== 'none' && (
                                    <p className="text-base text-muted-foreground">
                                        {config?.location === 'exact' && property.details?.endereco?.rua && `${property.details.endereco.rua}, ${property.details.endereco.numero || ''} - `}
                                        {(property.details?.endereco?.bairro || details.endereco?.bairro) && `${property.details?.endereco?.bairro || details.endereco.bairro}, `}
                                        {(property.details?.endereco?.cidade || details.endereco?.cidade) && `${property.details?.endereco?.cidade || details.endereco.cidade}`}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
                                <span className="text-2xl md:text-3xl font-black text-foreground">{displayPrice}</span>
                                {(showCondo && formattedCondo) || (showIptu && formattedIptu) ? (
                                    <div className="flex flex-wrap gap-2">
                                        {showCondo && formattedCondo && (
                                            <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                                                Cond: {formattedCondo}
                                            </span>
                                        )}
                                        {showIptu && formattedIptu && (
                                            <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                                                IPTU: {formattedIptu}
                                            </span>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Main Media Container */}
                        <div 
                            onClick={() => {
                                setFullscreenIndex(selectedMediaIndex);
                                const currentMedia = allMedia[selectedMediaIndex];
                                if (currentMedia?.type === 'video' && mainVideoRef.current) {
                                    setVideoTime(prev => ({
                                        ...prev,
                                        [currentMedia.url]: mainVideoRef.current?.currentTime || 0
                                    }));
                                }
                                setIsFullscreenOpen(true);
                            }}
                            className="relative group w-full aspect-video rounded-2xl overflow-hidden bg-black/90 border border-border flex items-center justify-center cursor-zoom-in shadow-lg"
                        >
                            {allMedia[selectedMediaIndex] ? (
                                <>
                                    {allMedia[selectedMediaIndex].type === 'image' ? (
                                        <img 
                                            src={allMedia[selectedMediaIndex].url} 
                                            className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" 
                                            alt={displayTitle} 
                                        />
                                    ) : (
                                        <div className="relative w-full h-full flex items-center justify-center group/video">
                                            <video 
                                                ref={mainVideoRef}
                                                src={allMedia[selectedMediaIndex].url} 
                                                className="max-w-full max-h-full object-contain"
                                                controls
                                                onPlay={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}
                                    
                                    {allMedia[selectedMediaIndex].type === 'image' && (
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <div className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white">
                                                <Maximize2 size={24} />
                                            </div>
                                        </div>
                                    )}

                                    {allMedia.length > 1 && (
                                        <>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all z-10 border border-white/10"
                                            >
                                                <ChevronLeft size={24} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all z-10 border border-white/10"
                                            >
                                                <ChevronRight size={24} />
                                            </button>
                                        </>
                                    )}

                                    {/* Mobile Swipe Indicator */}
                                    <div className="absolute bottom-4 right-4 md:hidden px-3 py-1 rounded-full bg-black/40 text-white text-[10px] font-bold backdrop-blur-md border border-white/10">
                                        {selectedMediaIndex + 1} / {allMedia.length}
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Home size={48} strokeWidth={1} />
                                </div>
                            )}
                        </div>
                        
                        {/* Images Carousel (Thumbnails) */}
                        {imageMedia.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar snap-x">
                                {imageMedia.map((item: any, i: number) => (
                                    <button 
                                        key={i} 
                                        ref={el => { thumbnailRefs.current[i] = el; }}
                                        onClick={() => setSelectedMediaIndex(i)}
                                        className={`relative flex-shrink-0 w-24 md:w-32 aspect-video rounded-lg overflow-hidden border-2 transition-all snap-start ${
                                            selectedMediaIndex === i ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-transparent hover:border-border'
                                        }`}
                                    >
                                        <img src={item.url} className="w-full h-full object-cover" alt="" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Videos Section (Scroll to main viewer) */}
                        {videoMedia.length > 0 && (
                            <div className="space-y-4 pt-4">
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <Video className="text-primary" size={20} />
                                    Vídeos do Imóvel
                                </h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar snap-x">
                                    {videoMedia.map((video: any, i: number) => (
                                        <div 
                                            key={i}
                                            className="relative flex-shrink-0 w-24 md:w-32 aspect-video rounded-lg overflow-hidden bg-black group cursor-pointer snap-start border border-border"
                                            onClick={() => {
                                                const mediaIndex = imageMedia.length + i;
                                                setSelectedMediaIndex(mediaIndex);
                                                // Scroll main viewer into view if needed
                                                document.querySelector('.lg\\:col-span-2')?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                        >
                                            <video src={video.url} className="w-full h-full object-cover opacity-60" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="p-1.5 rounded-full bg-primary/80 text-white shadow-xl group-hover:scale-110 transition-transform">
                                                    <Play size={14} className="fill-white ml-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <FullscreenMediaViewer 
                        isOpen={isFullscreenOpen}
                        onClose={(finalIndex, time) => {
                            setIsFullscreenOpen(false);
                            setSelectedMediaIndex(finalIndex);
                            const currentMedia = allMedia[finalIndex];
                            if (typeof time === 'number' && currentMedia?.type === 'video') {
                                setVideoTime(prev => ({
                                    ...prev,
                                    [currentMedia.url]: time
                                }));
                                if (mainVideoRef.current) {
                                    mainVideoRef.current.currentTime = time;
                                }
                            }
                        }}
                        media={allMedia}
                        initialIndex={fullscreenIndex}
                        initialTime={allMedia[fullscreenIndex]?.type === 'video' ? videoTime[allMedia[fullscreenIndex].url] || 0 : 0}
                    />

                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Home className="text-primary" size={24} />
                        Dados do Imóvel
                    </h2>

                    <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {config?.showBedrooms !== false && (
                            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                                <BedDouble className="text-primary mb-2" size={24} />
                                <span className="text-lg font-bold">{details.dormitorios || details.quartos || 0}</span>
                                <span className="text-xs text-muted-foreground dark:text-white uppercase font-medium">Dormitórios</span>
                            </div>
                        )}
                        {config?.showSuites !== false && details.suites > 0 && (
                            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                                <Bath className="text-primary mb-2" size={24} />
                                <span className="text-lg font-bold">{details.suites}</span>
                                <span className="text-xs text-muted-foreground dark:text-white uppercase font-medium">Suítes</span>
                            </div>
                        )}
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                            <Bath className="text-primary mb-2" size={24} />
                            <span className="text-lg font-bold">{details.banheiros || 0}</span>
                            <span className="text-xs text-muted-foreground dark:text-white uppercase font-medium">Banheiros</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                            <Car className="text-primary mb-2" size={24} />
                            <span className="text-lg font-bold">{details.vagas || 0}</span>
                            <span className="text-xs text-muted-foreground dark:text-white uppercase font-medium">Vagas</span>
                        </div>
                        {config?.showArea !== false && (
                            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                                <Square className="text-primary mb-2" size={24} />
                                <span className="text-lg font-bold">{details.area_privativa || details.area_util || details.area_total || 0}m²</span>
                                <span className="text-xs text-muted-foreground dark:text-white uppercase font-medium">Área</span>
                            </div>
                        )}
                        {config?.showSacada !== false && details.has_sacada_com_churrasqueira && (
                            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                                <Fence className="text-primary mb-2" size={24} />
                                <span className="text-lg font-bold text-center">Sacada c/</span>
                                <span className="text-lg font-bold text-center">churrasco</span>
                            </div>
                        )}
                        {config?.showSacada !== false && !details.has_sacada_com_churrasqueira && details.has_sacada_sem_churrasqueira && (
                            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                                <Fence className="text-primary mb-2" size={24} />
                                <span className="text-lg font-bold">Sacada</span>
                            </div>
                        )}
                        {config?.showEscritorio !== false && details.has_escritorio && (
                            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                                <Briefcase className="text-primary mb-2" size={24} />
                                <span className="text-lg font-bold">Escritório</span>
                            </div>
                        )}
                        {config?.showDependencia !== false && details.has_dependencia_empregada && (
                            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                                <User className="text-primary mb-2" size={24} />
                                <span className="text-lg font-bold">Dependência</span>
                            </div>
                        )}
                        </div>
                        {config?.showObservations !== false && details.obs_dormitorios && (
                            <div className="mt-3 pt-3 border-t border-border/40 flex items-start gap-2">
                                <NotebookPen size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                                <span className="text-xs text-muted-foreground italic">{details.obs_dormitorios}</span>
                            </div>
                        )}
                    </div>

                    {amenities.length > 0 && (
                        <>
                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <Waves className="text-primary" size={24} />
                                Área Comum | Lazer
                            </h2>
                            <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
                                <div className="flex flex-wrap gap-3">
                                    {amenities.map(a => (
                                        <div key={a.id} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30">
                                            <span className="text-primary">{a.icon}</span>
                                            <span className="text-sm font-medium text-foreground">{a.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}



                    {config?.description !== 'none' && (
                        <>
                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <FileType className="text-primary" size={24} />
                                Descrição do Imóvel
                            </h2>
                            <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
                                <div className="text-base md:text-lg text-foreground leading-relaxed">
                                    {property.description ? (
                                        <SafeMarkdownRenderer content={property.description} />
                                    ) : (
                                        <p className="italic">Sem descrição disponível.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {config?.location === 'exact' && details.endereco?.latitude && details.endereco?.longitude && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <MapPin className="text-primary" size={24} />
                                Localização
                            </h2>
                            <PropertyMap 
                                lat={details.endereco.latitude} 
                                lng={details.endereco.longitude} 
                                readOnly={true}
                                zoom={16}
                            />
                        </div>
                    )}

                    {/* Documents Section */}
                    {filteredDocs.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <FileText className="text-primary" size={24} />
                                Documentos
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredDocs.map((doc: any, i: number) => (
                                    <a 
                                        key={i}
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                    >
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-foreground truncate">{doc.name}</p>
                                            <p className="text-xs text-muted-foreground uppercase font-medium">Clique para visualizar</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
