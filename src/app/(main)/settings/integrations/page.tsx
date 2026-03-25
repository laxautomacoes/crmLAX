'use client';

import { useState, useEffect } from 'react';
import { WhatsAppCard } from '@/components/settings/integrations/WhatsAppCard';
import { IntegrationEndpointCard } from '@/components/settings/integrations/IntegrationEndpointCard';
import { MarketDataCard } from '@/components/settings/integrations/MarketDataCard';
import { NewsFeedCard } from '@/components/settings/integrations/NewsFeedCard';
import { GatewayCard } from '@/components/settings/integrations/GatewayCard';
import { Facebook, Chrome, Building2, Info, Layers, LayoutGrid } from 'lucide-react';
import { getProfile } from '@/app/_actions/profile';

export const dynamic = 'force-dynamic';

export default function IntegrationsSettingsPage() {
    const [tenant, setTenant] = useState<any>(null);

    useEffect(() => {
        async function loadProfile() {
            const { profile } = await getProfile();
            if (profile?.tenants) {
                setTenant(profile.tenants);
            }
        }
        loadProfile();
    }, []);

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
                </div>
                <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-6" />
                {/* Aqui poderiam entrar filtros como na página de Logs se necessário no futuro */}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
                
                {/* SEÇÃO 1: COMUNICAÇÃO */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Comunicação</h2>
                        <div className="h-px bg-border flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <WhatsAppCard />
                    </div>
                </div>

                {/* SEÇÃO 2: ANÚNCIOS & PORTAIS */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Anúncios & Portais</h2>
                        <div className="h-px bg-border flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <IntegrationEndpointCard 
                            title="Facebook & Instagram Ads"
                            description="Capture leads do Facebook e Instagram em tempo real."
                            icon={Facebook}
                            iconColor="bg-[#1877F2]/10 text-[#1877F2]"
                            endpoint="/api/v1/connectors/facebook"
                            tenantId={tenant?.id || ''}
                            slug={tenant?.slug}
                            customDomain={tenant?.custom_domain}
                        />
                        <IntegrationEndpointCard 
                            title="Google Ads"
                            description="Integre formulários do Google Search e YouTube."
                            icon={Chrome}
                            iconColor="bg-foreground/10 text-foreground"
                            endpoint="/api/v1/connectors/google"
                            tenantId={tenant?.id || ''}
                            slug={tenant?.slug}
                            customDomain={tenant?.custom_domain}
                        />
                        <IntegrationEndpointCard 
                            title="Portais Imobiliários"
                            description="Receba leads do ZAP, VivaReal, OLX e outros portais."
                            icon={Building2}
                            iconColor="bg-emerald-500/10 text-emerald-500"
                            endpoint="/api/v1/connectors/portals"
                            tenantId={tenant?.id || ''}
                            slug={tenant?.slug}
                            customDomain={tenant?.custom_domain}
                        />
                    </div>
                </div>

                {/* SEÇÃO 3: FINANCEIRO */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Financeiro</h2>
                        <div className="h-px bg-border flex-1" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <GatewayCard />
                    </div>
                </div>

                {/* SEÇÃO 4: INTELIGÊNCIA DE MERCADO */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Inteligência de Mercado</h2>
                        <div className="h-px bg-border flex-1" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MarketDataCard />
                        <NewsFeedCard />
                    </div>
                </div>

                {/* DICA PREMIUM */}
                <div className="bg-[#404F4F] text-white p-8 rounded-2xl flex items-center gap-6 shadow-xl shadow-[#404F4F]/10">
                    <div>
                        <h4 className="font-bold text-lg mb-1">Dica de Automação Premium</h4>
                        <p className="text-white/70 text-sm max-w-2xl">
                            Ao manter seus dados de mercado e portais integrados diretamente no Hub LAX, sua equipe ganha agilidade 
                            sem precisar sair do CRM para consultar índices ou cadastrar leads manualmente. 
                            <strong> A eficiência é o seu maior ativo.</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
