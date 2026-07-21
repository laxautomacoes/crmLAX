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
                contact:contacts(*),
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
    leadId: string | null,
    tenantId: string,
    proposalData: {
        value: number
        payment_terms: any
        status?: string
        contact_id?: string
        property_id?: string
        buyer_data?: any
        template_id?: string
        unit?: string
        create_lead?: boolean
    }
) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        // Verificar se já existe proposta para o lead
        let existing: any = null
        if (leadId) {
            const { data } = await supabase
                .from('proposals')
                .select('id')
                .eq('lead_id', leadId)
                .maybeSingle()
            existing = data
        }

        const payload = {
            value: proposalData.value,
            payment_terms: proposalData.payment_terms,
            status: proposalData.status || 'criada',
            contact_id: proposalData.contact_id || null,
            property_id: proposalData.property_id || null,
            buyer_data: proposalData.buyer_data || null,
            template_id: proposalData.template_id || null,
            unit: proposalData.unit || null,
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
                    lead_id: leadId || null,
                    tenant_id: tenantId,
                    created_by: profile.id,
                    created_at: payload.updated_at,
                    ...payload
                }])
                .select()
                .single()
        }

        if (result.error) throw result.error

        // Atualiza a etapa do lead para Negociação se o lead estiver em etapas anteriores (ex: Novo, Atendimento)
        if (result.data?.id && leadId) {
            // Busca o estágio atual do lead
            const { data: lead } = await supabase.from('leads').select('stage_id').eq('id', leadId).single()
            
            if (lead) {
                const { data: stages } = await supabase
                    .from('lead_stages')
                    .select('id, name, order_index')
                    .eq('tenant_id', tenantId)
                    .order('order_index', { ascending: true })
                
                if (stages && stages.length > 0) {
                    const currentStage = stages.find((s: any) => s.id === lead.stage_id)
                    const negociacaoStage = stages.find((s: any) => s.name.toLowerCase().includes('negocia'))
                    
                    // Só move se encontrou a Negociação e se o estágio atual é anterior à Negociação
                    if (negociacaoStage && currentStage && currentStage.order_index < negociacaoStage.order_index) {
                        await supabase
                            .from('leads')
                            .update({ stage_id: negociacaoStage.id })
                            .eq('id', leadId)
                    }
                }
            }
        }

        // --- MARCAÇÃO DE IMÓVEL (Em Proposta) ---
        if (proposalData.property_id) {
            if (proposalData.unit) {
                // Empreendimento: atualizar status da unidade no price_table
                const { data: propData } = await supabase.from('properties').select('details').eq('id', proposalData.property_id).single()
                if (propData && propData.details?.price_table) {
                    const priceTable = propData.details.price_table
                    const updatedPriceTable = priceTable.map((u: any) => {
                        if (u.unit === proposalData.unit) {
                            return { ...u, status: 'Em Proposta' }
                        }
                        return u
                    })
                    
                    await supabase
                        .from('properties')
                        .update({ 
                            details: { ...propData.details, price_table: updatedPriceTable } 
                        })
                        .eq('id', proposalData.property_id)
                }
            } else {
                // Imóvel Avulso: atualizar status direto
                await supabase
                    .from('properties')
                    .update({ status: 'Em Proposta' })
                    .eq('id', proposalData.property_id)
            }
        }

        // --- CRIAÇÃO DE LEAD (Se solicitado via NEW_PROPERTY sem lead_id) ---
        if (proposalData.create_lead && !leadId && proposalData.contact_id) {
            const { data: stages } = await supabase
                .from('lead_stages')
                .select('id, name')
                .eq('tenant_id', tenantId)
                .order('order_index', { ascending: true })
                
            const negociacaoStage = stages?.find((s: any) => s.name.toLowerCase().includes('negocia'))
            const stageId = negociacaoStage?.id || stages?.[0]?.id
            
            if (stageId) {
                const { data: newLead } = await supabase
                    .from('leads')
                    .insert([{
                        tenant_id: tenantId,
                        contact_id: proposalData.contact_id,
                        stage_id: stageId,
                        source: 'Proposta',
                        property_id: proposalData.property_id || null,
                        created_by: profile.id
                    }])
                    .select()
                    .single()
                    
                if (newLead && result.data?.id) {
                    // Atualiza a proposta recém criada para linkar ao novo lead
                    await supabase.from('proposals').update({ lead_id: newLead.id }).eq('id', result.data.id)
                }
            }
        }

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
    const directPropertyIds = [...new Set(proposals.map(p => p.property_id).filter(Boolean))]
    const leadIds = [...new Set(proposals.map(p => p.lead_id).filter(Boolean))]
    const unitNumbers = [...new Set(proposals.map(p => p.unit).filter(Boolean))]

    // Buscar leads primeiro para resolver property_id indiretamente
    const leadsRes = leadIds.length > 0
        ? await supabase.from('leads').select('id, property_interest, stage_id, property_id, properties(id, title, price, type, details)').in('id', leadIds)
        : { data: [] }

    // Coletar property IDs também via leads (fallback)
    const leadPropertyIds = [...new Set((leadsRes.data || []).map((l: any) => l.property_id).filter(Boolean))]
    const propertyIds = [...new Set([...directPropertyIds, ...leadPropertyIds])]

    // Buscar propriedades e unidades em paralelo
    const [contactsRes, propertiesRes, unitsRes] = await Promise.all([
        contactIds.length > 0
            ? supabase.from('contacts').select('*').in('id', contactIds)
            : { data: [] },
        propertyIds.length > 0
            ? supabase.from('properties').select('id, title, price, type, details').in('id', propertyIds)
            : { data: [] },
        (unitNumbers.length > 0 && propertyIds.length > 0)
            ? supabase.from('property_units').select('property_id, unit_number, valor_total, block_tower, garage_type, garage_number, hobby_box, hobby_box_number').in('property_id', propertyIds).in('unit_number', unitNumbers)
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

    // Mapeamento de unidades
    const unitMap = new Map((unitsRes.data || []).map((u: any) => [`${u.property_id}_${u.unit_number}`, u]))

    // Enriquecer cada proposta
    return proposals.map((p: any) => {
        const lead: any = leadMap.get(p.lead_id) || null;
        // Resolver property_id: direto na proposta, ou via lead
        const resolvedPropertyId = p.property_id || lead?.property_id || null;
        const property = propertyMap.get(resolvedPropertyId) || mapPropertyAddress(lead?.properties) || null;
        let propertyPrice = property?.price;
        let unitInfo: any = null;

        if (p.unit && resolvedPropertyId) {
            unitInfo = unitMap.get(`${resolvedPropertyId}_${p.unit}`) || null;
            if (unitInfo?.valor_total) {
                propertyPrice = unitInfo.valor_total;
            }
        }

        return {
            ...p,
            contact: contactMap.get(p.contact_id) || null,
            property: property ? { ...property, price: propertyPrice } : null,
            lead,
            unit_info: unitInfo
        }
    })
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

// ─── Buscar proposta mais recente de um lead específico ───
export async function getLatestProposalByLead(leadId: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('proposals')
            .select('*')
            .eq('lead_id', leadId)
            .order('updated_at', { ascending: false })
            .limit(1)

        if (error) throw error

        if (!data || data.length === 0) return { success: true, data: null }

        const enriched = await enrichProposals(supabase, data)
        return { success: true, data: enriched[0] }
    } catch (error: any) {
        console.error('[getLatestProposalByLead] ERROR:', error)
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
    mappedFields?: any,
    templateType: string = 'proposta'
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
                mapped_fields: mappedFields || [],
                template_type: templateType
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
    modelName: string,
    templateType: string = 'proposta'
) {
    try {
        const fields = await analyzeProposalPDF(pageImagesBase64, provider, modelName, templateType);
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
