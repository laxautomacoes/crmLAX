'use client';

import { useState, useEffect } from 'react';
import {
    Image as ImageIcon,
    Send,
} from 'lucide-react';
import { getMarketingIntegrations } from '@/app/_actions/marketing';
import { getProperties } from '@/app/_actions/properties';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { QuickPublishModal } from './QuickPublishModal';

const MetaIcon = (props: any) => (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="meta-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0278F1" />
                <stop offset="50%" stopColor="#0080FB" />
                <stop offset="100%" stopColor="#00C6FF" />
            </linearGradient>
        </defs>
        <path d="M26.9 16C22.5 16 19 19.8 16.7 24.2C13.5 30.4 12.8 37.4 15 43.3C17 48.2 21.1 51.2 25.8 51.2C29 51.2 31.8 49.6 33.8 47.2L35.3 45.3L36.9 47.4C39.8 51 43.7 52 47.1 52C52.6 52 57.8 49.2 60.8 44.5C63.8 39.8 64.3 33.5 62.3 28.4C60.5 23.7 56.4 20.7 52 20.7C48 20.7 44.6 22.2 42 25L40.7 26.4L39.3 24.8C36.5 21.5 33.1 16 26.9 16ZM47.5 44.8C45.3 44.8 43.2 44 41.8 42.2L37.8 37.3C36.7 35.9 34.7 35.9 33.6 37.3L29.6 42.2C28.2 44 26 44.8 23.8 44.8C21.6 44.8 19.6 44 18 42.2C16.4 40.5 15.4 38 15.1 35.4C14.8 32.7 15.1 30 16.1 27.6C17.7 24 20.5 21.8 23.6 21.8C25.8 21.8 27.9 22.6 29.5 24.4L33.5 29.3C33.9 29.9 34.6 30.2 35.3 30.2C36 30.2 36.7 29.9 37.1 29.3L40.7 25.1C42.3 23.2 44.4 22.2 46.8 22.2C49 22.2 51.1 23 52.7 24.8C54.3 26.5 55.3 29 55.6 31.6C55.9 34.3 55.6 37 54.6 39.4C53 43 50.2 44.8 47.1 44.8H47.5Z" fill="url(#meta-grad)" />
    </svg>
);

const GoogleAdsIcon = (props: any) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M3.29 17.1L10.29 5.1C10.59 4.58 11.11 4.25 11.69 4.11L15.5 3.5L4.5 20.5H11.5L14.88 15.11" fill="#FBBC04" />
        <path d="M15.5 3.5L4.5 20.5H11.5L22.5 3.5H15.5Z" fill="#FBBC04" />
        <path d="M7 11.5L1.5 20.5H8.5L14 11.5H7Z" fill="#4285F4" />
        <path d="M11.5 20.5C13.433 20.5 15 18.933 15 17C15 15.067 13.433 13.5 11.5 13.5C9.567 13.5 8 15.067 8 17C8 18.933 9.567 20.5 11.5 20.5Z" fill="#34A853" />
    </svg>
);

const YouTubeShortsIcon = (props: any) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M10 14.65v-5.3L15 12l-5 2.65z" fill="white" />
        <path d="M17.77 10.32c-.42-.26-.78-.56-1.05-.93-.27-.36-.4-.77-.4-1.25 0-.78.35-1.4 1.05-1.87.18-.12.38-.22.6-.3a3.85 3.85 0 00-1.97-.97 3.57 3.57 0 00-2.3.3l-.58.3c-.5.26-.97.39-1.4.39-.45 0-.93-.13-1.44-.39l-.53-.27a3.6 3.6 0 00-2.34-.3 3.84 3.84 0 00-2.77 2.74 3.63 3.63 0 00.3 2.57l.28.5c.26.46.39.89.39 1.3 0 .4-.13.85-.39 1.33l-.25.44a3.63 3.63 0 00-.3 2.57 3.84 3.84 0 002.77 2.74c.7.17 1.4.12 2.07-.15l.8-.4c.47-.23.91-.35 1.3-.35.4 0 .83.12 1.3.35l.67.34c.67.28 1.38.33 2.12.15a3.84 3.84 0 002.77-2.74c.17-.68.14-1.35-.07-2.01a4.55 4.55 0 00-.22-.56c-.13-.25-.22-.53-.26-.84.08-.22.2-.4.37-.56z" fill="#FF0000" />
        <path d="M10 14.65v-5.3L15 12l-5 2.65z" fill="white" />
    </svg>
);


interface StudioConnectionsProps {
    tenantId: string;
    profileId: string;
    hasProPlan: boolean;
}

export function StudioConnections({ tenantId, profileId, hasProPlan }: StudioConnectionsProps) {
    const searchParams = useSearchParams();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingProps, setIsLoadingProps] = useState(false);
    const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [selectedProp, setSelectedProp] = useState<any>(null);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

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
            const result = await getProperties(tenantId, undefined, undefined, undefined, true);
            if (result.success) {
                setProperties(result.data?.slice(0, 12) || []);
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

    const handleQuickPublish = (prop: any) => {
        if (!activeIntegrations.some(i => i.provider === 'instagram' && i.status === 'active')) {
            toast.error('Conecte seu Instagram Business primeiro.');
            return;
        }
        setSelectedProp(prop);
        setIsPublishModalOpen(true);
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
            id: 'youtube',
            name: 'YouTube Shorts',
            icon: YouTubeShortsIcon,
            connected: !!getIntegrationData('youtube'),
            connectedAccount: getIntegrationData('youtube')?.credentials?.account_name,
            description: 'Transforme vídeos em Shorts automaticamente.',
            upcoming: false
        }
    ];

    return (
        <>
            {/* IMÓVEIS PARA DIVULGAR */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-foreground">Prontos para Divulgação</h2>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {isLoadingProps ? (
                        [1, 2, 3, 4, 5, 6].map(n => (
                            <div key={n} className="h-[220px] w-[200px] shrink-0 rounded-lg bg-muted animate-pulse" />
                        ))
                    ) : properties.length > 0 ? (
                        properties.map((prop) => (
                            <div
                                key={prop.id}
                                onClick={() => handleQuickPublish(prop)}
                                className="group relative w-[200px] shrink-0 aspect-[4/5] overflow-hidden bg-card rounded-lg border border-border/50 shadow-sm transition-all hover:shadow-xl cursor-pointer"
                            >
                                {prop.images?.[0] ? (
                                    <img src={prop.images[0]} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt={prop.title} />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                        <ImageIcon className="h-10 w-10" />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent flex flex-col justify-end p-6 translate-y-2 group-hover:translate-y-0 transition-transform">
                                    <h4 className="text-white font-black text-sm line-clamp-1">{prop.title}</h4>
                                    <div className="flex items-center justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider shadow-lg">
                                            <Send className="h-3 w-3" />
                                            Publicar
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-16 text-center bg-card rounded-lg border border-border/10 w-full">
                            <p className="text-muted-foreground text-sm font-medium">Nenhum imóvel disponível para ação rápida.</p>
                        </div>
                    )}
                </div>
            </section>
            
            {/* STATUS DAS CONEXÕES */}
            <section className="space-y-6 pb-20">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-foreground">Conexões</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {integrations.map((item) => (
                        <div
                            key={item.id}
                            className={`group relative bg-card rounded-lg border border-border shadow-sm p-6 transition-all hover:border-accent-icon/30 ${item.upcoming ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <item.icon className="h-8 w-8 shrink-0" />
                                    <div>
                                        <h3 className="font-black text-foreground text-sm">{item.name}</h3>
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
                                        className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-primary/80 transition-all"
                                    >
                                        Conectar
                                    </button>
                                ) : item.connected ? (
                                    <button
                                        className="flex-1 h-10 bg-muted text-foreground/60 border border-border rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
                                    >
                                        Desconectar
                                    </button>
                                ) : (
                                    <div className="flex-1 h-10 bg-muted border border-dashed border-border rounded-lg flex items-center justify-center">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Em breve</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Modal de Publicação Unificado */}
            {selectedProp && (
                <QuickPublishModal
                    isOpen={isPublishModalOpen}
                    onClose={() => {
                        setIsPublishModalOpen(false);
                        setSelectedProp(null);
                    }}
                    prop={selectedProp}
                    tenantId={tenantId}
                    profileId={profileId}
                />
            )}
        </>
    );
}
