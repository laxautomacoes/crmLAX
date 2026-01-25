'use client';

import { Home, BedDouble, Bath, Square, Car, Waves, Utensils, PartyPopper, Dumbbell, MessageCircle } from 'lucide-react';
import { translatePropertyType } from '@/utils/property-translations';

interface PropertyPublicViewProps {
    asset: any;
    broker: any;
    tenant: any;
}

export function PropertyPublicView({ asset, broker, tenant }: PropertyPublicViewProps) {
    if (!asset) return null;
    
    const details = asset.details || {};
    const amenities = [
        { id: 'piscina', icon: <Waves size={16} />, label: 'Piscina' },
        { id: 'academia', icon: <Dumbbell size={16} />, label: 'Academia' },
        { id: 'espaco_gourmet', icon: <Utensils size={16} />, label: 'Espaço Gourmet' },
        { id: 'salao_festas', icon: <PartyPopper size={16} />, label: 'Salão de Festas' },
    ].filter(a => details[a.id]);

    const brokerPhone = broker?.whatsapp_number || tenant?.branding?.whatsapp || '';
    const cleanBrokerPhone = brokerPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanBrokerPhone}?text=${encodeURIComponent(`Olá! Vi o imóvel "${asset.title}" no site e gostaria de mais informações.`)}`;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-secondary/10 text-secondary text-[10px] font-bold rounded uppercase tracking-wider">
                                {translatePropertyType(asset.type || asset.details?.type)}
                            </span>
                            <span className="px-2 py-1 bg-muted text-muted-foreground text-[10px] font-bold rounded uppercase tracking-wider">
                                {asset.status}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">{asset.title}</h1>
                        <p className="text-lg text-muted-foreground">
                            {details.endereco?.bairro && `${details.endereco.bairro}, `}
                            {details.endereco?.cidade && `${details.endereco.cidade}`}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="aspect-video rounded-2xl overflow-hidden bg-muted shadow-sm">
                            <img src={asset.images?.[0]} className="w-full h-full object-cover" alt={asset.title} />
                        </div>
                        {asset.images?.length > 1 && (
                            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                                {asset.images.slice(1).map((img: string, i: number) => (
                                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-card rounded-2xl border border-border shadow-sm">
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30">
                            <BedDouble className="text-secondary mb-2" size={24} />
                            <span className="text-lg font-bold">{details.quartos || 0}</span>
                            <span className="text-xs text-muted-foreground uppercase font-medium">Quartos</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30">
                            <Bath className="text-secondary mb-2" size={24} />
                            <span className="text-lg font-bold">{details.banheiros || 0}</span>
                            <span className="text-xs text-muted-foreground uppercase font-medium">Banheiros</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30">
                            <Car className="text-secondary mb-2" size={24} />
                            <span className="text-lg font-bold">{details.vagas || 0}</span>
                            <span className="text-xs text-muted-foreground uppercase font-medium">Vagas</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30">
                            <Square className="text-secondary mb-2" size={24} />
                            <span className="text-lg font-bold">{details.area_util || details.area_total || 0}m²</span>
                            <span className="text-xs text-muted-foreground uppercase font-medium">Área</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-foreground">Descrição</h2>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {asset.description || 'Sem descrição disponível.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 bg-card rounded-2xl border border-border shadow-sm sticky top-24">
                        <div className="mb-6">
                            <span className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Valor do Imóvel</span>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl font-black text-foreground">
                                    {asset.price ? `R$ ${Number(asset.price).toLocaleString('pt-BR')}` : 'Sob consulta'}
                                </span>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-secondary/20 shadow-sm">
                                    {broker?.avatar_url ? (
                                        <img src={broker.avatar_url} className="w-full h-full object-cover" alt={broker.full_name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-secondary/10 text-secondary">
                                            <Home size={32} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Corretor Responsável</p>
                                    <p className="text-lg font-bold text-foreground">{broker?.full_name || tenant?.name}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md">
                                    <MessageCircle size={22} />
                                    Falar no WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
