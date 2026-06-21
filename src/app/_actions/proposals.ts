'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getProfile } from './profile'
import { analyzeProposalPDF } from '@/lib/ai/proposal-analyzer'

// ─── Buscar proposta de um lead (com dados do cliente e imóvel) ───
export async function getProposal(leadId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        const { data, error } = await supabase
            .from('proposals')
            .select(`
                *,
                contact:contacts(id, name, phone, email, cpf, address_street, address_number, address_neighborhood, address_city, address_state, address_zip_code),
                property:properties(id, title, price, type, details)
            `)
            .eq('lead_id', leadId)
            .maybeSingle()

        if (error) throw error

        if (data && data.property) {
            const prop = data.property as any
            data.property = {
                ...prop,
                address_city: prop.details?.endereco?.cidade || null,
                address_state: prop.details?.endereco?.estado || null
            }
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching proposal:', error)
        return { success: false, error: error.message }
    }
}

// ─── Salvar/Atualizar proposta ───
export async function saveProposal(
    leadId: string,
    tenantId: string,
    proposalData: {
        value: number
        payment_terms: any
        status?: string
        contact_id?: string
        property_id?: string
        buyer_data?: any
        template_id?: string
    }
) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        // Verificar se já existe proposta para o lead
        const { data: existing } = await supabase
            .from('proposals')
            .select('id')
            .eq('lead_id', leadId)
            .maybeSingle()

        const payload = {
            value: proposalData.value,
            payment_terms: proposalData.payment_terms,
            status: proposalData.status || 'criada',
            contact_id: proposalData.contact_id || null,
            property_id: proposalData.property_id || null,
            buyer_data: proposalData.buyer_data || null,
            template_id: proposalData.template_id || null,
            updated_at: new Date().toISOString()
        }

        let result

        if (existing?.id) {
            result = await supabase
                .from('proposals')
                .update(payload)
                .eq('id', existing.id)
                .select()
                .single()
        } else {
            result = await supabase
                .from('proposals')
                .insert([{
                    lead_id: leadId,
                    tenant_id: tenantId,
                    created_by: profile.id,
                    ...payload
                }])
                .select()
                .single()
        }

        if (result.error) throw result.error

        revalidatePath('/leads')
        revalidatePath('/proposals')
        revalidatePath('/clients')
        return { success: true, data: result.data }
    } catch (error: any) {
        console.error('Error saving proposal:', error)
        return { success: false, error: error.message }
    }
}
// ─── Helper: enriquecer propostas com dados relacionados ───
async function enrichProposals(supabase: any, proposals: any[]) {
    if (!proposals || proposals.length === 0) return proposals

    // Coletar IDs únicos
    const contactIds = [...new Set(proposals.map(p => p.contact_id).filter(Boolean))]
    const propertyIds = [...new Set(proposals.map(p => p.property_id).filter(Boolean))]
    const leadIds = [...new Set(proposals.map(p => p.lead_id).filter(Boolean))]

    // Buscar dados relacionados em paralelo (sem sub-relações)
    const [contactsRes, propertiesRes, leadsRes] = await Promise.all([
        contactIds.length > 0
            ? supabase.from('contacts').select('id, name, phone, email, cpf').in('id', contactIds)
            : { data: [] },
        propertyIds.length > 0
            ? supabase.from('properties').select('id, title, price, type, details').in('id', propertyIds)
            : { data: [] },
        leadIds.length > 0
            ? supabase.from('leads').select('id, property_interest, stage_id, property_id, properties(id, title, price, type, details)').in('id', leadIds)
            : { data: [] }
    ])

    // Buscar lead_stages separadamente
    const stageIds = [...new Set((leadsRes.data || []).map((l: any) => l.stage_id).filter(Boolean))]
    let stageMap = new Map()
    if (stageIds.length > 0) {
        const { data: stages } = await supabase
            .from('lead_stages')
            .select('id, name, color')
            .in('id', stageIds)
        if (stages) {
            stageMap = new Map(stages.map((s: any) => [s.id, s]))
        }
    }

    // Processar e mapear endereços de properties
    const mapPropertyAddress = (prop: any) => {
        if (!prop) return null
        return {
            ...prop,
            address_city: prop.details?.endereco?.cidade || null,
            address_state: prop.details?.endereco?.estado || null
        }
    }

    const processedProperties = (propertiesRes.data || []).map(mapPropertyAddress)
    const processedLeads = (leadsRes.data || []).map((l: any) => {
        const stage = stageMap.get(l.stage_id)
        const rawProp = l.properties
        return {
            ...l,
            properties: mapPropertyAddress(rawProp),
            lead_stages: stage || null
        }
    })

    // Criar maps para lookup rápido
    const contactMap = new Map((contactsRes.data || []).map((c: any) => [c.id, c]))
    const propertyMap = new Map(processedProperties.map((p: any) => [p.id, p]))
    const leadMap = new Map(processedLeads.map((l: any) => [l.id, l]))

    // Enriquecer cada proposta
    return proposals.map((p: any) => ({
        ...p,
        contact: contactMap.get(p.contact_id) || null,
        property: propertyMap.get(p.property_id) || null,
        lead: leadMap.get(p.lead_id) || null
    }))
}

// ─── Buscar todas as propostas do tenant (página centralizada) ───
export async function getAllProposals(tenantId: string, includeArchived = false) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        let query = supabase
            .from('proposals')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('updated_at', { ascending: false })

        if (!includeArchived) {
            query = query.eq('is_archived', false)
        }

        const { data, error } = await query

        if (error) throw error

        const enriched = await enrichProposals(supabase, data || [])
        return { success: true, data: enriched }
    } catch (error: any) {
        console.error('[getAllProposals] ERROR:', error)
        return { success: false, error: error.message }
    }
}

// ─── Buscar propostas de um cliente específico ───
export async function getProposalsByContact(contactId: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('proposals')
            .select('*')
            .eq('contact_id', contactId)
            .order('updated_at', { ascending: false })

        if (error) throw error

        const enriched = await enrichProposals(supabase, data || [])
        return { success: true, data: enriched }
    } catch (error: any) {
        console.error('[getProposalsByContact] ERROR:', error)
        return { success: false, error: error.message }
    }
}

// ─── Atualizar status da proposta ───
export async function updateProposalStatus(proposalId: string, status: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('proposals')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', proposalId)

        if (error) throw error

        revalidatePath('/proposals')
        revalidatePath('/leads')
        revalidatePath('/clients')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating proposal status:', error)
        return { success: false, error: error.message }
    }
}

// ─── Arquivar/Desarquivar proposta ───
export async function archiveProposal(proposalId: string) {
    const supabase = await createClient()

    try {
        const { data: proposal } = await supabase
            .from('proposals')
            .select('is_archived')
            .eq('id', proposalId)
            .single()

        const newState = !(proposal?.is_archived ?? false)

        const { error } = await supabase
            .from('proposals')
            .update({ is_archived: newState, updated_at: new Date().toISOString() })
            .eq('id', proposalId)

        if (error) throw error

        revalidatePath('/proposals')
        revalidatePath('/leads')
        revalidatePath('/clients')
        return { success: true, archived: newState }
    } catch (error: any) {
        console.error('Error archiving proposal:', error)
        return { success: false, error: error.message }
    }
}

// ─── Excluir proposta permanentemente ───
export async function deleteProposal(proposalId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('proposals')
            .delete()
            .eq('id', proposalId)

        if (error) throw error

        revalidatePath('/proposals')
        revalidatePath('/leads')
        revalidatePath('/clients')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting proposal:', error)
        return { success: false, error: error.message }
    }
}

// ─── Templates de Proposta ───
export async function getProposalTemplates(tenantId: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('proposal_templates')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching proposal templates:', error)
        return { success: false, error: error.message }
    }
}

export async function createProposalTemplate(
    tenantId: string, 
    name: string, 
    filePath: string,
    aiProvider?: string,
    aiModel?: string,
    mappedFields?: any
) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        const { data, error } = await supabase
            .from('proposal_templates')
            .insert([{
                tenant_id: tenantId,
                name,
                file_path: filePath,
                created_by: profile.id,
                ai_provider: aiProvider || 'gemini',
                ai_model: aiModel || 'gemini-2.5-flash',
                mapped_fields: mappedFields || []
            }])
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating proposal template:', error)
        return { success: false, error: error.message }
    }
}

export async function analyzeProposalTemplatePDF(
    pageImagesBase64: string[],
    provider: 'gemini' | 'openai',
    modelName: string
) {
    try {
        const fields = await analyzeProposalPDF(pageImagesBase64, provider, modelName);
        return { success: true, data: fields };
    } catch (error: any) {
        console.error('Erro na action analyzeProposalTemplatePDF:', error);
        return { success: false, error: error.message || 'Falha ao analisar o PDF.' };
    }
}

export async function deleteProposalTemplate(templateId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('proposal_templates')
            .delete()
            .eq('id', templateId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting proposal template:', error)
        return { success: false, error: error.message }
    }
}
