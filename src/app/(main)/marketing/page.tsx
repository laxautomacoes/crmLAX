import { Metadata } from 'next';
import { getProfile } from '@/app/_actions/profile';
import MarketingDashboard from '@/components/marketing/MarketingDashboard';
import PlanGate from '@/components/ui/PlanGate';
import { Megaphone, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Marketing & IA | CRM LAX',
    description: 'Automatize suas redes sociais e potencialize suas vendas com inteligência artificial.',
};

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
    const { profile, error } = await getProfile();

    if (error || !profile || !profile.tenant_id) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-card rounded-2xl border border-border/50 animate-in fade-in duration-500">
                <p className="text-[#404F4F] font-bold text-lg mb-2">Ops! Sessão expirada.</p>
                <p className="text-muted-foreground text-sm">Por favor, realize o login novamente para acessar o marketing.</p>
            </div>
        );
    }

    const hasProPlan = profile.tenants?.plan_type?.toLowerCase() === 'pro';

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12">

            {/* Grid de Conteúdo com Gate de Plano */}
            <div className="grid grid-cols-1 gap-8">
                <PlanGate 
                    hasAccess={hasProPlan} 
                    feature="Marketing Automatizado & IA"
                >
                    <MarketingDashboard 
                        tenantId={profile.tenant_id} 
                        profileId={profile.id}
                        hasProPlan={hasProPlan} 
                        userRole={profile.role}
                    />
                </PlanGate>
            </div>

        </div>
    );
}
