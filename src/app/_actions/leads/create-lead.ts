'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cleanPhone } from '@/lib/utils/phone'
import { getProfile } from '../profile'
import { createLog } from '@/lib/utils/logging'
import { notificationService } from '@/services/notification-service'
import { createLeadSchema, validateInput } from '@/lib/validations/schemas'
import { getNextBrokerForDistribution } from './distribution'

export async function createLead(tenantId: string, data: unknown) {
    const validated = validateInput(createLeadSchema, data)
    if (validated.error) return { success: false, error: validated.error }
    const input = validated.data

    const supabase = await createClient()

    // 1. Criar/Atualizar contato
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .upsert(
            {
                tenant_id: tenantId,
                name: input.name,
                phone: cleanPhone(input.phone),
                email: input.email,
                tags: input.tags || [],
                cpf: input.cpf,
                address_street: input.address_street,
                address_number: input.address_number,
                address_complement: input.address_complement,
                address_neighborhood: input.address_neighborhood,
                address_city: input.address_city,
                address_state: input.address_state,
                address_zip_code: input.address_zip_code,
                marital_status: input.marital_status,
                birth_date: input.birth_date || null,
                primary_interest: input.primary_interest
            },
            { onConflict: 'tenant_id,phone' }
        )
        .select('id')
        .single()

    if (contactError) return { success: false, error: contactError.message }

    // 2. Distribuição automática (Round Robin)
    const { data: { user } } = await supabase.auth.getUser()
    let assignedTo = input.assigned_to
    if (!assignedTo) {
        const brokerRes = await getNextBrokerForDistribution(tenantId)
        if (brokerRes.success && brokerRes.data) {
            assignedTo = brokerRes.data.id
        } else {
            assignedTo = user?.id
        }
    }

    // 3. Inserir lead
    const { error: leadError } = await supabase
        .from('leads')
        .insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            stage_id: input.stage_id || null,
            notes: input.notes,
            value: input.value,
            source: input.interest || 'Direto',
            lead_source: input.lead_source || 'Direto',
            campaign: input.campaign || null,
            asset_id: input.asset_id || null,
            date: input.date || new Date().toISOString().split('T')[0],
            assigned_to: assignedTo,
            images: input.images || [],
            videos: input.videos || [],
            documents: input.documents || []
        })

    if (leadError) return { success: false, error: leadError.message }

    // 4. Notificar corretor
    if (assignedTo) {
        try {
            const { data: broker } = await supabase
                .from('profiles')
                .select('whatsapp_number')
                .eq('id', assignedTo)
                .single()

            await notificationService.create({
                user_id: assignedTo,
                tenant_id: tenantId,
                title: 'Novo Lead Atribuído',
                message: `Um novo lead foi atribuído a você: ${input.name}.`,
                type: 'new_lead',
                metadata: { name: input.name },
                send_whatsapp: true,
                whatsapp_number: broker?.whatsapp_number
            })
        } catch (notifError) {
            console.error('Erro ao notificar corretor:', notifError)
        }
    }

    await createLog({ action: 'create_lead', entityType: 'lead', details: { name: input.name, phone: input.phone } })

    // Atualizar timestamp de distribuição
    if (assignedTo) {
        await supabase.from('profiles').update({ last_lead_assigned_at: new Date().toISOString() }).eq('id', assignedTo)
    }

    revalidatePath('/leads')
    return { success: true }
}
