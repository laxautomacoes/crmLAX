'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Verifica se o tenant tem acesso a uma feature do plano.
 * Versão Server Action para ser chamada do Cliente.
 */
export async function checkPlanFeatureAction(tenantId: string, feature: 'ai' | 'whatsapp' | 'custom_domain'): Promise<boolean> {
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
