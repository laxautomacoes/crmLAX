'use client';

import { useState, useEffect } from 'react';
import {
    Instagram,
    Youtube,
    RefreshCw,
    LogOut,
    AlertCircle,
    Image as ImageIcon,
    Sparkles,
    CheckCircle2,
    Megaphone
} from 'lucide-react';
import { getMarketingIntegrations } from '@/app/_actions/marketing';
import { getProperties } from '@/app/_actions/properties';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { InstagramPostModal } from './InstagramPostModal';
import { YouTubeShortsModal } from './YouTubeShortsModal';
import { PageHeader } from '../shared/PageHeader';
import { MarketingStudio } from './MarketingStudio';
import { MarketingSuperadmin } from './MarketingSuperadmin';

const MetaIcon = (props: any) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M16.92 6.5C15.54 6.5 14.39 7.08 13.57 7.97L13.11 8.48L12.59 7.89C11.66 6.84 10.36 6.5 9.08 6.5C7.26 6.5 5.51 7.42 4.41 9.02C3.15 10.87 3 13.21 3.97 15.11C4.78 16.69 6.2 17.5 7.73 17.5C9.11 17.5 10.26 16.92 11.08 16.03L11.54 15.52L12.06 16.11C12.99 17.16 14.29 17.5 15.57 17.5C17.39 17.5 19.14 16.58 20.24 14.98C21.5 13.13 21.65 10.79 20.68 8.89C19.87 7.31 18.45 6.5 16.92 6.5ZM16.32 15.2C15.6 15.2 14.91 14.99 14.41 14.53L13.23 13.19C12.87 12.78 12.24 12.78 11.88 13.19L10.7 14.53C10.2 15.09 9.49 15.4 8.73 15.4C8.01 15.4 7.32 15.19 6.82 14.73C6.32 14.27 6.02 13.64 5.92 12.96C5.82 12.28 5.92 11.6 6.22 10.99C6.72 10.08 7.63 9.4 8.64 9.4C9.36 9.4 10.05 9.61 10.55 10.07L11.73 11.41C11.91 11.62 12.15 11.72 12.41 11.72C12.67 11.72 12.91 11.61 13.09 11.39L14.22 10.11C14.72 9.55 15.43 9.24 16.19 9.24C16.91 9.24 17.6 9.45 18.1 9.91C18.6 10.37 18.9 11 19 11.68C19.1 12.36 19 13.04 18.7 13.65C18.2 14.56 17.29 15.2 16.28 15.2H16.32Z" />
    </svg>
);

const GoogleAdsIcon = (props: any) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M15.5 3.5L4.5 20.5H11.5L22.5 3.5H15.5Z" fill="#FBBC05"/>
        <path d="M7 11.5L1.5 20.5H8.5L14 11.5H7Z" fill="#4285F4"/>
        <path d="M11.5 20.5C13.433 20.5 15 18.933 15 17C15 15.067 13.433 13.5 11.5 13.5C9.567 13.5 8 15.067 8 17C8 18.933 9.567 20.5 11.5 20.5Z" fill="#34A853"/>
    </svg>
);

interface MarketingDashboardProps {
    tenantId: string;
    profileId: string;
    hasProPlan: boolean;
    userRole: string;
}

export default function MarketingDashboard({ tenantId, profileId, hasProPlan, userRole }: MarketingDashboardProps) {
    const searchParams = useSearchParams();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingProps, setIsLoadingProps] = useState(false);
    const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [selectedProp, setSelectedProp] = useState<any>(null);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    const isSuperadmin = userRole === 'superadmin';

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                fetchIntegrations(),
                fetchProperties()
            ]);
        };
        init();

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
            const result = await getProperties(tenantId);
            if (result.success) {
                setProperties(result.data?.slice(0, 4) || []);
            }
        } catch (error) {
            console.error('Fetch Properties Error:', error);
        } finally {
            setIsLoadingProps(false);
        }
    };

    const handleConnect = (id: string) => {
        if (!hasProPlan) {
            toast.error('O Módulo de Marketing exige o plano PRO.');
            return;
        }

        if (id === 'meta') {
            setIsConnecting(true);
            window.location.href = `/api/auth/instagram?tenant_id=${tenantId}`;
        } else if (id === 'youtube') {
            setIsConnecting(true);
            window.location.href = `/api/auth/youtube?tenant_id=${tenantId}`;
        }
    };

    const handleQuickPost = (prop: any) => {
        if (!activeIntegrations.some(i => i.provider === 'instagram' && i.status === 'active')) {
            toast.error('Conecte seu Instagram Business primeiro.');
            return;
        }
        setSelectedProp(prop);
        setIsPostModalOpen(true);
    };

    const handleYouTubeShorts = (prop: any) => {
        if (!activeIntegrations.some(i => i.provider === 'youtube' && i.status === 'active')) {
            toast.error('Conecte seu Canal do YouTube primeiro.');
            return;
        }
        setSelectedProp(prop);
        setIsYouTubeModalOpen(true);
    };

    const getIntegrationData = (provider: string) => {
        return activeIntegrations.find(i => i.provider === provider && i.status === 'active');
    };

    const integrations = [
        {
            id: 'meta',
            name: 'Facebook + Instagram',
            icon: MetaIcon,
            connected: !!getIntegrationData('instagram'),
            connectedAccount: getIntegrationData('instagram')?.credentials?.page_name,
            description: 'Sincronização de anúncios e posts automáticos.',
            isTestMode: true
        },
        {
            id: 'google-ads',
            name: 'Google Ads',
            icon: GoogleAdsIcon,
            connected: false,
            description: 'Gestão de campanhas diretamente pelo CRM.',
            upcoming: true
        },
        {
            id: 'youtube',
            name: 'YouTube Shorts',
            icon: Youtube,
            connected: !!getIntegrationData('youtube'),
            connectedAccount: getIntegrationData('youtube')?.credentials?.account_name,
            description: 'Transforme vídeos em Shorts automaticamente.',
            upcoming: false
        }
    ];

    return (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader 
                title="Marketing"
                subtitle={isSuperadmin ? "Central de Criativos e Gestão de Presença Digital." : "Inteligência para criar, postar e crescer suas redes sociais."}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowGuide(!showGuide)}
                        className="flex items-center gap-2 px-4 py-3 md:py-2 rounded-xl bg-white border border-border/50 text-[#404F4F] text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <AlertCircle className="h-4 w-4 text-accent-icon" />
                        Ajuda
                    </button>
                    {!hasProPlan && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-[#404F4F] to-[#2d3939] px-4 py-2 rounded-xl border-l-4 border-[#FFE600] shadow-lg">
                            <Sparkles className="h-4 w-4 text-[#FFE600]" />
                            <span className="text-white text-xs font-bold uppercase tracking-wider">Upgrade Pro</span>
                        </div>
                    )}
                </div>
            </PageHeader>

            {isSuperadmin ? (
                <MarketingSuperadmin tenantId={tenantId} profileId={profileId} />
            ) : (
                <>
                    {/* SEÇÃO 1: LINKS RÁPIDOS (Visão Geral) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <a 
                            href="/marketing/studio"
                            className="group bg-gradient-to-br from-[#404F4F] to-[#2d3939] p-8 rounded-[2rem] border border-white/10 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-white/10">
                                    <Sparkles className="h-6 w-6 text-[#FFE600]" />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-[#FFE600] text-[#404F4F] text-[10px] font-black uppercase tracking-widest">
                                    Novo
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">Estúdio de Criação</h3>
                            <p className="text-white/60 text-sm leading-relaxed">
                                Use nossa inteligência artificial para criar copies, posts e conteúdos estratégicos em segundos.
                            </p>
                        </a>

                        <a 
                            href="/marketing/bulk-sender"
                            className="group bg-white p-8 rounded-[2rem] border border-border/50 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-[#404F4F]/5 group-hover:bg-accent-icon/10 transition-colors">
                                    <Megaphone className="h-6 w-6 text-[#404F4F]" />
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-[#404F4F] mb-2">Disparador em Massa</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Envie mensagens personalizadas e mídias para seus leads via WhatsApp de forma automatizada.
                            </p>
                        </a>
                    </div>

                    {/* SEÇÃO 2: IMÓVEIS PARA DIVULGAR */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ImageIcon className="h-5 w-5 text-[#404F4F]/40" />
                                <h2 className="text-xl font-black text-[#404F4F]">Prontos para Divulgação</h2>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rápido e Simples</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {isLoadingProps ? (
                                [1, 2, 3, 4].map(n => (
                                    <div key={n} className="h-[220px] rounded-[2rem] bg-[#404F4F]/5 animate-pulse" />
                                ))
                            ) : properties.length > 0 ? (
                                properties.map((prop) => (
                                    <div
                                        key={prop.id}
                                        className="group relative aspect-[4/5] overflow-hidden bg-white rounded-[2rem] border border-border/50 shadow-sm transition-all hover:shadow-xl"
                                    >
                                        {prop.images?.[0] ? (
                                            <img src={prop.images[0]} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt={prop.title} />
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                                <ImageIcon className="h-10 w-10" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-[#404F4F] via-transparent to-transparent flex flex-col justify-end p-6 translate-y-2 group-hover:translate-y-0 transition-transform">
                                            <h4 className="text-white font-black text-sm line-clamp-1">{prop.title}</h4>
                                            <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">{prop.type}</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleYouTubeShorts(prop)}
                                                        title="Postar YouTube Shorts"
                                                        className="bg-red-600 text-white p-2.5 rounded-xl transition-all transform hover:scale-110 shadow-lg"
                                                    >
                                                        <Youtube className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleQuickPost(prop)}
                                                        title="Postar Instagram Feed"
                                                        className="bg-[#FFE600] text-[#404F4F] p-2.5 rounded-xl transition-all transform hover:scale-110 shadow-lg"
                                                    >
                                                        <Instagram className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-16 text-center bg-white rounded-[2rem] border border-border/10">
                                    <p className="text-muted-foreground text-sm font-medium">Nenhum imóvel disponível para ação rápida.</p>
                                </div>
                            )}
                        </div>
                    </section>
                    
                    {/* SEÇÃO 3: STATUS DAS CONEXÕES */}
                    <section className="space-y-6 pb-20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <RefreshCw className="h-5 w-5 text-[#404F4F]/40" />
                                <h2 className="text-xl font-black text-[#404F4F]">Status das Conexões</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {integrations.map((item) => (
                                <div
                                    key={item.id}
                                    className={`group relative bg-white rounded-2xl border border-border/50 shadow-sm p-6 transition-all hover:border-accent-icon/30 ${item.upcoming ? 'opacity-60' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-gray-50 group-hover:bg-accent-icon/10 transition-colors">
                                                <item.icon className="h-5 w-5 text-[#404F4F]" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-[#404F4F] text-sm">{item.name}</h3>
                                                {item.connected && item.connectedAccount && (
                                                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-tight">{item.connectedAccount}</p>
                                                )}
                                            </div>
                                        </div>
                                        {item.connected ? (
                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-green-100" />
                                        ) : (
                                            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full" />
                                        )}
                                    </div>

                                    <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[32px] mb-6">
                                        {item.description}
                                    </p>

                                    <div className="flex gap-2">
                                        {!item.connected && !item.upcoming ? (
                                            <button
                                                onClick={() => handleConnect(item.id)}
                                                className="flex-1 h-10 bg-[#404F4F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#2d3939] transition-all"
                                            >
                                                Conectar
                                            </button>
                                        ) : item.connected ? (
                                            <button
                                                className="flex-1 h-10 bg-gray-50 text-[#404F4F]/60 border border-border rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
                                            >
                                                Desconectar
                                            </button>
                                        ) : (
                                            <div className="flex-1 h-10 bg-gray-50 border border-dashed border-border rounded-xl flex items-center justify-center">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Em breve</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}

            {/* Modais de Postagem */}
            {selectedProp && (
                <>
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
                    <YouTubeShortsModal
                        isOpen={isYouTubeModalOpen}
                        onClose={() => {
                            setIsYouTubeModalOpen(false);
                            setSelectedProp(null);
                        }}
                        prop={selectedProp}
                        tenantId={tenantId}
                    />
                </>
            )}
        </div>
    );
}
