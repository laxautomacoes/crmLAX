'use client';

import { useState, useEffect } from 'react';
import { WhatsAppCard } from '@/components/settings/integrations/WhatsAppCard';
import { IntegrationEndpointCard } from '@/components/settings/integrations/IntegrationEndpointCard';
import { Facebook, Chrome, Building2, Info } from 'lucide-react';
import { getProfile } from '@/app/_actions/profile';

export const dynamic = 'force-dynamic';

export default function IntegrationsSettingsPage() {
    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        async function loadProfile() {
            const { profile } = await getProfile();
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id);
            }
        }
        loadProfile();
    }, []);

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
                    <p className="text-muted-foreground">Gerencie as conexões do sistema com ferramentas externas.</p>
                </div>
                <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-6" />
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                {/* WhatsApp é destaque, ocupa largura total */}
                <div className="max-w-4xl">
                    <WhatsAppCard />
                </div>
                
                {tenantId && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-px bg-border flex-1" />
                            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] whitespace-nowrap">
                                Conectores Automáticos
                            </h2>
                            <div className="h-px bg-border flex-1" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                            <IntegrationEndpointCard 
                                title="Facebook Ads"
                                description="Capture leads diretamente dos seus anúncios no Facebook e Instagram."
                                icon={Facebook}
                                iconColor="bg-[#1877F2]/10 text-[#1877F2]"
                                endpoint="/api/v1/connectors/facebook"
                                tenantId={tenantId}
                            />

                            <IntegrationEndpointCard 
                                title="Google Ads"
                                description="Integre formulários de leads do Google Search e YouTube."
                                icon={Chrome}
                                iconColor="bg-foreground/10 text-foreground"
                                endpoint="/api/v1/connectors/google"
                                tenantId={tenantId}
                            />

                            <IntegrationEndpointCard 
                                title="Portais"
                                description="Receba leads do ZAP, VivaReal, OLX e outros portais imobiliários."
                                icon={Building2}
                                iconColor="bg-secondary/10 text-secondary"
                                endpoint="/api/v1/connectors/portals"
                                tenantId={tenantId}
                            />
                        </div>

                        <div className="bg-muted/30 border border-border p-6 rounded-2xl flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-background border border-border text-muted-foreground">
                                <Info size={20} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                <strong>Dica Premium:</strong> Ao usar esses conectores nativos, seus leads entram em tempo real no pipeline, 
                                sem depender de ferramentas como n8n ou Zapier, economizando tempo e recursos.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
