'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/shared/Modal';
import { FullscreenMediaViewer } from '@/components/shared/FullscreenMediaViewer';
import { 
    Home, MapPin, BedDouble, Bath, Square, Car, Shield, Waves, Utensils, 
    PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, 
    Video, FileText, ExternalLink, Calendar, User, Mail, Phone, Info, Send,
    ChevronLeft, ChevronRight, Maximize2, Map as MapIcon, DollarSign, Trees
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
                <div className="flex flex-col gap-6 pb-6">
                    <div className="space-y-4">
                        <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <Home size={14} className="text-foreground" />
                            Imóvel | Empreendimento
                        </h4>
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black text-foreground tracking-tight">{prop.title}</h2>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <div className="flex items-center gap-2">
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
                                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 whitespace-nowrap"
                                >
                                    <Send size={18} />
                                    Enviar para Lead
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 pt-6">
                        <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={14} className="text-foreground" />
                            Endereço
                        </h4>
                        <div className="flex items-center gap-1.5 text-foreground text-sm font-medium">
                            {fullAddress || 'Endereço não informado'}
                        </div>
                    </div>
                </div>

                <div className="border-t-2 border-border/100" />

                {/* Gallery */}
                <div className="space-y-4 pt-6">
                    <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                        <Maximize2 size={14} className="text-foreground" />
                        Imagens
                    </h4>
                    <div 
                        className="relative group w-full aspect-video rounded-3xl overflow-hidden bg-black/90 flex items-center justify-center"
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
                                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white">
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
                            <div className="w-full h-full flex items-center justify-center text-foreground">
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
                                    className={`relative flex-shrink-0 w-32 md:w-40 aspect-video rounded-2xl overflow-hidden transition-all snap-start ${
                                        selectedImageIndex === i ? 'ring-2 ring-foreground/20' : ''
                                    }`}
                                >
                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Videos Carousel (Separated) */}
                    {prop.videos?.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                <Video size={14} className="text-foreground" />
                                Vídeos
                            </h4>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                                {prop.videos.map((url: string, i: number) => (
                                    <button 
                                        key={i} 
                                        onClick={() => {
                                            const videoIndex = (prop.images?.length || 0) + i;
                                            setSelectedImageIndex(videoIndex);
                                        }}
                                        className={`relative flex-shrink-0 w-32 md:w-40 aspect-video rounded-2xl overflow-hidden transition-all snap-start group bg-black ${
                                            selectedImageIndex === (prop.images?.length || 0) + i ? 'ring-2 ring-foreground/20' : ''
                                        }`}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <div className="p-2 rounded-full bg-foreground/80 text-background shadow-lg group-hover:scale-110 transition-transform">
                                                <Play size={20} className="fill-background ml-0.5" />
                                            </div>
                                        </div>
                                        <video src={url} className="w-full h-full object-cover opacity-60" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t-2 border-border/100" />

                {/* Main Content */}
                <div className="space-y-8 pt-6">
                    {/* Key Features */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} className="text-foreground" />
                            Informações Gerais
                        </h4>
                        <div className="flex flex-col gap-0">
                            {/* Valor do Imóvel */}
                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <DollarSign size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">Valor do Imóvel</span>
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                    {formattedPrice}
                                </div>
                            </div>

                            {/* Condomínio */}
                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <DollarSign size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">Condomínio</span>
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                    {formattedCondo}
                                </div>
                            </div>

                            {/* IPTU */}
                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <DollarSign size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">IPTU</span>
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                    {formattedIptu}
                                </div>
                            </div>

                            {/* Corretor Responsável */}
                            {(prop.corretor_nome || details.corretor_nome) && (
                                <div className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-2 text-foreground">
                                        <User size={14} className="text-foreground" />
                                        <span className="text-sm font-medium">Corretor</span>
                                    </div>
                                    <div className="text-sm font-medium text-foreground">
                                        {prop.corretor_nome || details.corretor_nome}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <BedDouble size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">Dormitórios</span>
                                </div>
                                <div className="text-sm font-medium text-foreground flex items-baseline gap-2">
                                    {details.dormitorios || details.quartos || 0}
                                    {Number(details.suites) > 0 && (
                                        <span className="text-[10px] font-medium text-foreground">
                                            ({details.suites} Suítes)
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <Bath size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">Banheiros</span>
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                    {details.banheiros || 0}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <Car size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">Vagas</span>
                                </div>
                                <div className="text-sm font-medium text-foreground flex items-baseline gap-2">
                                    {details.vagas || 0}
                                    {details.vagas_numeracao && (
                                        <span className="text-[10px] font-medium text-foreground">
                                            ({details.vagas_numeracao})
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <Maximize2 size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">Área Privativa</span>
                                </div>
                                <div className="text-sm font-medium text-foreground">{details.area_privativa || 0}m²</div>
                            </div>
                            
                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <Maximize2 size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">Área Total</span>
                                </div>
                                <div className="text-sm font-medium text-foreground">{details.area_total || 0}m²</div>
                            </div>

                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <Maximize2 size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">Área do Terreno</span>
                                </div>
                                <div className="text-sm font-medium text-foreground">{details.area_terreno || 0}m²</div>
                            </div>

                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-foreground">
                                    <Maximize2 size={14} className="text-foreground" />
                                    <span className="text-sm font-medium">Área Construída</span>
                                </div>
                                <div className="text-sm font-medium text-foreground">{details.area_construida || 0}m²</div>
                            </div>

                            {details.torre_bloco && (
                                <div className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-2 text-foreground">
                                        <Home size={14} className="text-foreground" />
                                        <span className="text-sm font-medium">Torre/Bloco</span>
                                    </div>
                                    <div className="text-sm font-medium text-foreground">{details.torre_bloco}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t-2 border-border/100" />

                    {/* Description & Proprietary (Full Width) */}
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-4 pt-6">
                            <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                <Info size={14} className="text-foreground" />
                                Descrição
                            </h4>
                            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                                {prop.description || 'Nenhuma descrição informada para este imóvel.'}
                            </p>
                        </div>

                        <div className="border-t-2 border-border/100" />

                        {/* Proprietário | Construtora Section (Standardized with Description style) */}
                        <div className="space-y-4 pt-6">
                            <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                <User size={14} className="text-foreground" />
                                Proprietário | Construtora
                            </h4>
                            
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="text-foreground leading-relaxed">
                                    <span className="text-foreground font-bold text-lg">
                                        {details.proprietario?.nome || prop.owner_name || 'Não informado'}
                                    </span>
                                    {details.proprietario?.responsavel && (
                                        <span className="text-sm font-normal ml-2">
                                            (Resp: {details.proprietario.responsavel})
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {(details.proprietario?.telefone || prop.owner_phone) && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 text-sm font-medium text-foreground">
                                            <Phone size={14} className="text-foreground" />
                                            {details.proprietario?.telefone || prop.owner_phone}
                                        </div>
                                    )}
                                    {(details.proprietario?.email || prop.owner_email) && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 text-sm font-medium text-foreground">
                                            <Mail size={14} className="text-foreground" />
                                            {details.proprietario?.email || prop.owner_email}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Endereço do Proprietário / Construtora */}
                            <div className="pt-2 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-foreground">
                                    <MapPin size={14} className="text-foreground" />
                                    <span className="text-sm font-bold">Endereço do Proprietário / Construtora</span>
                                </div>
                                <div className="text-sm text-foreground bg-muted/30 p-3 rounded-xl">
                                    {(details.proprietario?.endereco_rua || details.proprietario?.endereco_bairro) ? (
                                        <div className="leading-relaxed">
                                            {details.proprietario.endereco_rua}{details.proprietario.endereco_numero ? `, ${details.proprietario.endereco_numero}` : ''}
                                            {details.proprietario.endereco_complemento ? ` - ${details.proprietario.endereco_complemento}` : ''}
                                            <br />
                                            {details.proprietario.endereco_bairro}{details.proprietario.endereco_cidade ? ` - ${details.proprietario.endereco_cidade}` : ''}
                                            {details.proprietario.endereco_estado ? `/${details.proprietario.endereco_estado}` : ''}
                                            {details.proprietario.endereco_cep ? ` - CEP: ${details.proprietario.endereco_cep}` : ''}
                                        </div>
                                    ) : (
                                        <span className="text-foreground italic text-xs">Endereço não informado</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t-2 border-border/100" />

                    {/* Map Location */}
                    {endereco.latitude && endereco.longitude && (
                        <div className="space-y-4 pt-6">
                            <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} className="text-foreground" />
                                Localização
                            </h4>
                            <div className="rounded-2xl overflow-hidden bg-muted/30 p-1 aspect-[21/9] min-h-[300px]">
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
                    <div className="space-y-4 pt-6">
                        <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <Waves size={14} className="text-foreground" />
                            Área comum | Lazer
                        </h4>
                        <div className="flex flex-col gap-0">
                            {amenities.map(a => (
                                <div key={a.id} className="flex items-center gap-3 py-2">
                                    <div className="text-foreground">{a.icon}</div>
                                    <span className="text-sm font-medium text-foreground">{a.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border-t-2 border-border/100" />

                {/* Secondary Info & Actions (Full Width Stack) */}
                <div className="flex flex-col gap-8 pt-8">
                    {/* Files */}
                    {prop.documents?.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                <FileText size={14} className="text-foreground" />
                                Documentos
                            </h4>
                            <div className="flex flex-col gap-0">
                                {prop.documents?.map((doc: any, i: number) => (
                                    <a key={i} href={doc.url} target="_blank" className="flex items-center justify-between py-1.5 hover:bg-muted/30 transition-all group">
                                        <div className="flex items-center gap-2 text-foreground">
                                            <FileText size={14} className="text-foreground" />
                                            <span className="text-sm font-bold truncate max-w-[250px] md:max-w-md">{doc.name}</span>
                                        </div>
                                        <ExternalLink size={14} className="text-foreground group-hover:text-foreground" />
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
