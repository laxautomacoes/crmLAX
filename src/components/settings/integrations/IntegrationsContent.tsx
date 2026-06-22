'use client';

import { WhatsAppCard } from '@/components/settings/integrations/WhatsAppCard';
import { IntegrationEndpointCard } from '@/components/settings/integrations/IntegrationEndpointCard';
import { MarketDataCard } from '@/components/settings/integrations/MarketDataCard';
import { NewsFeedCard } from '@/components/settings/integrations/NewsFeedCard';
import { GatewayCard } from '@/components/settings/integrations/GatewayCard';
import { DocuSignCard } from '@/components/settings/integrations/DocuSignCard';
import { MetaIcon, GoogleAdsIcon, PortalIcon } from '@/components/icons/BrandIcons';

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
                <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Comunicação</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    <WhatsAppCard />
                </div>
            </div>

            <hr className="border-border/60" />

            {/* SEÇÃO 2: ANÚNCIOS & PORTAIS */}
            <div className="space-y-6">
                <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Anúncios & Portais</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    <IntegrationEndpointCard 
                        title="Facebook & Instagram Ads"
                        description="Capture leads do Facebook e Instagram em tempo real."
                        icon={MetaIcon}
                        iconColor="bg-[#0081FB]/10 text-[#0081FB]"
                        endpoint="/api/v1/connectors/facebook"
                        tenantId={tenantId}
                        slug={slug}
                        customDomain={customDomain}
                    />
                    <IntegrationEndpointCard 
                        title="Google Ads"
                        description="Integre formulários do Google Search e YouTube."
                        icon={GoogleAdsIcon}
                        iconColor="bg-[#4285F4]/10 text-[#4285F4]"
                        endpoint="/api/v1/connectors/google"
                        tenantId={tenantId}
                        slug={slug}
                        customDomain={customDomain}
                    />
                    <IntegrationEndpointCard 
                        title="Portais Imobiliários"
                        description="Receba leads do ZAP, VivaReal, OLX e outros portais."
                        icon={PortalIcon}
                        iconColor="bg-emerald-500/10 text-emerald-500"
                        endpoint="/api/v1/connectors/portals"
                        tenantId={tenantId}
                        slug={slug}
                        customDomain={customDomain}
                    />
                </div>
            </div>

            <hr className="border-border/60" />

            {/* SEÇÃO 3: FINANCEIRO */}
            <div className="space-y-6">
                <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Financeiro</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    <GatewayCard tenantId={tenantId} provider="stripe" />
                    <GatewayCard tenantId={tenantId} provider="checkout_lax" />
                </div>
            </div>

            <hr className="border-border/60" />

            {/* SEÇÃO 4: ASSINATURA DIGITAL */}
            <div className="space-y-6">
                <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Assinatura Digital & Alertas</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    <DocuSignCard />
                </div>
            </div>

            <hr className="border-border/60" />

            {/* SEÇÃO 5: INTELIGÊNCIA DE MERCADO */}
            <div className="space-y-6">
                <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Inteligência de Mercado</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    <MarketDataCard tenantId={tenantId} />
                    <NewsFeedCard tenantId={tenantId} />
                </div>
            </div>

        </div>
    );
}
