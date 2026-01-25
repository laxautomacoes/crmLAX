'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/shared/Modal';
import { FullscreenMediaViewer } from '@/components/shared/FullscreenMediaViewer';
import { 
    Home, MapPin, BedDouble, Bath, Square, Car, Shield, Waves, Utensils, 
    PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, 
    Video, FileText, ExternalLink, Calendar, User, Mail, Phone, Info, Send,
    ChevronLeft, ChevronRight, Maximize2
} from 'lucide-react';
import { translatePropertyType } from '@/utils/property-translations';

interface PropertyDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prop: any;
    onSend?: (prop: any) => void;
}

export function PropertyDetailsModal({ isOpen, onClose, prop, onSend }: PropertyDetailsModalProps) {
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
        if (!prop.images) return;
        setSelectedImageIndex((prev) => (prev + 1) % prop.images.length);
    };

    const handlePrev = () => {
        if (!prop.images) return;
        setSelectedImageIndex((prev) => (prev - 1 + prop.images.length) % prop.images.length);
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
        { id: 'sala_estudos_coworking', icon: <BookOpen size={16} />, label: 'Coworking' },
        { id: 'sala_cinema', icon: <Film size={16} />, label: 'Cinema' },
        { id: 'playground', icon: <Play size={16} />, label: 'Playground' },
        { id: 'brinquedoteca', icon: <Baby size={16} />, label: 'Brinquedoteca' },
        { id: 'home_market', icon: <Home size={16} />, label: 'Home Market' },
    ].filter(a => details[a.id]);

    const formattedPrice = prop.price
        ? `R$ ${Number(prop.price).toLocaleString('pt-BR')}`
        : 'Sob consulta';

    const formattedCondo = details.valor_condominio
        ? `R$ ${Number(details.valor_condominio).toLocaleString('pt-BR')}`
        : <span className="text-secondary font-bold">—</span>;

    const formattedIptu = details.valor_iptu
        ? `R$ ${Number(details.valor_iptu).toLocaleString('pt-BR')}`
        : <span className="text-secondary font-bold">—</span>;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Imóvel" size="xl">
            <div className="space-y-8 max-h-[85vh] overflow-y-auto pr-4 custom-scrollbar">
                {/* Header Info */}
                <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-foreground">{prop.title}</h2>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin size={16} />
                            <span className="text-sm">
                                {details.endereco?.rua && `${details.endereco.rua}, `}
                                {details.endereco?.numero && `${details.endereco.numero} - `}
                                {details.endereco?.bairro || 'Bairro ñ inf.'}, 
                                {details.endereco?.cidade || 'Cidade ñ inf.'}
                                {details.endereco?.estado && ` - ${details.endereco.estado}`}
                            </span>
                        </div>
                    </div>
                    {onSend && (
                        <button
                            onClick={() => onSend(prop)}
                            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:opacity-90 transition-all shadow-sm shadow-secondary/20 whitespace-nowrap"
                        >
                            <Send size={18} />
                            Enviar para Lead
                        </button>
                    )}
                </div>

                {/* Gallery */}
                <div className="space-y-4">
                    <div 
                        onClick={() => setIsFullscreenOpen(true)}
                        className="relative group w-full aspect-video rounded-3xl overflow-hidden bg-black/90 border border-border flex items-center justify-center cursor-zoom-in"
                    >
                        {prop.images?.[selectedImageIndex] ? (
                            <>
                                <img src={prop.images[selectedImageIndex]} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" alt="" />
                                
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white">
                                        <Maximize2 size={24} />
                                    </div>
                                </div>

                                {prop.images.length > 1 && (
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
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Home size={48} strokeWidth={1} />
                            </div>
                        )}
                    </div>
                    
                    {prop.images?.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                            {prop.images.map((img: string, i: number) => (
                                <button 
                                    key={i} 
                                    ref={el => { thumbnailRefs.current[i] = el; }}
                                    onClick={() => setSelectedImageIndex(i)}
                                    className={`relative flex-shrink-0 w-24 md:w-32 aspect-video rounded-2xl overflow-hidden border-2 transition-all snap-start ${
                                        selectedImageIndex === i ? 'border-secondary ring-2 ring-secondary/20' : 'border-transparent hover:border-border'
                                    }`}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Bar (Price and Status) */}
                <div className="flex flex-wrap items-center justify-between gap-6 p-6 rounded-3xl bg-muted/30 border border-border">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valor do Imóvel</div>
                        <div className="text-3xl font-black text-secondary">{formattedPrice}</div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex flex-wrap gap-2 justify-end">
                            <span className={`px-3 py-1.5 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm ${prop.approval_status === 'approved' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                                prop.approval_status === 'rejected' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                                    'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                }`}>
                                {prop.approval_status === 'approved' ? 'Aprovado' :
                                    prop.approval_status === 'rejected' ? 'Rejeitado' :
                                        'Pendente'}
                            </span>
                            <span className="px-3 py-1.5 bg-secondary/10 text-secondary text-[10px] font-bold rounded-full border border-secondary/20 uppercase tracking-wider shadow-sm">
                                {prop.status}
                            </span>
                            {details.situacao && (
                                <span className="px-3 py-1.5 bg-secondary/10 text-secondary text-[10px] font-bold rounded-full border border-secondary/20 uppercase tracking-wider shadow-sm">
                                    {details.situacao}
                                </span>
                            )}
                            <span className="px-3 py-1.5 bg-muted text-muted-foreground text-[10px] font-bold rounded-full border border-border uppercase tracking-wider shadow-sm">
                                {translatePropertyType(prop.type)}
                            </span>
                        </div>
                        {prop.profiles?.full_name && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                <User size={12} className="text-secondary" />
                                Cadastrado por: <span className="font-bold text-foreground">{prop.profiles.full_name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-8">
                    {/* Key Features (Full Width) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                            <div className="text-secondary flex items-center gap-2">
                                <BedDouble size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Quartos</span>
                            </div>
                            <div className="text-lg font-bold text-foreground">
                                {details.quartos || 0}
                                {details.suites > 0 && (
                                    <span className="text-xs font-medium text-muted-foreground ml-1">
                                        ({details.suites} suítes)
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                            <div className="text-secondary flex items-center gap-2">
                                <Bath size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Banheiros</span>
                            </div>
                            <div className="text-lg font-bold text-foreground">{details.banheiros || 0}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                            <div className="text-secondary flex items-center gap-2">
                                <Car size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Vagas</span>
                            </div>
                            <div className="text-lg font-bold text-foreground">
                                {details.vagas || 0}
                                {details.vagas_numeracao && (
                                    <span className="text-xs font-medium text-muted-foreground ml-1">
                                        ({details.vagas_numeracao})
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                            <div className="text-secondary flex items-center gap-2">
                                <Square size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Área Privativa (m²)</span>
                            </div>
                            <div className="text-lg font-bold text-foreground">{details.area_privativa || 0}m²</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                            <div className="text-secondary flex items-center gap-2">
                                <Square size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Área Total (m²)</span>
                            </div>
                            <div className="text-lg font-bold text-foreground">{details.area_total || 0}m²</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                            <div className="text-secondary flex items-center gap-2">
                                <Square size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Área Terreno (m²)</span>
                            </div>
                            <div className="text-lg font-bold text-foreground">{details.area_terreno || 0}m²</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                            <div className="text-secondary flex items-center gap-2">
                                <Square size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Área Construção (m²)</span>
                            </div>
                            <div className="text-lg font-bold text-foreground">{details.area_construida || 0}m²</div>
                        </div>
                    </div>

                    {/* Description & Proprietary (Full Width) */}
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Info size={20} className="text-secondary" />
                                Descrição
                            </h3>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {prop.description || 'Nenhuma descrição informada para este imóvel.'}
                            </p>
                        </div>

                        {/* Proprietário | Construtora Card below Description */}
                        <div className="p-6 rounded-3xl bg-secondary/5 border border-secondary/10 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <div className="text-secondary flex items-center gap-2">
                                        <User size={18} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Proprietário | Construtora</span>
                                    </div>
                                    <div className="text-2xl font-bold text-foreground">
                                        {details.proprietario?.nome || prop.owner_name || 'Não informado'}
                                    </div>
                                </div>

                                {(details.proprietario?.telefone || prop.owner_phone || details.proprietario?.email || prop.owner_email) && (
                                    <div className="flex flex-wrap gap-4">
                                        {(details.proprietario?.telefone || prop.owner_phone) && (
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground">
                                                <Phone size={14} className="text-secondary" />
                                                {details.proprietario?.telefone || prop.owner_phone}
                                            </div>
                                        )}
                                        {(details.proprietario?.email || prop.owner_email) && (
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground">
                                                <Mail size={14} className="text-secondary" />
                                                {details.proprietario?.email || prop.owner_email}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {(details.proprietario?.endereco_rua || details.proprietario?.endereco_bairro) && (
                                <div className="pt-4 border-t border-secondary/10 flex items-start gap-2 text-sm text-muted-foreground">
                                    <MapPin size={16} className="mt-0.5 text-secondary flex-shrink-0" />
                                    <span>
                                        {details.proprietario.endereco_rua}{details.proprietario.endereco_numero ? `, ${details.proprietario.endereco_numero}` : ''} - {details.proprietario.endereco_bairro}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Amenities (Full Width) */}
                    {amenities.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Waves size={20} className="text-secondary" />
                                Lazer e Diferenciais
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {amenities.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                                        <div className="text-secondary">{a.icon}</div>
                                        <span className="text-xs font-medium text-foreground">{a.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Secondary Info & Actions (Full Width Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-border">
                        {/* Monthly Values (Left Column) */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Valores Mensais</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                                            <div className="text-secondary font-bold text-xs">C</div>
                                        </div>
                                        <span className="text-sm font-medium text-foreground">Condomínio</span>
                                    </div>
                                    <span className="font-bold text-foreground">{formattedCondo}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                                            <div className="text-secondary font-bold text-xs">I</div>
                                        </div>
                                        <span className="text-sm font-medium text-foreground">IPTU</span>
                                    </div>
                                    <span className="font-bold text-foreground">{formattedIptu}</span>
                                </div>
                            </div>
                        </div>

                        {/* Files (Right Column) */}
                        {(prop.videos?.length > 0 || prop.documents?.length > 0) && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Arquivos</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {prop.videos?.map((url: string, i: number) => (
                                        <button 
                                            key={i} 
                                            onClick={() => {
                                                const videoIndex = (prop.images?.length || 0) + i;
                                                setSelectedImageIndex(videoIndex);
                                                setIsFullscreenOpen(true);
                                            }}
                                            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-muted transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Video size={20} className="text-secondary" />
                                                <span className="text-sm font-medium text-foreground">Vídeo {i + 1}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Maximize2 size={16} className="text-muted-foreground group-hover:text-secondary" />
                                                <ExternalLink size={16} className="text-muted-foreground group-hover:text-secondary" />
                                            </div>
                                        </button>
                                    ))}
                                    {prop.documents?.map((doc: any, i: number) => (
                                        <a key={i} href={doc.url} target="_blank" className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-muted transition-all group">
                                            <div className="flex items-center gap-3">
                                                <FileText size={20} className="text-secondary" />
                                                <span className="text-sm font-medium text-foreground truncate max-w-[200px] md:max-w-xs">{doc.name}</span>
                                            </div>
                                            <ExternalLink size={16} className="text-muted-foreground group-hover:text-secondary" />
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
