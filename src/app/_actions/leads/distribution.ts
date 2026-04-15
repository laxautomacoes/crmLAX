'use server'

import { createClient } from '@/lib/supabase/server'

export async function getNextBrokerForDistribution(tenantId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active_for_service', true)
        .order('last_lead_assigned_at', { ascending: true, nullsFirst: true })
        .limit(1)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching next broker:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data }
}

export async function getLeadSources(tenantId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

export async function createLeadSource(tenantId: string, name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('lead_sources')
        .upsert({ tenant_id: tenantId, name }, { onConflict: 'tenant_id,name' })
        .select()
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

export async function getLeadCampaigns(tenantId: string, sourceName: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('lead_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('source_name', sourceName)
        .order('name', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

export async function createLeadCampaign(tenantId: string, sourceName: string, name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('lead_campaigns')
        .upsert({ tenant_id: tenantId, source_name: sourceName, name }, { onConflict: 'tenant_id,source_name,name' })
        .select()
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
}
