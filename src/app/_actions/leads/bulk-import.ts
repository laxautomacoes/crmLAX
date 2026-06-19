'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cleanPhone } from '@/lib/utils/phone'
import { createLog } from '@/lib/utils/logging'
import { notificationService } from '@/services/notification-service'
import { getNextBrokerForDistribution } from './distribution'

interface BulkLeadInput {
    name: string
    phone: string
    email?: string
    notes?: string
    assigned_to?: string
    stage_id?: string
    lead_source?: string
    campaign?: string
}

export async function createLeadsBulk(tenantId: string, leads: BulkLeadInput[]) {
    if (!tenantId || !Array.isArray(leads) || leads.length === 0) {
        return { success: false, error: 'Dados inválidos ou lista de leads vazia.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const results = {
        successCount: 0,
        failCount: 0,
        errors: [] as string[],
        importedLeads: [] as any[]
    }

    // Processar os leads sequencialmente para garantir que o Round Robin distribua corretamente
    for (const lead of leads) {
        try {
            if (!lead.name || !lead.phone) {
                results.failCount++
                results.errors.push(`Lead sem nome ou telefone obrigatório.`)
                continue
            }

            const cleanedPhone = cleanPhone(lead.phone)
            if (!cleanedPhone) {
                results.failCount++
                results.errors.push(`Lead "${lead.name}" possui telefone inválido.`)
                continue
            }

            // 1. Criar/Atualizar contato
            const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .upsert(
                    {
                        tenant_id: tenantId,
                        name: lead.name,
                        phone: cleanedPhone,
                        email: lead.email || null,
                        tags: ['Importado em Massa']
                    },
                    { onConflict: 'tenant_id,phone' }
                )
                .select('id, name, phone, email')
                .single()

            if (contactError) {
                results.failCount++
                results.errors.push(`Erro ao salvar contato do lead "${lead.name}": ${contactError.message}`)
                continue
            }

            // 2. Distribuição automática (Round Robin) se não atribuído
            let assignedTo = lead.assigned_to
            if (!assignedTo) {
                const brokerRes = await getNextBrokerForDistribution(tenantId)
                if (brokerRes.success && brokerRes.data) {
                    assignedTo = brokerRes.data.id
                } else {
                    assignedTo = user?.id || ''
                }
            }

            // 3. Inserir lead
            const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .insert({
                    tenant_id: tenantId,
                    contact_id: contact.id,
                    stage_id: lead.stage_id || null,
                    notes: lead.notes || null,
                    value: 0,
                    source: lead.lead_source || 'Importação em Massa',
                    lead_source: lead.lead_source || 'Importação em Massa',
                    campaign: lead.campaign || null,
                    date: new Date().toISOString().split('T')[0],
                    assigned_to: assignedTo || null
                })
                .select(`
                    id,
                    tenant_id,
                    contact_id,
                    assigned_to,
                    contact:contacts(id, name, phone, email)
                `)
                .single()

            if (leadError) {
                results.failCount++
                results.errors.push(`Erro ao inserir lead "${lead.name}": ${leadError.message}`)
                continue
            }

            // 4. Notificar corretor se atribuído
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
                        title: 'Novo Lead Importado e Atribuído',
                        message: `Um novo lead importado em massa foi atribuído a você: ${lead.name}.`,
                        type: 'new_lead',
                        metadata: { name: lead.name },
                        send_whatsapp: true,
                        whatsapp_number: broker?.whatsapp_number
                    })

                    // Atualizar timestamp de distribuição do corretor
                    await supabase
                        .from('profiles')
                        .update({ last_lead_assigned_at: new Date().toISOString() })
                        .eq('id', assignedTo)
                } catch (notifError) {
                    console.error('Erro ao notificar corretor no bulk-import:', notifError)
                }
            }

            await createLog({ 
                action: 'create_lead', 
                entityType: 'lead', 
                details: { name: lead.name, phone: lead.phone, import_type: 'bulk' } 
            })

            results.successCount++
            results.importedLeads.push(leadData)

        } catch (err: any) {
            results.failCount++
            results.errors.push(`Erro inesperado no lead "${lead.name}": ${err.message || err}`)
        }
    }

    revalidatePath('/leads')
    return { 
        success: results.successCount > 0, 
        data: {
            successCount: results.successCount,
            failCount: results.failCount,
            errors: results.errors
        }
    }
}
