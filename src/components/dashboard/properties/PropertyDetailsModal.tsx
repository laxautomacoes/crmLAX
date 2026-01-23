'use client';

import { Modal } from '@/components/shared/Modal';
import { 
    Home, MapPin, BedDouble, Bath, Square, Car, Shield, Waves, Utensils, 
    PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, 
    Video, FileText, ExternalLink, Calendar, User, Mail, Phone, Info
} from 'lucide-react';

interface PropertyDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prop: any;
}

export function PropertyDetailsModal({ isOpen, onClose, prop }: PropertyDetailsModalProps) {
    if (!prop) return null;

    const details = prop.details || {};
    
    const amenities = [
        { id: 'portaria_24h', icon: <Shield size={16} />, label: 'Portaria 24h' },
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
    ].filter(a => details[a.id]);

    const formattedPrice = prop.price
        ? `R$ ${Number(prop.price).toLocaleString('pt-BR')}`
        : 'Sob consulta';

    const formattedCondo = details.valor_condominio
        ? `R$ ${Number(details.valor_condominio).toLocaleString('pt-BR')}`
        : 'Não inf.';

    const formattedIptu = details.valor_iptu
        ? `R$ ${Number(details.valor_iptu).toLocaleString('pt-BR')}`
        : 'Não inf.';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Imóvel" size="xl">
            <div className="space-y-8 max-h-[85vh] overflow-y-auto pr-4 custom-scrollbar">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-foreground">{prop.title}</h2>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin size={16} />
                            <span>
                                {details.endereco?.rua && `${details.endereco.rua}, `}
                                {details.endereco?.numero && `${details.endereco.numero} - `}
                                {details.endereco?.bairro || 'Bairro ñ inf.'}, 
                                {details.endereco?.cidade || 'Cidade ñ inf.'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-2xl font-black text-secondary">{formattedPrice}</div>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-bold rounded-full uppercase">
                                {prop.status}
                            </span>
                            <span className="px-3 py-1 bg-muted text-muted-foreground text-[10px] font-bold rounded-full uppercase">
                                {prop.type}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Gallery */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 aspect-video rounded-2xl overflow-hidden bg-muted border border-border">
                        {prop.images?.[0] ? (
                            <img src={prop.images[0]} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Home size={48} strokeWidth={1} />
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                        {prop.images?.slice(1, 3).map((img: string, i: number) => (
                            <div key={i} className="aspect-video rounded-xl overflow-hidden border border-border bg-muted">
                                <img src={img} className="w-full h-full object-cover" alt="" />
                            </div>
                        ))}
                        {prop.images?.length > 3 && (
                            <div className="aspect-video rounded-xl overflow-hidden border border-border bg-muted relative group">
                                <img src={prop.images[3]} className="w-full h-full object-cover opacity-50" alt="" />
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-foreground">
                                    +{prop.images.length - 3} fotos
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Info & Description */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Key Features */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                                <div className="text-secondary flex items-center gap-2">
                                    <BedDouble size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Quartos</span>
                                </div>
                                <div className="text-lg font-bold text-foreground">{details.quartos || 0}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                                <div className="text-secondary flex items-center gap-2">
                                    <Bath size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Banheiros</span>
                                </div>
                                <div className="text-lg font-bold text-foreground">{details.banheiros || 0}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                                <div className="text-secondary flex items-center gap-2">
                                    <Car size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Vagas</span>
                                </div>
                                <div className="text-lg font-bold text-foreground">{details.vagas || 0}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                                <div className="text-secondary flex items-center gap-2">
                                    <Square size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Área Útil</span>
                                </div>
                                <div className="text-lg font-bold text-foreground">{details.area_util || 0}m²</div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Info size={20} className="text-secondary" />
                                Descrição
                            </h3>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {prop.description || 'Nenhuma descrição informada para este imóvel.'}
                            </p>
                        </div>

                        {/* Amenities */}
                        {amenities.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Waves size={20} className="text-secondary" />
                                    Lazer e Diferenciais
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {amenities.map(a => (
                                        <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                                            <div className="text-secondary">{a.icon}</div>
                                            <span className="text-xs font-medium text-foreground">{a.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Proprietary & Values */}
                    <div className="space-y-6">
                        {/* Proprietary Card */}
                        <div className="p-6 rounded-3xl bg-secondary/5 border border-secondary/10 space-y-4">
                            <h3 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                                <User size={16} />
                                Proprietário
                            </h3>
                            <div className="space-y-3">
                                <div className="font-bold text-foreground text-lg">{prop.owner_name || 'Não informado'}</div>
                                <div className="space-y-2">
                                    {prop.owner_phone && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone size={14} />
                                            {prop.owner_phone}
                                        </div>
                                    )}
                                    {prop.owner_email && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail size={14} />
                                            {prop.owner_email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Financial Details */}
                        <div className="p-6 rounded-3xl border border-border space-y-4">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Valores Mensais</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Condomínio</span>
                                    <span className="font-bold text-foreground">{formattedCondo}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">IPTU</span>
                                    <span className="font-bold text-foreground">{formattedIptu}</span>
                                </div>
                            </div>
                        </div>

                        {/* Media Links */}
                        {(prop.videos?.length > 0 || prop.documents?.length > 0) && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Arquivos</h3>
                                <div className="space-y-2">
                                    {prop.videos?.map((url: string, i: number) => (
                                        <a key={i} href={url} target="_blank" className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors group">
                                            <div className="flex items-center gap-2">
                                                <Video size={16} className="text-secondary" />
                                                <span className="text-xs font-medium">Vídeo {i + 1}</span>
                                            </div>
                                            <ExternalLink size={14} className="text-muted-foreground group-hover:text-secondary" />
                                        </a>
                                    ))}
                                    {prop.documents?.map((doc: any, i: number) => (
                                        <a key={i} href={doc.url} target="_blank" className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors group">
                                            <div className="flex items-center gap-2">
                                                <FileText size={16} className="text-secondary" />
                                                <span className="text-xs font-medium truncate max-w-[150px]">{doc.name}</span>
                                            </div>
                                            <ExternalLink size={14} className="text-muted-foreground group-hover:text-secondary" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
