'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Home, MapPin, BedDouble, Bath, Square, Car, Shield, Waves, Utensils, 
    PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, 
    Video, FileText, ExternalLink, Calendar, User, Mail, Phone, Info, Send,
    ChevronLeft, ChevronRight, Maximize2, Map as MapIcon, DollarSign, Trees,
    Instagram, Building2, Layers, Star, Image as ImageIcon
} from 'lucide-react';
import { translatePropertyType, getPropertyTypeStyles, getStatusStyles, getSituacaoStyles, translateStatus } from '@/utils/property-translations';
import { PropertyMap } from '@/components/shared/PropertyMap';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InstagramPostModal } from '@/components/marketing/InstagramPostModal';
import PlanGate from '@/components/ui/PlanGate';
import PropertyCopyCard from '@/components/ai/PropertyCopyCard';
import { FullscreenMediaViewer } from '@/components/shared/FullscreenMediaViewer';
import { SafeMarkdownRenderer } from '@/components/shared/SafeMarkdownRenderer';
import { getTenantCustomAmenities } from '@/app/_actions/tenant';
import type { CustomAmenity } from '@/app/_actions/tenant';

interface PropertyDetailsContentProps {
    prop: any;
    onSend?: (prop: any) => void;
    userRole?: string;
    hasAIAccess: boolean;
    hasMarketingAccess: boolean;
    tenantId: string;
    isModal?: boolean;
}

export function PropertyDetailsContent({ 
    prop, 
    onSend, 
    userRole, 
    hasAIAccess, 
    hasMarketingAccess, 
    tenantId,
    isModal = false
}: PropertyDetailsContentProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin';
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

    const [activeTab, setActiveTab] = useState<'details' | 'ai_copy'>('details');
    const [isInstagramModalOpen, setIsInstagramModalOpen] = useState(false);
    const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [customAmenities, setCustomAmenities] = useState<CustomAmenity[]>([]);

    // Carregar áreas customizadas do tenant
    useEffect(() => {
        async function loadCustomAmenities() {
            if (!tenantId) return;
            const res = await getTenantCustomAmenities(tenantId);
            if (res.success) {
                setCustomAmenities(res.data || []);
            }
        }
        loadCustomAmenities();
    }, [tenantId]);



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

    // Áreas customizadas ativas neste imóvel
    const activeCustomAmenities = customAmenities
        .filter(a => (a.status === 'approved' || isAdmin) && details[a.id])
        .map(a => ({
            id: a.id,
            icon: <Star size={16} />,
            label: a.label,
            isPending: a.status === 'pending'
        }));

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
        <div className={cn("w-full", !isModal && "bg-background min-h-screen p-4 md:p-8")}>
            <div className={cn("max-w-7xl mx-auto", !isModal && "space-y-8")}>


                {activeTab === 'details' ? (
                    <>
                        {onSend && (
                            <button
                                onClick={() => onSend(prop)}
                                className="md:hidden fixed bottom-8 right-8 z-[60] flex items-center justify-center w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-300"
                                title="Enviar para Lead"
                            >
                                <Send size={24} />
                            </button>
                        )}

                        <div className="space-y-8">
                            {/* Header Info */}
                            <div>
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="space-y-3">
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
                                                    {(isAdmin || prop.status === 'Pending') && (
                                                        <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-widest shadow-sm ${getStatusStyles(prop.status)}`}>
                                                            {translateStatus(prop.status)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                                <Home size={14} className="text-foreground" />
                                                {details.is_empreendimento ? 'Empreendimento' : 'Imóvel'}
                                            </h4>
                                            <h2 className="text-3xl font-black text-foreground tracking-tight">{prop.title}</h2>
                                        </div>
                                        {onSend && (
                                            <div className="flex flex-wrap items-center gap-3">
                                                {isAdmin && (
                                                    <PlanGate hasAccess={hasMarketingAccess} feature="Módulo de Marketing (Instagram)">
                                                        <button
                                                            onClick={() => setIsInstagramModalOpen(true)}
                                                            className="flex items-center gap-2 px-5 py-2 bg-[#404F4F] text-white rounded-xl font-bold hover:bg-[#2d3939] transition-all shadow-sm border border-border/10 whitespace-nowrap"
                                                        >
                                                            <Instagram size={18} className="text-[#FFE600]" />
                                                            Instagram
                                                        </button>
                                                    </PlanGate>
                                                )}
                                                <button
                                                    onClick={() => onSend(prop)}
                                                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 whitespace-nowrap"
                                                >
                                                    <Send size={18} />
                                                    Enviar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-border/60 my-8" />

                                <div className="space-y-4">
                                    <h4 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                                        <MapPin size={14} className="text-foreground" />
                                        Endereço
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                                        {fullAddress || 'Endereço não informado'}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border/60 my-8" />

                            {/* Gallery */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                    <ImageIcon size={14} className="text-foreground" />
                                    Imagens
                                </h4>
                                <div className="relative group w-full aspect-video rounded-xl overflow-hidden bg-black/90 flex items-center justify-center shadow-xl">
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
                                
                                {prop.images?.length > 1 && (
                                    <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                                        {prop.images.map((url: string, i: number) => (
                                            <button 
                                                key={i} 
                                                ref={el => { thumbnailRefs.current[i] = el; }}
                                                onClick={() => setSelectedImageIndex(i)}
                                                className={cn(
                                                    "relative flex-shrink-0 w-32 md:w-40 aspect-video rounded-xl overflow-hidden transition-all snap-start",
                                                    selectedImageIndex === i ? 'ring-2 ring-accent-icon scale-[0.98] shadow-lg' : 'opacity-70 hover:opacity-100'
                                                )}
                                            >
                                                <img src={url} className="w-full h-full object-cover" alt="" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {prop.videos?.length > 0 && (
                                    <>
                                        <div className="border-t border-border/60 my-8" />
                                        <div className="space-y-4">
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
                                                        className={cn(
                                                            "relative flex-shrink-0 w-32 md:w-40 aspect-video rounded-xl overflow-hidden transition-all snap-start group bg-black",
                                                            selectedImageIndex === (prop.images?.length || 0) + i ? 'ring-2 ring-accent-icon scale-[0.98]' : 'opacity-70 hover:opacity-100'
                                                        )}
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
                                    </>
                                )}
                            </div>

                            <div className="border-t border-border/60 my-8" />

                            {/* Main Content */}
                            <div className="flex flex-col">
                                <div>
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Info size={14} className="text-foreground" />
                                            Informações
                                        </h4>
                                         <div className="text-foreground bg-muted/20 p-6 rounded-xl border border-border/50 flex flex-col gap-0 divide-y divide-border/30">
                                            {!details.is_empreendimento && (
                                                <InfoRow icon={<DollarSign size={14} />} label="Valor do Imóvel" value={formattedPrice} />
                                            )}
                                            {!details.is_empreendimento && (
                                                <>
                                                    <InfoRow icon={<BedDouble size={14} />} label="Dormitórios" value={`${details.dormitorios || details.quartos || 0} ${Number(details.suites) > 0 ? `(${details.suites} Suítes)` : ''}`} />
                                                    {details.obs_dormitorios && (
                                                        <InfoRow icon={<BedDouble size={14} />} label="Observações" value={details.obs_dormitorios} />
                                                    )}
                                                    {details.has_sacada_com_churrasqueira && (
                                                        <InfoRow icon={<Home size={14} />} label="Sacada com churrasqueira" value="Sim" />
                                                    )}
                                                    {details.has_sacada_sem_churrasqueira && (
                                                        <InfoRow icon={<Home size={14} />} label="Sacada sem churrasqueira" value="Sim" />
                                                    )}
                                                    {details.has_lavabo && (
                                                        <InfoRow icon={<Bath size={14} />} label="Lavabo" value="Sim" />
                                                    )}
                                                    {details.has_escritorio && (
                                                        <InfoRow icon={<BookOpen size={14} />} label="Escritório" value="Sim" />
                                                    )}
                                                    {details.has_dependencia_empregada && (
                                                        <InfoRow icon={<User size={14} />} label="Dependência Empregada" value="Sim" />
                                                    )}
                                                    <InfoRow icon={<Bath size={14} />} label="Banheiros" value={details.banheiros || 0} />
                                                    <InfoRow icon={<Car size={14} />} label="Vagas" value={`${details.vagas || 0} ${details.vagas_numeracao ? `(${details.vagas_numeracao})` : ''}`} />
                                                    <InfoRow icon={<Maximize2 size={14} />} label="Área Privativa" value={`${details.area_privativa || 0}m²`} />
                                                    <InfoRow icon={<Maximize2 size={14} />} label="Área Total" value={`${details.area_total || 0}m²`} />
                                                    {details.torre_bloco && (
                                                        <InfoRow icon={<Home size={14} />} label="Número de Torre | Bloco" value={details.torre_bloco} />
                                                    )}
                                                    {details.nome_torre_bloco && (
                                                        <InfoRow icon={<Home size={14} />} label="Nome Torre | Bloco" value={details.nome_torre_bloco} />
                                                    )}
                                                    {details.has_elevadores && (
                                                        <InfoRow icon={<Layers size={14} />} label="Elevadores" value={details.numero_elevadores ? `Sim (${details.numero_elevadores} elevadores)` : 'Sim'} />
                                                    )}
                                                </>
                                            )}
                                            <InfoRow icon={<DollarSign size={14} />} label="Condomínio" value={formattedCondo} />
                                            <InfoRow icon={<DollarSign size={14} />} label="IPTU" value={formattedIptu} />
                                            {details.is_empreendimento && details.empreendimento?.construtora && (
                                                <InfoRow icon={<Building2 size={14} />} label="Construtora" value={details.empreendimento.construtora} />
                                            )}
                                            {details.is_empreendimento && details.empreendimento?.previsao_entrega && (
                                                <InfoRow icon={<Calendar size={14} />} label="Previsão Entrega" value={details.empreendimento.previsao_entrega} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Torres e Tipologias (Empreendimento) */}
                                    {details.is_empreendimento && details.empreendimento?.torres?.length > 0 && (
                                        <>
                                            <div className="border-t border-border/60 my-8" />
                                            <div className="space-y-4">
                                                <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                                    <Building2 size={14} className="text-foreground" />
                                                    Torres e Tipologias
                                                </h4>
                                                <div className="space-y-4">
                                                    {details.empreendimento.torres.map((torre: any, torreIdx: number) => (
                                                        <div key={torreIdx} className="rounded-lg border border-border/50 overflow-hidden">
                                                            <div className="flex items-center gap-2 px-4 py-3 bg-foreground/5 border-b border-border/30">
                                                                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-secondary-foreground font-black text-xs">
                                                                    {torreIdx + 1}
                                                                </div>
                                                                <span className="text-sm font-black text-foreground">{torre.nome}</span>
                                                            </div>
                                                            <div className="p-4 space-y-3">
                                                                {torre.tipologias?.map((tip: any, tipIdx: number) => (
                                                                    <div key={tipIdx} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Layers size={12} className="text-muted-foreground" />
                                                                            <span className="text-xs font-bold text-foreground uppercase">
                                                                                {translatePropertyType(tip.tipo)}
                                                                            </span>
                                                                        </div>
                                                                        {tip.dormitorios && (
                                                                            <div className="flex items-center gap-1 text-xs text-foreground">
                                                                                <BedDouble size={12} className="text-muted-foreground" />
                                                                                <span className="font-bold">{tip.dormitorios}</span>
                                                                                <span className="text-muted-foreground">dorm</span>
                                                                                {Number(tip.suites) > 0 && (
                                                                                    <span className="text-muted-foreground">({tip.suites} suítes)</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {tip.area_privativa && (
                                                                            <div className="flex items-center gap-1 text-xs text-foreground">
                                                                                <Maximize2 size={12} className="text-muted-foreground" />
                                                                                <span className="font-bold">{tip.area_privativa}m²</span>
                                                                            </div>
                                                                        )}
                                                                        {tip.vagas && (
                                                                            <div className="flex items-center gap-1 text-xs text-foreground">
                                                                                <Car size={12} className="text-muted-foreground" />
                                                                                <span className="font-bold">{tip.vagas}</span>
                                                                                <span className="text-muted-foreground">vagas</span>
                                                                            </div>
                                                                        )}
                                                                        {tip.preco_a_partir && (
                                                                            <div className="flex items-center gap-1 text-xs text-foreground">
                                                                                <DollarSign size={12} className="text-muted-foreground" />
                                                                                <span className="font-bold">R$ {Number(tip.preco_a_partir).toLocaleString('pt-BR')}</span>
                                                                            </div>
                                                                        )}
                                                                        {tip.unidades_por_andar && (
                                                                            <span className="text-[10px] text-muted-foreground">
                                                                                {tip.unidades_por_andar} un/andar
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Amenities */}
                                    {(amenities.length > 0 || activeCustomAmenities.length > 0) && (
                                        <>
                                            <div className="border-t border-border/60 my-8" />
                                            <div className="space-y-4">
                                                <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                                    <Trees size={14} className="text-foreground" />
                                                    Área comum | Lazer
                                                </h4>
                                                <div className="flex flex-wrap gap-3">
                                                    {amenities.map(a => (
                                                        <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20 w-fit pr-6">
                                                            <div className="text-secondary">{a.icon}</div>
                                                            <span className="text-base font-semibold text-foreground whitespace-nowrap">{a.label}</span>
                                                        </div>
                                                    ))}
                                                    {activeCustomAmenities.map(a => (
                                                        <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border w-fit pr-6 ${a.isPending ? 'bg-amber-500/5 border-amber-500/30' : 'bg-secondary/10 border-secondary/20'}`}>
                                                            <div className="text-secondary">{a.icon}</div>
                                                            <span className="text-base font-semibold text-foreground whitespace-nowrap">{a.label}</span>
                                                            {a.isPending && isAdmin && (
                                                                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-md whitespace-nowrap">Pendente</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="border-t border-border/60 my-8" />

                                <div>
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Info size={14} className="text-foreground" />
                                            Descrição
                                        </h4>
                                        <div className="text-foreground leading-relaxed bg-muted/20 p-6 rounded-xl border border-border/50">
                                            {prop.description ? (
                                                <SafeMarkdownRenderer content={prop.description} className="text-base [&>p]:text-base [&>p]:leading-relaxed" />
                                            ) : (
                                                <p className="italic text-muted-foreground text-base">Nenhuma descrição informada para este imóvel.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location Map */}
                                    {endereco.latitude && endereco.longitude && (
                                        <>
                                            <div className="border-t border-border/60 my-8" />
                                            <div className="space-y-4">
                                                <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                                    <MapPin size={14} className="text-foreground" />
                                                    Localização
                                                </h4>
                                                <div className="rounded-xl overflow-hidden bg-muted/30 border-2 border-border shadow-inner p-1">
                                                    <PropertyMap 
                                                        lat={endereco.latitude} 
                                                        lng={endereco.longitude} 
                                                        readOnly={true}
                                                        zoom={16}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Corretor / Responsável */}
                                    {prop.created_by_profile && (
                                        <>
                                            <div className="border-t border-border/60 my-8" />
                                            <div className="space-y-4">
                                                <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                                    <User size={14} className="text-foreground" />
                                                    Corretor Responsável
                                                </h4>
                                                <div className="flex items-center gap-4 p-4 rounded-xl bg-foreground/5 border border-border/40">
                                                    {prop.created_by_profile.avatar_url ? (
                                                        <img 
                                                            src={prop.created_by_profile.avatar_url} 
                                                            alt={prop.created_by_profile.full_name} 
                                                            className="w-12 h-12 rounded-full object-cover border-2 border-secondary/30 flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-black text-lg flex-shrink-0">
                                                            {(prop.created_by_profile.full_name || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <span className="text-base font-bold text-foreground truncate">
                                                            {prop.created_by_profile.full_name || 'Não informado'}
                                                        </span>
                                                        {prop.created_by_profile.whatsapp_number && (
                                                            <a 
                                                                href={`https://wa.me/${prop.created_by_profile.whatsapp_number.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                                            >
                                                                <Phone size={14} />
                                                                {prop.created_by_profile.whatsapp_number}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="border-t border-border/60 my-8" />

                                    {/* Propriedade/Construtora */}
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                            <User size={14} className="text-foreground" />
                                            Proprietário | Construtora
                                        </h4>
                                        <div className="bg-foreground/5 border border-border/40 p-6 rounded-xl space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xl font-black text-foreground">{details.proprietario?.nome || prop.owner_name || 'Não informado'}</h3>
                                                    {details.proprietario?.responsavel && (
                                                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">Resp: {details.proprietario.responsavel}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="flex items-center gap-3 text-sm text-foreground">
                                                    <div className="p-2 bg-foreground/10 text-muted-foreground rounded-lg"><Phone size={14} /></div>
                                                    {details.proprietario?.telefone || prop.owner_phone || 'Não informado'}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-foreground">
                                                    <div className="p-2 bg-foreground/10 text-muted-foreground rounded-lg"><Mail size={14} /></div>
                                                    {details.proprietario?.email || prop.owner_email || 'Não informado'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            {prop.documents?.length > 0 && (
                                <>
                                    <div className="border-t border-border/60 my-8" />
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                            <FileText size={14} className="text-foreground" />
                                            Documentos
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {prop.documents?.map((doc: any, i: number) => (
                                                <a key={i} href={doc.url} target="_blank" className="flex items-center justify-between p-4 rounded-xl bg-white border border-border hover:shadow-md transition-all group">
                                                    <div className="flex items-center gap-3 text-foreground">
                                                        <FileText size={20} className="text-emerald-600" />
                                                        <span className="text-sm font-bold truncate max-w-[200px]">{doc.name}</span>
                                                    </div>
                                                    <ExternalLink size={14} className="text-muted-foreground group-hover:text-emerald-600" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="mb-4">
                            <button 
                                onClick={() => setActiveTab('details')}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronLeft size={16} />
                                Voltar para o Imóvel
                            </button>
                        </div>
                        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                            <PropertyCopyCard 
                                propertyId={prop.id} 
                                tenantId={tenantId}
                                profileId={prop.profile_id || ''}
                                hasAIAccess={hasAIAccess}
                            />
                        </div>
                    </div>
                )}
            </div>

            <FullscreenMediaViewer 
                isOpen={isFullscreenOpen}
                onClose={() => setIsFullscreenOpen(false)}
                media={allMedia}
                initialIndex={selectedImageIndex}
            />

            <InstagramPostModal 
                isOpen={isInstagramModalOpen}
                onClose={() => setIsInstagramModalOpen(false)}
                prop={prop}
                tenantId={tenantId}
                profileId={prop.profile_id || ''}
            />
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
                <span className="text-muted-foreground">{icon}</span>
                <span className="text-base">{label}</span>
            </div>
            <div className="text-base font-bold text-foreground">
                {value}
            </div>
        </div>
    );
}
