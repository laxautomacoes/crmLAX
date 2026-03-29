import { getProfile } from '@/app/_actions/profile';
import MarketingDashboard from '@/components/marketing/MarketingDashboard';
import PlanGate from '@/components/ui/PlanGate';
import { Megaphone, Sparkles } from 'lucide-react';

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
            {/* Header da Página */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-3xl font-bold text-[#404F4F] flex items-center gap-3">
                        <Megaphone className="h-8 w-8 text-[#FFE600]" />
                        Módulo de Marketing
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Automatize suas redes sociais e conecte-se com mais clientes.
                    </p>
                </div>

                {!hasProPlan && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-[#404F4F] to-[#2d3939] px-4 py-2 rounded-xl border-l-4 border-[#FFE600] shadow-lg">
                        <Sparkles className="h-4 w-4 text-[#FFE600]" />
                        <span className="text-white text-xs font-bold uppercase tracking-wider">Upgrade Disponível</span>
                    </div>
                )}
            </div>

            {/* Grid de Conteúdo com Gate de Plano */}
            <div className="grid grid-cols-1 gap-8">
                <PlanGate 
                    hasAccess={hasProPlan} 
                    feature="Marketing Automatizado & IA"
                >
                    <MarketingDashboard 
                        tenantId={profile.tenant_id} 
                        hasProPlan={hasProPlan} 
                    />
                </PlanGate>
            </div>

            {/* Rodapé Informativo */}
            <div className="pt-8 border-t border-border/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                <p>© 2026 CRM LAX - Todos os direitos reservados.</p>
                <div className="flex items-center gap-6">
                    <a href="#" className="hover:text-[#404F4F] transition-colors">Termos de Uso do Meta</a>
                    <a href="#" className="hover:text-[#404F4F] transition-colors">Política de Privacidade</a>
                    <a href="#" className="hover:text-[#404F4F] transition-colors">Gerenciar Permissões</a>
                </div>
            </div>
        </div>
    );
}
