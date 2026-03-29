'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Verifica se o tenant tem acesso a uma feature do plano.
 * Versão Server Action para ser chamada do Cliente.
 */
export async function checkPlanFeatureAction(tenantId: string, feature: 'ai' | 'whatsapp' | 'custom_domain' | 'marketing'): Promise<boolean> {
    try {
        const supabase = await createClient()
        const { data } = await supabase
            .rpc('check_plan_feature', { p_tenant_id: tenantId, p_feature: feature })
        
        return !!data
    } catch (error) {
        console.error('Plan action error:', error)
        return false
    }
}

/**
 * Retorna os limites do plano.
 */
export async function getPlanLimitsAction(tenantId: string) {
    try {
        const supabase = await createClient()

        const { data: tenant } = await supabase
            .from('tenants')
            .select('plan_type')
            .eq('id', tenantId)
            .single()

        if (!tenant) return null

        const { data: limits } = await supabase
            .from('plan_limits')
            .select('*')
            .eq('plan_type', tenant.plan_type)
            .single()

        return limits
    } catch (error) {
        console.error('Plan action error:', error)
        return null
    }
}

/**
 * Gera a URL do Portal do Cliente do Stripe para gestão de faturamento.
 */
export async function getStripePortalUrl() {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-01-27.acacia' as any,
    })

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Não autenticado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile?.tenant_id) return { error: 'Tenant não encontrado' }

        const { data: tenant } = await supabase
            .from('tenants')
            .select('stripe_customer_id')
            .eq('id', profile.tenant_id)
            .single()

        if (!tenant?.stripe_customer_id || tenant.stripe_customer_id.includes('...')) {
            return { error: 'Você ainda não possui uma assinatura ativa para gerenciar.' }
        }

        const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.startsWith('http') 
            ? process.env.NEXT_PUBLIC_ROOT_DOMAIN 
            : `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;

        const session = await stripe.billingPortal.sessions.create({
            customer: tenant.stripe_customer_id,
            return_url: `${domain}/settings/subscription`,
        })

        return { url: session.url }
    } catch (error: any) {
        console.error('Portal Error:', error)
        return { error: error.message }
    }
}

export interface PlanConfigInput {
    plan_type: string;
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    ai_features: string[];
    highlighted: boolean;
    max_leads_per_month: number;
    max_assets: number;
    max_users: number;
    has_whatsapp: boolean;
    has_ai: boolean;
    has_custom_domain: boolean;
    ai_requests_per_month: number;
    display_order?: number;
}

/**
 * Atualiza as configurações de um plano. Apenas Superadmin pode executar.
 */
export async function updatePlanConfig(input: PlanConfigInput) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'superadmin') {
        return { error: 'Sem permissão. Apenas Superadmin pode editar planos.' }
    }

    const { error } = await supabase
        .from('plan_limits')
        .update({
            display_name: input.name,
            price_text: input.price,
            period_text: input.period,
            description_text: input.description,
            features_list: input.features,
            ai_features_list: input.ai_features,
            is_highlighted: input.highlighted,
            max_leads_per_month: input.max_leads_per_month,
            max_assets: input.max_assets,
            max_users: input.max_users,
            has_whatsapp: input.has_whatsapp,
            has_ai: input.has_ai,
            has_custom_domain: input.has_custom_domain,
            ai_requests_per_month: input.ai_requests_per_month,
            display_order: input.display_order,
        })
        .eq('plan_type', input.plan_type)

    if (error) return { error: error.message }
    return { success: true }
}

/**
 * Atualiza a ordem de exibição dos planos em lote.
 */
export async function updatePlansOrderAction(orders: { plan_type: string, display_order: number }[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'superadmin') {
        return { error: 'Sem permissão.' }
    }

    // Executa atualizações individuais (Supabase não tem bulk update via .update() que varie o valor por ID facilmente sem RPC)
    const promises = orders.map(item => 
        supabase
            .from('plan_limits')
            .update({ display_order: item.display_order })
            .eq('plan_type', item.plan_type)
    )

    const results = await Promise.all(promises)
    const error = results.find(r => r.error)?.error

    if (error) return { error: error.message }
    return { success: true }
}
