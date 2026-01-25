'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/shared/Modal';
import { 
    Home, MapPin, BedDouble, Bath, Square, Car, Shield, Waves, Utensils, 
    PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, 
    Video, FileText, ExternalLink, Calendar, User, Mail, Phone, Info, Send
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

    useEffect(() => {
        if (isOpen) {
            setSelectedImageIndex(0);
        }
    }, [isOpen]);

    if (!prop) return null;

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
        : 'Não inf.';

    const formattedIptu = details.valor_iptu
        ? `R$ ${Number(details.valor_iptu).toLocaleString('pt-BR')}`
        : 'Não inf.';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Imóvel" size="xl">
            <div className="space-y-8 max-h-[85vh] overflow-y-auto pr-4 custom-scrollbar">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold text-foreground">{prop.title}</h2>
                            {onSend && (
                                <button
                                    onClick={() => onSend(prop)}
                                    className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:opacity-90 transition-all shadow-sm shadow-secondary/20"
                                >
                                    <Send size={18} />
                                    Enviar para Lead
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin size={16} />
                            <span>
                                {details.endereco?.rua && `${details.endereco.rua}, `}
                                {details.endereco?.numero && `${details.endereco.numero} - `}
                                {details.endereco?.bairro || 'Bairro ñ inf.'}, 
                                {details.endereco?.cidade || 'Cidade ñ inf.'}
                                {details.endereco?.estado && ` - ${details.endereco.estado}`}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-2xl font-black text-secondary">{formattedPrice}</div>
                        <div className="flex gap-2">
                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase ${prop.approval_status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                prop.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {prop.approval_status === 'approved' ? 'Aprovado' :
                                    prop.approval_status === 'rejected' ? 'Rejeitado' :
                                        'Pendente'}
                            </span>
                            <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-bold rounded-full uppercase">
                                {prop.status}
                            </span>
                            {details.situacao && (
                                <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-bold rounded-full uppercase">
                                    {details.situacao}
                                </span>
                            )}
                            <span className="px-3 py-1 bg-muted text-muted-foreground text-[10px] font-bold rounded-full uppercase">
                                {translatePropertyType(prop.type)}
                            </span>
                        </div>
                        {prop.profiles?.full_name && (
                            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                                <User size={10} />
                                Cadastrado por: <span className="font-semibold">{prop.profiles.full_name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Gallery */}
                <div className="space-y-4">
                    <div className="w-full aspect-video rounded-3xl overflow-hidden bg-muted border border-border">
                        {prop.images?.[selectedImageIndex] ? (
                            <img src={prop.images[selectedImageIndex]} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Home size={48} strokeWidth={1} />
                            </div>
                        )}
                    </div>
                    
                    {prop.images?.length > 1 && (
                        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x">
                            {prop.images.map((img: string, i: number) => (
                                <button 
                                    key={i} 
                                    onClick={() => setSelectedImageIndex(i)}
                                    className={`relative flex-shrink-0 w-32 md:w-48 aspect-video rounded-2xl overflow-hidden border-2 transition-all snap-start ${
                                        selectedImageIndex === i ? 'border-secondary ring-2 ring-secondary/20' : 'border-transparent hover:border-border'
                                    }`}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                </button>
                            ))}
                        </div>
                    )}
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
                                    <Square size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Área Útil</span>
                                </div>
                                <div className="text-lg font-bold text-foreground">{details.area_util || details.area_privativa || 0}m²</div>
                            </div>
                        </div>

                        {/* Additional Areas & Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {details.area_total && (
                                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                                    <div className="text-xs font-bold text-muted-foreground uppercase">Área Total</div>
                                    <div className="text-sm font-bold text-foreground">{details.area_total}m²</div>
                                </div>
                            )}
                            {details.area_terreno && (
                                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                                    <div className="text-xs font-bold text-muted-foreground uppercase">Área Terreno</div>
                                    <div className="text-sm font-bold text-foreground">{details.area_terreno}m²</div>
                                </div>
                            )}
                            {details.area_construida && (
                                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                                    <div className="text-xs font-bold text-muted-foreground uppercase">Área Const.</div>
                                    <div className="text-sm font-bold text-foreground">{details.area_construida}m²</div>
                                </div>
                            )}
                            {details.torre_bloco && (
                                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                                    <div className="text-xs font-bold text-muted-foreground uppercase">Torre/Bloco</div>
                                    <div className="text-sm font-bold text-foreground">{details.torre_bloco}</div>
                                </div>
                            )}
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
                                <div className="font-bold text-foreground text-lg">{details.proprietario?.nome || prop.owner_name || 'Não informado'}</div>
                                <div className="space-y-2">
                                    {(details.proprietario?.telefone || prop.owner_phone) && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone size={14} />
                                            {details.proprietario?.telefone || prop.owner_phone}
                                        </div>
                                    )}
                                    {(details.proprietario?.email || prop.owner_email) && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail size={14} />
                                            {details.proprietario?.email || prop.owner_email}
                                        </div>
                                    )}
                                    {details.proprietario?.cpf && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <FileText size={14} />
                                            CPF: {details.proprietario.cpf}
                                        </div>
                                    )}
                                    {details.proprietario?.estado_civil && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User size={14} />
                                            {details.proprietario.estado_civil}
                                        </div>
                                    )}
                                    {details.proprietario?.data_nascimento && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar size={14} />
                                            Nasc: {new Date(details.proprietario.data_nascimento).toLocaleDateString('pt-BR')}
                                        </div>
                                    )}
                                    {(details.proprietario?.endereco_rua || details.proprietario?.endereco_bairro) && (
                                        <div className="pt-2 mt-2 border-t border-secondary/10 space-y-1">
                                            <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">Endereço do Proprietário</div>
                                            <div className="text-xs text-muted-foreground flex items-start gap-2">
                                                <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                                                <span>
                                                    {details.proprietario.endereco_rua}
                                                    {details.proprietario.endereco_numero && `, ${details.proprietario.endereco_numero}`}
                                                    {details.proprietario.endereco_complemento && ` - ${details.proprietario.endereco_complemento}`}
                                                    <br />
                                                    {details.proprietario.endereco_bairro && `${details.proprietario.endereco_bairro}, `}
                                                    {details.proprietario.endereco_cidade && `${details.proprietario.endereco_cidade}`}
                                                    {details.proprietario.endereco_estado && `/${details.proprietario.endereco_estado}`}
                                                    {details.proprietario.endereco_cep && ` - CEP: ${details.proprietario.endereco_cep}`}
                                                </span>
                                            </div>
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
