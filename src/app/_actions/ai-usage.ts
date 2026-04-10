'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Tables } from "../../lib/supabase/database.types";

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

    // Agregação simples
    const stats = {
        total_tokens: 0,
        gpt_count: 0,
        gemini_count: 0,
        total_requests: usageData.length,
        usage_by_day: {} as Record<string, { gpt: number, gemini: number }>,
    };

    usageData.forEach((item: Tables<'ai_usage'>) => {
        stats.total_tokens += (item.total_tokens || 0);
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
    return (configs || []) as Tables<'plan_limits'>[];
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

    const { error } = await supabase
        .from('plan_limits')
        .update(updateData)
        .eq('plan_type', planType);

    if (error) return { error: error.message };

    revalidatePath('/settings/ias');
    return { success: true };
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
