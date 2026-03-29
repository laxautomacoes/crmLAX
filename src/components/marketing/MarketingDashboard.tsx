'use client';

import { useState, useEffect } from 'react';
import { Instagram, Youtube, Facebook, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { getMarketingIntegrations } from '@/app/_actions/marketing';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

interface MarketingDashboardProps {
    tenantId: string;
    hasProPlan: boolean;
}

export default function MarketingDashboard({ tenantId, hasProPlan }: MarketingDashboardProps) {
    const searchParams = useSearchParams();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
    
    useEffect(() => {
        fetchIntegrations();

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

    const isConnected = (provider: string) => {
        return activeIntegrations.some(i => i.provider === provider && i.status === 'active');
    };

    const handleConnect = (id: string) => {
        if (!hasProPlan) {
            toast.error('O Módulo de Marketing exige o plano PRO.');
            return;
        }

        if (id === 'instagram') {
            setIsConnecting(true);
            window.location.href = `/api/auth/instagram?tenant_id=${tenantId}`;
        }
    };

    const integrations = [
        {
            id: 'instagram',
            name: 'Instagram Business',
            icon: Instagram,
            connected: isConnected('instagram'),
            description: 'Postagem automática de imóveis e geração de legendas com IA.',
            color: 'from-purple-500 to-pink-500'
        },
        {
            id: 'facebook',
            name: 'Facebook Pages',
            icon: Facebook,
            connected: false, // Inbound leads is separate from posting typically
            description: 'Sincronização de anúncios e posts no Feed do Facebook.',
            color: 'from-blue-600 to-blue-400'
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isLoading ? (
                <div className="flex items-center justify-center h-64 bg-card rounded-2xl border border-border/50">
                    <RefreshCw className="h-8 w-8 text-[#FFE600] animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {integrations.map((item) => (
                        <div 
                            key={item.id} 
                            className={`relative overflow-hidden bg-white rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md ${item.upcoming ? 'opacity-75' : ''}`}
                        >
                            <div className={`h-2 w-full bg-gradient-to-r ${item.color}`} />
                            
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className={`p-2.5 rounded-xl bg-[#404F4F]/5 text-[#404F4F]`}>
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    {item.connected ? (
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 shadow-sm">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Conectado
                                        </span>
                                    ) : item.upcoming ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#404F4F]/40 bg-[#404F4F]/5 px-2 py-1 rounded-full">
                                            Em breve
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            Desconectado
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h3 className="font-bold text-[#404F4F] text-lg">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed mt-1 h-12 overflow-hidden">
                                        {item.description}
                                    </p>
                                </div>

                                <div className="pt-2">
                                    {!item.connected && !item.upcoming ? (
                                        <button
                                            onClick={() => handleConnect(item.id)}
                                            disabled={isConnecting}
                                            className="w-full h-11 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#FFE600] text-[#404F4F] font-bold text-sm transition-all hover:bg-[#F2DB00] hover:shadow-lg hover:shadow-[#FFE600]/20 active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {isConnecting ? (
                                                <RefreshCw className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    Conectar Conta
                                                    <ArrowRight className="h-5 w-5" />
                                                </>
                                            )}
                                        </button>
                                    ) : item.connected ? (
                                        <button
                                            className="w-full h-11 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-border text-[#404F4F]/60 font-bold text-sm transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100 group"
                                        >
                                            <LogOut className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            Desconectar
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full h-11 py-2.5 px-4 rounded-xl bg-gray-50 text-gray-400 font-bold text-sm cursor-not-allowed border border-gray-100"
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

            {/* Seção de Dicas / Valor Pro */}
            <div className="bg-[#404F4F] rounded-2xl p-8 text-white relative overflow-hidden shadow-xl border-t-4 border-[#FFE600]">
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
                        Marketing Inteligente com Gemini
                        <span className="bg-[#FFE600] text-[#404F4F] text-[10px] px-2 py-0.5 rounded-full uppercase tracking-[0.2em] font-black">IA Ativa</span>
                    </h2>
                    <p className="text-white/80 text-sm leading-relaxed mb-6 font-medium">
                        Ao conectar seu Instagram Business, nossa inteligência artificial analisará cada detalhe do seu estoque 
                        e criará automaticamente legendas persuasivas, selecionará as melhores hashtags e 
                        impulsionará a visibilidade dos seus imóveis.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-xs bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                            <CheckCircle2 className="h-4 w-4 text-[#FFE600]" />
                            Legendas Infalíveis
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                            <CheckCircle2 className="h-4 w-4 text-[#FFE600]" />
                            Hashtags Estratégicas
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                            <CheckCircle2 className="h-4 w-4 text-[#FFE600]" />
                            Automação de Feed & Reels
                        </div>
                    </div>
                </div>
                
                {/* Efeito Visual de Fundo */}
                <div className="absolute right-[-5%] top-[-20%] w-[35%] h-[140%] bg-[#FFE600]/10 rotate-12 blur-3xl rounded-full" />
                <Sparkles className="absolute right-12 top-12 h-24 w-24 text-[#FFE600]/10" />
            </div>
        </div>
    );
}

// Ícone dummy para o componente
function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    )
}
