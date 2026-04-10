'use client';

import { useState, useEffect } from 'react';
import {
    Instagram,
    Youtube,
    Facebook,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    LogOut,
    TrendingUp,
    Users,
    Zap,
    Image as ImageIcon,
    Sparkles
} from 'lucide-react';
import { getMarketingIntegrations } from '@/app/_actions/marketing';
import { getAssets } from '@/app/_actions/assets';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { InstagramPostModal } from './InstagramPostModal';
import { PageHeader } from '../shared/PageHeader';

const MetaIcon = (props: any) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M16.92 6.5C15.54 6.5 14.39 7.08 13.57 7.97L13.11 8.48L12.59 7.89C11.66 6.84 10.36 6.5 9.08 6.5C7.26 6.5 5.51 7.42 4.41 9.02C3.15 10.87 3 13.21 3.97 15.11C4.78 16.69 6.2 17.5 7.73 17.5C9.11 17.5 10.26 16.92 11.08 16.03L11.54 15.52L12.06 16.11C12.99 17.16 14.29 17.5 15.57 17.5C17.39 17.5 19.14 16.58 20.24 14.98C21.5 13.13 21.65 10.79 20.68 8.89C19.87 7.31 18.45 6.5 16.92 6.5ZM16.32 15.2C15.6 15.2 14.91 14.99 14.41 14.53L13.23 13.19C12.87 12.78 12.24 12.78 11.88 13.19L10.7 14.53C10.2 15.09 9.49 15.4 8.73 15.4C8.01 15.4 7.32 15.19 6.82 14.73C6.32 14.27 6.02 13.64 5.92 12.96C5.82 12.28 5.92 11.6 6.22 10.99C6.72 10.08 7.63 9.4 8.64 9.4C9.36 9.4 10.05 9.61 10.55 10.07L11.73 11.41C11.91 11.62 12.15 11.72 12.41 11.72C12.67 11.72 12.91 11.61 13.09 11.39L14.22 10.11C14.72 9.55 15.43 9.24 16.19 9.24C16.91 9.24 17.6 9.45 18.1 9.91C18.6 10.37 18.9 11 19 11.68C19.1 12.36 19 13.04 18.7 13.65C18.2 14.56 17.29 15.2 16.28 15.2H16.32Z" />
    </svg>
);

interface MarketingDashboardProps {
    tenantId: string;
    profileId: string;
    hasProPlan: boolean;
}

export default function MarketingDashboard({ tenantId, profileId, hasProPlan }: MarketingDashboardProps) {
    const searchParams = useSearchParams();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingProps, setIsLoadingProps] = useState(false);
    const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [selectedProp, setSelectedProp] = useState<any>(null);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                fetchIntegrations(),
                fetchProperties()
            ]);
        };
        init();

        // Verificar parâmetros de URL para feedback
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success === 'instagram_connected') {
            toast.success('Instagram conectado com sucesso!');
        } else if (error) {
            toast.error(`Erro na conexão: ${error}`);
        }
    }, [searchParams]);

    const fetchIntegrations = async () => {
        setIsLoading(true);
        try {
            const { integrations } = await getMarketingIntegrations(tenantId);
            setActiveIntegrations(integrations || []);
        } catch (error) {
            console.error('Fetch Integrations Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProperties = async () => {
        setIsLoadingProps(true);
        try {
            const result = await getAssets(tenantId);
            if (result.success) {
                // Pegar apenas os 4 mais recentes
                setProperties(result.data?.slice(0, 4) || []);
            }
        } catch (error) {
            console.error('Fetch Properties Error:', error);
        } finally {
            setIsLoadingProps(false);
        }
    };

    const isConnected = (provider: string) => {
        return activeIntegrations.some(i => i.provider === provider && i.status === 'active');
    };

    const handleConnect = (id: string) => {
        if (!hasProPlan) {
            toast.error('O Módulo de Marketing exige o plano PRO.');
            return;
        }

        if (id === 'meta') {
            setIsConnecting(true);
            window.location.href = `/api/auth/instagram?tenant_id=${tenantId}`;
        }
    };

    const handleQuickPost = (prop: any) => {
        if (!isConnected('instagram')) {
            toast.error('Conecte seu Instagram Business primeiro.');
            return;
        }
        setSelectedProp(prop);
        setIsPostModalOpen(true);
    };

    const integrations = [
        {
            id: 'meta',
            name: 'Facebook + Instagram',
            icon: MetaIcon,
            connected: isConnected('instagram'),
            description: 'Sincronização de anúncios, postagem automática e IA para Facebook e Instagram.',
            color: 'from-[#0668E1] via-[#833AB4] to-[#FD1D1D]',
            metrics: isConnected('instagram') ? [
                { label: 'Seguidores', value: '1.2k', icon: Users },
                { label: 'Alcance', value: '+15%', icon: TrendingUp }
            ] : null
        },
        {
            id: 'youtube',
            name: 'YouTube Shorts',
            icon: Youtube,
            connected: false,
            description: 'Transforme vídeos de imóveis em Shorts automaticamente.',
            color: 'from-red-600 to-red-400',
            upcoming: true
        }
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader 
                title="Marketing"
                subtitle="Automatize suas redes sociais e conecte-se com mais clientes."
            >
                {!hasProPlan && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-[#404F4F] to-[#2d3939] px-4 py-2 rounded-xl border-l-4 border-[#FFE600] shadow-lg">
                        <Sparkles className="h-4 w-4 text-[#FFE600]" />
                        <span className="text-white text-xs font-bold uppercase tracking-wider">Upgrade Disponível</span>
                    </div>
                )}
            </PageHeader>

            {isLoading ? (
                <div className="flex items-center justify-center h-64 bg-card rounded-3xl border border-border/50 shadow-sm">
                    <RefreshCw className="h-10 w-10 text-[#FFE600] animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {integrations.map((item) => (
                        <div
                            key={item.id}
                            className={`group relative overflow-hidden bg-white rounded-3xl border border-border/50 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${item.upcoming ? 'opacity-75' : ''}`}
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className={`p-3 rounded-2xl bg-[#404F4F]/5 text-[#404F4F] transition-transform group-hover:scale-110 duration-300`}>
                                        <item.icon className="h-7 w-7" />
                                    </div>
                                    {item.connected ? (
                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 shadow-sm">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                            Ativo
                                        </span>
                                    ) : item.upcoming ? (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#404F4F]/40 bg-[#404F4F]/5 px-3 py-1.5 rounded-full">
                                            Em breve
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                            <AlertCircle className="h-4 w-4" />
                                            Desativado
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h3 className="font-black text-[#404F4F] text-xl tracking-tight">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-2">
                                        {item.description}
                                    </p>
                                </div>

                                {item.metrics && (
                                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                                        {item.metrics.map((m, idx) => (
                                            <div key={idx} className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#404F4F]/60">
                                                    <m.icon className="h-3 w-3" />
                                                    {m.label}
                                                </div>
                                                <div className="text-lg font-black text-[#404F4F]">{m.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    {!item.connected && !item.upcoming ? (
                                        <button
                                            onClick={() => handleConnect(item.id)}
                                            disabled={isConnecting}
                                            className="w-full h-12 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-[#FFE600] text-[#404F4F] font-black text-xs uppercase tracking-widest transition-all hover:bg-[#F2DB00] hover:shadow-lg hover:shadow-[#FFE600]/30 active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {isConnecting ? (
                                                <RefreshCw className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    Conectar
                                                </>
                                            )}
                                        </button>
                                    ) : item.connected ? (
                                        <button
                                            className="w-full h-12 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl border-2 border-border text-[#404F4F]/60 font-black text-xs uppercase tracking-widest transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100 group/btn"
                                        >
                                            <LogOut className="h-4 w-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                            Desconectar
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full h-12 py-3 px-6 rounded-2xl bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-widest border border-gray-100 cursor-not-allowed"
                                        >
                                            Disponível em breve
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Seção de Postagem Rápida */}
            <div className="space-y-6">
                <div className="flex items-center">
                    <h2 className="text-xl font-black text-[#404F4F]">
                        Imóveis cadastrados
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoadingProps ? (
                        [1, 2, 3, 4].map(n => (
                            <div key={n} className="h-[200px] rounded-2xl bg-[#404F4F]/5 animate-pulse" />
                        ))
                    ) : properties.length > 0 ? (
                        properties.map((prop) => (
                            <div
                                key={prop.id}
                                className="group relative aspect-[4/5] overflow-hidden bg-white rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-lg"
                            >
                                {prop.images?.[0] ? (
                                    <img src={prop.images[0]} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt={prop.title} />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                        <ImageIcon className="h-10 w-10" />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                                    <h4 className="text-white font-bold text-sm line-clamp-1">{prop.title}</h4>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-white/80 text-[10px] font-medium">{prop.type}</span>
                                        <button
                                            onClick={() => handleQuickPost(prop)}
                                            className="bg-[#FFE600] text-[#404F4F] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                        >
                                            <Instagram className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-border/50 shadow-sm border-solid">
                            <p className="text-muted-foreground text-sm font-medium">Nenhum imóvel disponível para postagem rápida.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Modal de Postagem */}
            {selectedProp && (
                <InstagramPostModal
                    isOpen={isPostModalOpen}
                    onClose={() => {
                        setIsPostModalOpen(false);
                        setSelectedProp(null);
                    }}
                    prop={selectedProp}
                    tenantId={tenantId}
                    profileId={profileId}
                />
            )}
        </div>
    );
}
