'use client';

import { WhatsAppCard } from '@/components/settings/integrations/WhatsAppCard';
import { IntegrationEndpointCard } from '@/components/settings/integrations/IntegrationEndpointCard';
import { MarketDataCard } from '@/components/settings/integrations/MarketDataCard';
import { NewsFeedCard } from '@/components/settings/integrations/NewsFeedCard';
import { GatewayCard } from '@/components/settings/integrations/GatewayCard';
import { Facebook, Chrome, Building2 } from 'lucide-react';

interface IntegrationsContentProps {
    tenantId: string;
    slug?: string;
    customDomain?: string;
}

export function IntegrationsContent({ tenantId, slug, customDomain }: IntegrationsContentProps) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-12">
            
            {/* SEÇÃO 1: COMUNICAÇÃO */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Comunicação</h2>
                    <div className="h-px bg-border flex-1" />
                </div>

                <div className="flex flex-col gap-6">
                    <WhatsAppCard />
                </div>
            </div>

            {/* SEÇÃO 2: ANÚNCIOS & PORTAIS */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Anúncios & Portais</h2>
                    <div className="h-px bg-border flex-1" />
                </div>

                <div className="flex flex-col gap-6">
                    <IntegrationEndpointCard 
                        title="Facebook & Instagram Ads"
                        description="Capture leads do Facebook e Instagram em tempo real."
                        icon={Facebook}
                        iconColor="bg-[#1877F2]/10 text-[#1877F2]"
                        endpoint="/api/v1/connectors/facebook"
                        tenantId={tenantId}
                        slug={slug}
                        customDomain={customDomain}
                    />
                    <IntegrationEndpointCard 
                        title="Google Ads"
                        description="Integre formulários do Google Search e YouTube."
                        icon={Chrome}
                        iconColor="bg-foreground/10 text-foreground"
                        endpoint="/api/v1/connectors/google"
                        tenantId={tenantId}
                        slug={slug}
                        customDomain={customDomain}
                    />
                    <IntegrationEndpointCard 
                        title="Portais Imobiliários"
                        description="Receba leads do ZAP, VivaReal, OLX e outros portais."
                        icon={Building2}
                        iconColor="bg-emerald-500/10 text-emerald-500"
                        endpoint="/api/v1/connectors/portals"
                        tenantId={tenantId}
                        slug={slug}
                        customDomain={customDomain}
                    />
                </div>
            </div>

            {/* SEÇÃO 3: FINANCEIRO */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Financeiro</h2>
                    <div className="h-px bg-border flex-1" />
                </div>

                <div className="flex flex-col gap-6">
                    <GatewayCard tenantId={tenantId} provider="stripe" />
                    <GatewayCard tenantId={tenantId} provider="checkout_lax" />
                </div>
            </div>

            {/* SEÇÃO 4: INTELIGÊNCIA DE MERCADO */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Inteligência de Mercado</h2>
                    <div className="h-px bg-border flex-1" />
                </div>

                <div className="flex flex-col gap-6">
                    <MarketDataCard tenantId={tenantId} />
                    <NewsFeedCard tenantId={tenantId} />
                </div>
            </div>

        </div>
    );
}
