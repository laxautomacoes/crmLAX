import { getProfile } from '@/app/_actions/profile';
import { createClient } from '@/lib/supabase/server';
import { getPlanLimits } from '@/lib/utils/plan-guard';
import { redirect } from 'next/navigation';
import SubscriptionClient from '@/components/settings/SubscriptionClient';

export const dynamic = 'force-dynamic';

export default async function SuperadminPlansPage() {
    const { profile, error } = await getProfile();
    
    // Validar se é superadmin
    const isSuperadmin = ['superadmin', 'super_admin', 'super administrador'].includes(profile?.role?.toLowerCase() || '');
    if (error || !profile?.tenant_id || !isSuperadmin) {
        redirect('/dashboard');
    }

    const supabase = await createClient();

    // Dados do tenant (o próprio do superadmin) e uso de IA
    const [{ data: tenant }, { data: aiUsage }] = await Promise.all([
        supabase.from('tenants').select('plan_type').eq('id', profile.tenant_id).single(),
        supabase.from('ai_usage').select('id', { count: 'exact' })
            .eq('tenant_id', profile.tenant_id)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    ]);

    const currentPlan = tenant?.plan_type || 'freemium';
    const limits = await getPlanLimits(profile.tenant_id);
    const aiUsageCount = (aiUsage as any)?.length || 0;

    // Buscar todos os planos disponíveis para edição (Foco do Superadmin)
    const { data: allPlanLimits } = await supabase
        .from('plan_limits')
        .select('*')
        .order('display_order');

    return (
        <SubscriptionClient
            currentPlan={currentPlan}
            limits={limits}
            aiUsageCount={aiUsageCount}
            aiRequestsLimit={limits?.ai_requests_per_month || 0}
            userRole={profile.role}
            allPlanLimits={allPlanLimits || []}
        />
    );
}
