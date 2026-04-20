'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cleanPhone } from '@/lib/utils/phone'
import { createLog } from '@/lib/utils/logging'
import { updateLeadSchema, validateInput } from '@/lib/validations/schemas'
import { getProfile } from '../profile'

export async function updateLeadStage(leadId: string, stageId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile?.tenant_id) return { success: false, error: 'Tenant não identificado' }

    const { error } = await supabase
        .from('leads')
        .update({ stage_id: stageId || null })
        .eq('id', leadId)
        .eq('tenant_id', profile.tenant_id)

    if (error) return { success: false, error: error.message }

    await createLog({ action: 'update_lead_stage', entityType: 'lead', entityId: leadId, details: { stage_id: stageId || null } })

    revalidatePath('/leads')
    return { success: true }
}

export async function updateLead(tenantId: string, leadId: string, data: unknown) {
    const validated = validateInput(updateLeadSchema, data)
    if (validated.error) return { success: false, error: validated.error }
    const input = validated.data

    const supabase = await createClient()

    // 1. Buscar lead para contact_id
    const { data: lead } = await supabase
        .from('leads')
        .select('contact_id')
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .single()

    if (!lead) return { success: false, error: 'Lead não encontrado' }

    // 2. Atualizar contato (apenas campos presentes)
    const contactUpdate: Record<string, unknown> = {}
    if (input.name !== undefined) contactUpdate.name = input.name
    if (input.phone !== undefined) contactUpdate.phone = cleanPhone(input.phone)
    if (input.email !== undefined) contactUpdate.email = input.email
    if (input.tags !== undefined) contactUpdate.tags = input.tags
    if (input.cpf !== undefined) contactUpdate.cpf = input.cpf
    if (input.address_street !== undefined) contactUpdate.address_street = input.address_street
    if (input.address_number !== undefined) contactUpdate.address_number = input.address_number
    if (input.address_complement !== undefined) contactUpdate.address_complement = input.address_complement
    if (input.address_neighborhood !== undefined) contactUpdate.address_neighborhood = input.address_neighborhood
    if (input.address_city !== undefined) contactUpdate.address_city = input.address_city
    if (input.address_state !== undefined) contactUpdate.address_state = input.address_state
    if (input.address_zip_code !== undefined) contactUpdate.address_zip_code = input.address_zip_code
    if (input.marital_status !== undefined) contactUpdate.marital_status = input.marital_status
    if (input.birth_date !== undefined) contactUpdate.birth_date = input.birth_date || null
    if (input.primary_interest !== undefined) contactUpdate.primary_interest = input.primary_interest

    if (Object.keys(contactUpdate).length > 0) {
        const { error: contactError } = await supabase.from('contacts').update(contactUpdate).eq('id', lead.contact_id)
        if (contactError) return { success: false, error: contactError.message }
    }

    // 3. Atualizar lead
    const { error: leadError } = await supabase
        .from('leads')
        .update({
            stage_id: input.stage_id || null,
            notes: input.notes,
            value: input.value,
            source: input.interest,
            lead_source: input.lead_source,
            campaign: input.campaign || null,
            property_id: input.property_id || null,
            date: input.date || null,
            assigned_to: input.assigned_to,
            images: input.images,
            videos: input.videos,
            documents: input.documents
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantId)

    if (leadError) return { success: false, error: leadError.message }

    await createLog({ action: 'update_lead', entityType: 'lead', entityId: leadId, details: { name: input.name } })

    revalidatePath('/leads')
    return { success: true }
}
