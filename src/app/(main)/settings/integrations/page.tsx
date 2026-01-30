'use client';

import { WhatsAppCard } from '@/components/settings/integrations/WhatsAppCard';

export const dynamic = 'force-dynamic';

export default function IntegrationsSettingsPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
                    <p className="text-muted-foreground">Gerencie as conexões do sistema com ferramentas externas.</p>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl">
                <WhatsAppCard />
            </div>
        </div>
    );
}
