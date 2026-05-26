'use server'

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Tables } from "../../lib/supabase/database.types";
import { calculateCostBRL } from "@/utils/ai-pricing";

/**
 * Busca estatísticas agregadas de uso de IA.
 * Superadmin vê global, Admin vê apenas seu tenant.
 */
export async function getAIUsageStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    let query = supabase.from('ai_usage').select('*');

    if (profile?.role !== 'superadmin') {
        query = query.eq('tenant_id', profile?.tenant_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const usageData = (data || []) as Tables<'ai_usage'>[];

    // Buscar dados do plano do tenant para limites
    let planLimit: { ai_requests_per_month: number | null; display_name: string | null } | null = null;
    if (profile?.tenant_id) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('plan_type')
            .eq('id', profile.tenant_id)
            .single();
        if (tenant?.plan_type) {
            const { data: limit } = await supabase
                .from('plan_limits')
                .select('ai_requests_per_month, display_name')
                .eq('plan_type', tenant.plan_type)
                .single();
            planLimit = limit;
        }
    }

    // Filtrar uso do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlyData = usageData.filter(item => (item.created_at || '') >= startOfMonth);

    // Agregação
    const stats = {
        total_tokens: 0,
        total_cost_brl: 0,
        gpt_count: 0,
        gemini_count: 0,
        total_requests: usageData.length,
        monthly_requests: monthlyData.length,
        monthly_limit: planLimit?.ai_requests_per_month || 0,
        plan_name: planLimit?.display_name || 'N/A',
        usage_by_day: {} as Record<string, { gpt: number, gemini: number }>,
    };

    usageData.forEach((item: Tables<'ai_usage'>) => {
        const tokens = item.total_tokens || 0;
        stats.total_tokens += tokens;
        stats.total_cost_brl += calculateCostBRL(item.model || '', tokens);
        const isGPT = item.model?.toLowerCase().includes('gpt');
        if (isGPT) stats.gpt_count++;
        else stats.gemini_count++;

        const date = new Date(item.created_at || '').toISOString().split('T')[0];
        if (!stats.usage_by_day[date]) {
            stats.usage_by_day[date] = { gpt: 0, gemini: 0 };
        }
        if (isGPT) stats.usage_by_day[date].gpt++;
        else stats.usage_by_day[date].gemini++;
    });

    return stats;
}

/**
 * Busca a configuração atual de provedores por plano. (Apenas Superadmin)
 */
export async function getAIPlanConfigs() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'superadmin') throw new Error("Acesso negado");

    const { data: configs, error } = await supabase
        .from('plan_limits')
        .select('plan_type, ai_provider, ai_model, display_name')
        .order('display_order', { ascending: true } as any);

    if (error) throw error;
    return (configs || []) as { plan_type: string; ai_provider: string | null; ai_model: string | null; display_name: string | null }[];
}

/**
 * Atualiza o provedor e modelo de IA de um plano. (Apenas Superadmin)
 */
export async function updatePlanAIProvider(planType: string, provider: 'gemini' | 'openai', model?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'superadmin') return { error: "Sem permissão" };

    const updateData: any = { ai_provider: provider };
    if (model) updateData.ai_model = model;

    const adminClient = createAdminClient();
    const { error, count } = await adminClient
        .from('plan_limits')
        .update(updateData, { count: 'exact' })
        .eq('plan_type', planType);

    if (error) return { error: error.message };
    if (count === 0) return { error: `Plano '${planType}' não encontrado para atualização.` };

    revalidatePath('/settings/ias');
    return { success: true };
}

/**
 * Retorna a configuração de IA (provider e modelo) do tenant do usuário logado.
 * Usado pelo PropertyImportPDFModal para exibir qual LLM será utilizada.
 */
export async function getTenantAIConfig(tenantId: string): Promise<{ provider: string; model: string }> {
    const supabase = await createClient();

    const { data: tenant } = await supabase
        .from('tenants')
        .select('plan_type')
        .eq('id', tenantId)
        .single();

    if (!tenant) return { provider: 'gemini', model: 'gemini-2.0-flash' };

    const { data: limit } = await supabase
        .from('plan_limits')
        .select('ai_provider, ai_model')
        .eq('plan_type', tenant.plan_type)
        .single();

    return {
        provider: limit?.ai_provider || 'gemini',
        model: limit?.ai_model || 'gemini-2.0-flash',
    };
}

/**
 * Busca uso detalhado com informações de tenant.
 */
export async function getDetailedAIUsage(limit = 50) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    let query = supabase
        .from('ai_usage')
        .select(`
            id,
            created_at,
            model,
            total_tokens,
            feature_context,
            tenants (name)
        `)
        .order('created_at', { ascending: false });

    if (profile?.role !== 'superadmin') {
        query = query.eq('tenant_id', profile?.tenant_id);
    }

    const { data, error } = await query.limit(limit);
    if (error) throw error;
    return (data || []) as (Tables<'ai_usage'> & { tenants: { name: string } | null })[];
}
