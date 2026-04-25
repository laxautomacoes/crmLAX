'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from '../profile'
import { getStages } from '../stages'

export async function getPipelineData(tenantId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

    const stagesResult = await getStages(tenantId)
    if (!stagesResult.success) {
        return { success: false, error: stagesResult.error }
    }

    // Deduplicar estágios por order_index
    const uniqueStagesMap = new Map()
    ;(stagesResult.data || []).forEach((stage: Record<string, any>) => {
        if (!uniqueStagesMap.has(stage.order_index)) {
            uniqueStagesMap.set(stage.order_index, stage)
        }
    })
    const stages = Array.from(uniqueStagesMap.values())

    let query = supabase
        .from('leads')
        .select(`
            *,
            contacts (
                name, phone, email, tags
            ),
            profiles:assigned_to (
                full_name
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)

    if (!isAdmin && profile?.id) {
        query = query.eq('assigned_to', profile.id)
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) {
        return { success: false, error: leadsError.message }
    }

    const formattedLeads = (leads || []).map((lead: any) => ({
        id: lead.id,
        name: lead.contacts?.name || 'Sem nome',
        phone: lead.contacts?.phone || '',
        email: lead.contacts?.email || '',
        tags: lead.contacts?.tags || [],
        status: lead.stage_id,
        notes: lead.notes,
        value: lead.value,
        interest: lead.property_interest || lead.source,
        property_interest: lead.property_interest,
        lead_source: lead.lead_source || 'Direto',
        campaign: lead.campaign,
        property_id: lead.property_id,
        date: (lead as any).date || (lead.created_at ? new Date(lead.created_at).toISOString().split('T')[0] : null),
        assigned_to: lead.assigned_to,
        broker_name: (lead as any).profiles?.full_name || 'Não atribuído',
        images: (lead as any).images || [],
        videos: (lead as any).videos || [],
        documents: (lead as any).documents || [],
        whatsapp_chat: (lead as any).whatsapp_chat || []
    }))

    return {
        success: true,
        data: { stages, leads: formattedLeads }
    }
}
