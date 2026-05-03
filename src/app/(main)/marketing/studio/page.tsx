import { Metadata } from 'next';
import { getProfile } from '@/app/_actions/profile';
import { MarketingStudio } from '@/components/marketing/MarketingStudio';
import PlanGate from '@/components/ui/PlanGate';
import { PageHeader } from '@/components/shared/PageHeader';

export const metadata: Metadata = {
    title: 'Estúdio de Criação | CRM LAX',
    description: 'Crie conteúdos incríveis para suas redes sociais com o poder da nossa IA.',
};

export const dynamic = 'force-dynamic';

export default async function MarketingStudioPage() {
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
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader 
                title="Estúdio de Criação"
                subtitle="Crie conteúdos incríveis para suas redes sociais com o poder da inteligência artificial."
            />

            <div className="grid grid-cols-1">
                <PlanGate 
                    hasAccess={hasProPlan} 
                    feature="Estúdio de Criação & IA"
                >
                    <MarketingStudio 
                        tenantId={profile.tenant_id} 
                        profileId={profile.id}
                        variant="default"
                    />
                </PlanGate>
            </div>
        </div>
    );
}
