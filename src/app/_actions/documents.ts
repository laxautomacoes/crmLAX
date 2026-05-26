'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getProfile } from './profile'

export async function getLeadDocuments(leadId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        const { data, error } = await supabase
            .from('lead_documents')
            .select('*')
            .eq('lead_id', leadId)
            .order('uploaded_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching lead documents:', error)
        return { success: false, error: error.message }
    }
}

export async function createLeadDocument(leadId: string, tenantId: string, docData: { name: string, file_path: string, type: string }) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        const { data, error } = await supabase
            .from('lead_documents')
            .insert([{
                lead_id: leadId,
                tenant_id: tenantId,
                name: docData.name,
                file_path: docData.file_path,
                type: docData.type,
                created_by: profile.id
            }])
            .select()
            .single()

        if (error) throw error

        revalidatePath(`/leads`)
        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating lead document:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteLeadDocument(docId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('lead_documents')
            .delete()
            .eq('id', docId)

        if (error) throw error

        revalidatePath(`/leads`)
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting lead document:', error)
        return { success: false, error: error.message }
    }
}

export async function updateLeadDocumentStatus(docId: string, status: 'aprovado' | 'rejeitado' | 'pendente_revisao') {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('lead_documents')
            .update({ status })
            .eq('id', docId)
            .select()
            .single()

        if (error) throw error

        revalidatePath(`/leads`)
        return { success: true, data }
    } catch (error: any) {
        console.error('Error updating lead document status:', error)
        return { success: false, error: error.message }
    }
}

/** Envia minuta de contrato para assinatura digital na DocuSign */
export async function sendToDocuSign(leadId: string, documentId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        // 1. Obter detalhes do documento
        const { data: doc, error: docError } = await supabase
            .from('lead_documents')
            .select('*')
            .eq('id', documentId)
            .single()

        if (docError || !doc) throw new Error('Documento não encontrado.')

        // 2. Obter detalhes do lead e contato do comprador
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*, contacts!leads_contact_id_fkey(name, email, phone)')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) throw new Error('Lead não encontrado.')

        // Simulação de chamada de API para a DocuSign (DocuSign API Connection)
        // Em produção, isso faria uma chamada POST para a API da DocuSign usando SDK/REST
        // e geraria o docusign_envelope_id correspondente
        const mockEnvelopeId = `docusign-env-${Math.random().toString(36).substr(2, 9)}`

        // Atualizar o documento com o ID do envelope do DocuSign
        const { error: updateError } = await supabase
            .from('lead_documents')
            .update({
                docusign_envelope_id: mockEnvelopeId,
                status: 'pendente_revisao' // Aguardando assinatura
            })
            .eq('id', documentId)

        if (updateError) throw updateError

        // Registrar uma interação no histórico do Lead informando o envio
        await supabase
            .from('interactions')
            .insert([{
                lead_id: leadId,
                type: 'system',
                content: `Contrato "${doc.name}" enviado para assinatura digital via DocuSign para o e-mail do cliente: ${lead.contacts?.email || 'não cadastrado'}.`
            }])

        revalidatePath(`/leads`)
        return { success: true, envelopeId: mockEnvelopeId }
    } catch (error: any) {
        console.error('Error sending to DocuSign:', error)
        return { success: false, error: error.message }
    }
}
