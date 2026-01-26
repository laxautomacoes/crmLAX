'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/shared/Modal';
import { FullscreenMediaViewer } from '@/components/shared/FullscreenMediaViewer';
import { 
    Home, MapPin, BedDouble, Bath, Square, Car, Shield, Waves, Utensils, 
    PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, 
    Video, FileText, ExternalLink, Calendar, User, Mail, Phone, Info, Send,
    ChevronLeft, ChevronRight, Maximize2, Map as MapIcon, DollarSign
} from 'lucide-react';
import { translatePropertyType, getPropertyTypeStyles, getStatusStyles, getSituacaoStyles } from '@/utils/property-translations';
import { PropertyMap } from '@/components/shared/PropertyMap';

interface PropertyDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prop: any;
    onSend?: (prop: any) => void;
    userRole?: string;
}

export function PropertyDetailsModal({ isOpen, onClose, prop, onSend, userRole }: PropertyDetailsModalProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin';
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
            setSelectedImageIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (thumbnailRefs.current[selectedImageIndex]) {
            thumbnailRefs.current[selectedImageIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [selectedImageIndex]);

    if (!prop) return null;

    const handleNext = () => {
        if (allMedia.length === 0) return;
        setSelectedImageIndex((prev) => (prev + 1) % allMedia.length);
    };

    const handlePrev = () => {
        if (allMedia.length === 0) return;
        setSelectedImageIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    };

    const allMedia = [
        ...(prop.images || []).map((url: string) => ({ type: 'image' as const, url })),
        ...(prop.videos || []).map((url: string) => ({ type: 'video' as const, url }))
    ];

    const details = prop.details || {};
    
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

    const formattedPrice = prop.price
        ? `R$ ${Number(prop.price).toLocaleString('pt-BR')}`
        : 'Sob consulta';

    const formattedCondo = details.valor_condominio ? `R$ ${Number(details.valor_condominio).toLocaleString('pt-BR')}` : 'Sob consulta';
    const formattedIptu = details.valor_iptu ? `R$ ${Number(details.valor_iptu).toLocaleString('pt-BR')}` : 'Sob consulta';

    const endereco = details.endereco || {};
    const fullAddress = [
        endereco.rua,
        endereco.numero,
        endereco.complemento,
        endereco.bairro,
        endereco.cidade,
        endereco.estado,
        endereco.cep
    ].filter(Boolean).join(', ');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Imóvel" size="xl">
            <div className="space-y-8 max-h-[85vh] overflow-y-auto pr-4 custom-scrollbar">
                {/* Header Info */}
                <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-foreground tracking-tight">{prop.title}</h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
                                    <MapPin size={14} className="text-primary" />
                                    {fullAddress || 'Endereço não informado'}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-border" />
                                    {details.situacao && (
                                        <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-widest shadow-sm ${getSituacaoStyles(details.situacao)}`}>
                                            {details.situacao}
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-widest shadow-sm ${getPropertyTypeStyles(prop.type)}`}>
                                        {translatePropertyType(prop.type)}
                                    </span>
                                    {(isAdmin || prop.status === 'Pendente') && (
                                        <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-widest shadow-sm ${getStatusStyles(prop.status)}`}>
                                            {prop.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    {onSend && (
                        <button
                            onClick={() => onSend(prop)}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-sm shadow-green-600/20 whitespace-nowrap"
                        >
                            <Send size={18} />
                            Enviar para Lead
                        </button>
                    )}
                </div>

                {/* Gallery */}
                <div className="space-y-4">
                    <div 
                        className="relative group w-full aspect-video rounded-3xl overflow-hidden bg-black/90 border border-border flex items-center justify-center"
                    >
                        {allMedia[selectedImageIndex]?.type === 'image' ? (
                            <div 
                                onClick={() => setIsFullscreenOpen(true)}
                                className="w-full h-full flex items-center justify-center cursor-zoom-in"
                            >
                                <img 
                                    src={allMedia[selectedImageIndex].url} 
                                    className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" 
                                    alt="" 
                                />
                                
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white">
                                        <Maximize2 size={24} />
                                    </div>
                                </div>
                            </div>
                        ) : allMedia[selectedImageIndex]?.type === 'video' ? (
                            <video 
                                src={allMedia[selectedImageIndex].url} 
                                controls 
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Home size={48} strokeWidth={1} />
                            </div>
                        )}

                        {allMedia.length > 1 && (
                            <>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-black/40 transition-all z-10"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-black/40 transition-all z-10"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </>
                        )}
                    </div>
                    
                    {/* Images Carousel */}
                    {prop.images?.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                            {prop.images.map((url: string, i: number) => (
                                <button 
                                    key={i} 
                                    ref={el => { thumbnailRefs.current[i] = el; }}
                                    onClick={() => setSelectedImageIndex(i)}
                                    className={`relative flex-shrink-0 w-32 md:w-40 aspect-video rounded-2xl overflow-hidden border-2 transition-all snap-start ${
                                        selectedImageIndex === i ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'
                                    }`}
                                >
                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Videos Carousel (Separated) */}
                    {prop.videos?.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 px-1">
                                <Video size={12} className="text-primary" />
                                Vídeos do Imóvel
                            </h4>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                                {prop.videos.map((url: string, i: number) => (
                                    <button 
                                        key={i} 
                                        onClick={() => {
                                            const videoIndex = (prop.images?.length || 0) + i;
                                            setSelectedImageIndex(videoIndex);
                                        }}
                                        className={`relative flex-shrink-0 w-32 md:w-40 aspect-video rounded-2xl overflow-hidden border-2 transition-all snap-start group bg-black ${
                                            selectedImageIndex === (prop.images?.length || 0) + i ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary'
                                        }`}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <div className="p-2 rounded-full bg-primary/80 text-white shadow-lg group-hover:scale-110 transition-transform">
                                                <Play size={20} className="fill-white ml-0.5" />
                                            </div>
                                        </div>
                                        <video src={url} className="w-full h-full object-cover opacity-60" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="space-y-8">
                    {/* Key Features */}
                    <div className="space-y-4">
                        <div className="flex flex-col gap-0">
                            {/* Valor do Imóvel */}
                            <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <DollarSign size={14} className="text-primary/60" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Valor do Imóvel</span>
                                </div>
                                <div className="text-sm font-bold text-foreground">
                                    {formattedPrice}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <BedDouble size={14} className="text-primary/60" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Dormitórios</span>
                                </div>
                                <div className="text-sm font-bold text-foreground flex items-baseline gap-2">
                                    {details.dormitorios || details.quartos || 0}
                                    {Number(details.suites) > 0 && (
                                        <span className="text-[10px] font-medium text-muted-foreground">
                                            ({details.suites} Suítes)
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Bath size={14} className="text-primary/60" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Banheiros</span>
                                </div>
                                <div className="text-sm font-bold text-foreground">
                                    {details.banheiros || 0}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Car size={14} className="text-primary/60" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Vagas</span>
                                </div>
                                <div className="text-sm font-bold text-foreground flex items-baseline gap-2">
                                    {details.vagas || 0}
                                    {details.vagas_numeracao && (
                                        <span className="text-[10px] font-medium text-muted-foreground">
                                            ({details.vagas_numeracao})
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Square size={14} className="text-primary/60" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Área Privativa</span>
                                </div>
                                <div className="text-sm font-bold text-foreground">{details.area_privativa || 0}m²</div>
                            </div>
                            
                            <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Square size={14} className="text-primary/60" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Área Total</span>
                                </div>
                                <div className="text-sm font-bold text-foreground">{details.area_total || 0}m²</div>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Square size={14} className="text-primary/60" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Área do Terreno</span>
                                </div>
                                <div className="text-sm font-bold text-foreground">{details.area_terreno || 0}m²</div>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Square size={14} className="text-primary/60" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Área Construída</span>
                                </div>
                                <div className="text-sm font-bold text-foreground">{details.area_construida || 0}m²</div>
                            </div>
                        </div>

                        {details.torre_bloco && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-3 bg-muted/30 rounded-lg w-fit">
                                <span className="font-bold uppercase tracking-widest text-[9px]">Torre/Bloco:</span>
                                <span className="text-foreground font-semibold">{details.torre_bloco}</span>
                            </div>
                        )}
                    </div>

                    {/* Description & Proprietary (Full Width) */}
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Info size={20} className="text-primary" />
                                Descrição
                            </h3>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {prop.description || 'Nenhuma descrição informada para este imóvel.'}
                            </p>
                        </div>

                        {/* Proprietário | Construtora Section (Standardized with Description style) */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <User size={20} className="text-primary" />
                                Proprietário | Construtora
                            </h3>
                            
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="text-muted-foreground leading-relaxed">
                                    <span className="text-foreground font-bold text-lg">
                                        {details.proprietario?.nome || prop.owner_name || 'Não informado'}
                                    </span>
                                    {details.proprietario?.responsavel && (
                                        <span className="text-sm font-normal ml-2">
                                            (Resp: {details.proprietario.responsavel})
                                        </span>
                                    )}
                                </div>

                                {(details.proprietario?.telefone || prop.owner_phone || details.proprietario?.email || prop.owner_email) && (
                                    <div className="flex flex-wrap gap-3">
                                        {(details.proprietario?.telefone || prop.owner_phone) && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-sm font-medium text-foreground">
                                                <Phone size={14} className="text-primary" />
                                                {details.proprietario?.telefone || prop.owner_phone}
                                            </div>
                                        )}
                                        {(details.proprietario?.email || prop.owner_email) && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-sm font-medium text-foreground">
                                                <Mail size={14} className="text-primary" />
                                                {details.proprietario?.email || prop.owner_email}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {(details.proprietario?.endereco_rua || details.proprietario?.endereco_bairro) && (
                                <div className="pt-1 flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                                    <MapPin size={16} className="mt-0.5 text-primary flex-shrink-0" />
                                    <span>
                                        {details.proprietario.endereco_rua}{details.proprietario.endereco_numero ? `, ${details.proprietario.endereco_numero}` : ''} - {details.proprietario.endereco_bairro}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Map Location */}
                    {endereco.latitude && endereco.longitude && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <MapPin size={20} className="text-primary" />
                                Localização
                            </h3>
                            <div className="rounded-2xl overflow-hidden border border-border bg-muted/30 p-1 aspect-[21/9] min-h-[300px]">
                                <PropertyMap 
                                    lat={endereco.latitude} 
                                    lng={endereco.longitude} 
                                    readOnly={true}
                                    zoom={16}
                                />
                            </div>
                        </div>
                    )}

                    {/* Amenities (Full Width) */}
                    {amenities.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Waves size={20} className="text-primary" />
                                Lazer e Diferenciais
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {amenities.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                                        <div className="text-primary">{a.icon}</div>
                                        <span className="text-xs font-medium text-foreground">{a.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Secondary Info & Actions (Full Width Stack) */}
                    <div className="flex flex-col gap-8 pt-8 border-t border-muted-foreground/30">
                        {/* Monthly Values */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Valores Mensais</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center justify-between p-4 rounded-2xl border border-muted-foreground/30 bg-card">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <div className="text-primary font-bold text-xs">C</div>
                                        </div>
                                        <span className="text-sm font-medium text-foreground">Condomínio</span>
                                    </div>
                                    <span className="font-bold text-foreground">{formattedCondo}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl border border-muted-foreground/30 bg-card">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <div className="text-primary font-bold text-xs">I</div>
                                        </div>
                                        <span className="text-sm font-medium text-foreground">IPTU</span>
                                    </div>
                                    <span className="font-bold text-foreground">{formattedIptu}</span>
                                </div>
                            </div>
                        </div>

                        {/* Files */}
                        {prop.documents?.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Arquivos</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {prop.documents?.map((doc: any, i: number) => (
                                        <a key={i} href={doc.url} target="_blank" className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-muted transition-all group">
                                            <div className="flex items-center gap-3">
                                                <FileText size={20} className="text-primary" />
                                                <span className="text-sm font-medium text-foreground truncate max-w-[200px] md:max-w-xs">{doc.name}</span>
                                            </div>
                                            <ExternalLink size={16} className="text-muted-foreground group-hover:text-primary" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <FullscreenMediaViewer 
                isOpen={isFullscreenOpen}
                onClose={() => setIsFullscreenOpen(false)}
                media={allMedia}
                initialIndex={selectedImageIndex}
            />
        </Modal>
    );
}
