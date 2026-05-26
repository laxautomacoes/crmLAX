'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getProfile } from './profile'

export async function getProposal(leadId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        const { data, error } = await supabase
            .from('proposals')
            .select('*')
            .eq('lead_id', leadId)
            .maybeSingle()

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching proposal:', error)
        return { success: false, error: error.message }
    }
}

export async function saveProposal(leadId: string, tenantId: string, proposalData: { value: number, buyer_data: any, payment_terms: any, status?: string }) {
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

        let result;

        if (existing?.id) {
            result = await supabase
                .from('proposals')
                .update({
                    value: proposalData.value,
                    buyer_data: proposalData.buyer_data,
                    payment_terms: proposalData.payment_terms,
                    status: proposalData.status || 'rascunho',
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single()
        } else {
            result = await supabase
                .from('proposals')
                .insert([{
                    lead_id: leadId,
                    tenant_id: tenantId,
                    value: proposalData.value,
                    buyer_data: proposalData.buyer_data,
                    payment_terms: proposalData.payment_terms,
                    status: proposalData.status || 'rascunho',
                    created_by: profile.id
                }])
                .select()
                .single()
        }

        if (result.error) throw result.error

        revalidatePath(`/leads`)
        return { success: true, data: result.data }
    } catch (error: any) {
        console.error('Error saving proposal:', error)
        return { success: false, error: error.message }
    }
}

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

export async function createProposalTemplate(tenantId: string, name: string, filePath: string) {
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
                created_by: profile.id
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
