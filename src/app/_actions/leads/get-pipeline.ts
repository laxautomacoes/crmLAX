'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from '../profile'
import { getStages } from '../stages'
import type { Lead } from '@/components/dashboard/leads/PipelineBoard'

interface StageRecord {
    id: string
    name: string
    order_index: number
    color?: string
}

interface ContactRecord {
    name?: string | null
    phone?: string | null
    email?: string | null
    tags?: string[] | null
}

interface AssignedProfileRecord {
    full_name?: string | null
}

interface LeadRecord {
    id: string
    contacts?: ContactRecord | null
    stage_id: string
    notes?: string | null
    value?: number | null
    property_interest?: string | null
    source?: string | null
    lead_source?: string | null
    campaign?: string | null
    property_id?: string | null
    created_at?: string | null
    assigned_to?: string | null
    profiles?: AssignedProfileRecord | null
    images?: string[] | null
    videos?: string[] | null
    documents?: { name: string; url: string }[] | null
    whatsapp_chat?: Array<{ fromMe?: boolean; message?: string; text?: string }> | null
    date?: string | null
}

type PipelineLead = Lead & {
    property_interest?: string
    lead_source?: string
    campaign?: string
    property_id?: string
    date?: string | null
}

export async function getPipelineData(tenantId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

    const stagesResult = await getStages(tenantId)
    if (!stagesResult.success) {
        return { success: false, error: stagesResult.error }
    }

    // Deduplicar estágios por order_index
    const uniqueStagesMap = new Map<number, StageRecord>()
    ;((stagesResult.data || []) as StageRecord[]).forEach((stage) => {
        if (!uniqueStagesMap.has(stage.order_index)) {
            uniqueStagesMap.set(stage.order_index, stage)
        }
    })
    const stages = Array.from(uniqueStagesMap.values()) as StageRecord[]

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

    const formattedLeads = ((leads || []) as LeadRecord[]).map((lead) => ({
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
        date: lead.date || (lead.created_at ? new Date(lead.created_at).toISOString().split('T')[0] : null),
        assigned_to: lead.assigned_to,
        broker_name: lead.profiles?.full_name || 'Não atribuído',
        images: lead.images || [],
        videos: lead.videos || [],
        documents: lead.documents || [],
        whatsapp_chat: lead.whatsapp_chat || []
    })) as PipelineLead[]

    return {
        success: true,
        data: { stages, leads: formattedLeads }
    }
}
