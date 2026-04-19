import { createClient } from '@/lib/supabase/server';

/**
 * Verifica se o tenant tem acesso a uma feature do plano.
 * Lança erro se o plano não permitir acesso.
 */
export async function requirePlanFeature(tenantId: string, feature: 'ai' | 'whatsapp' | 'custom_domain') {
    const supabase = await createClient();

    // 1. Check if user is superadmin (bypass plan limits)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id, tenants!inner(is_system)')
            .eq('id', user.id)
            .single();
        
        const superRoles = ['superadmin', 'super_admin', 'super administrador'];
        const isSystemTenant = profile?.tenants?.is_system === true;

        if (isSystemTenant || (profile?.role && superRoles.includes(profile.role))) {
            return; // Superadmin / System Tenant has full access
        }
    }

    // 2. Fallback to normal plan checking
    const { data, error } = await supabase
        .rpc('check_plan_feature', { p_tenant_id: tenantId, p_feature: feature });

    if (error) {
        console.error('Plan guard error:', error.message);
        throw new Error('Erro ao verificar plano.');
    }

    if (!data) {
        throw new Error(`PLAN_UPGRADE_REQUIRED:${feature}`);
    }
}

/**
 * Verifica sem lançar erro — use para condicionar UI no servidor.
 */
export async function checkPlanFeature(tenantId: string, feature: 'ai' | 'whatsapp' | 'custom_domain'): Promise<boolean> {
    try {
        const supabase = await createClient();

        // 1. Check if user is superadmin (bypass plan limits)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, tenant_id, tenants!inner(is_system)')
                .eq('id', user.id)
                .single();
            
            const superRoles = ['superadmin', 'super_admin', 'super administrador'];
            const isSystemTenant = profile?.tenants?.is_system === true;

            if (isSystemTenant || (profile?.role && superRoles.includes(profile.role))) {
                return true; // Superadmin / System Tenant has full access
            }
        }

        const { data } = await supabase
            .rpc('check_plan_feature', { p_tenant_id: tenantId, p_feature: feature });
        return !!data;
    } catch {
        return false;
    }
}

/**
 * Retorna os limites completos do plano atual do tenant.
 */
export async function getPlanLimits(tenantId: string) {
    const supabase = await createClient();

    const { data: tenant } = await supabase
        .from('tenants')
        .select('plan_type')
        .eq('id', tenantId)
        .single();

    if (!tenant) return null;

    const { data: limits } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan_type', tenant.plan_type)
        .single();

    return limits;
}
