'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cleanPhone } from '@/lib/utils/phone'

export interface ClientData {
    id?: string
    name: string
    phone: string
    email: string
    interest?: string
    value?: number
    notes?: string
    tags?: string[]
}

export async function getClients(tenantId: string) {
    const supabase = await createClient()

    // Buscar contatos
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select(`
      *,
      leads (
        id,
        status,
        source,
        interactions (
            content,
            type,
            created_at
        )
      )
    `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching clients:', error)
        return { success: false, error: error.message }
    }

    // Mapear para o formato esperado pelo front
    const clients = contacts.map(contact => {
        // Pegar o lead mais recente ou ativo
        const activeLead = contact.leads?.[0]
        // Pegar a última nota/mensagem
        const lastInteraction = activeLead?.interactions?.[0]?.content

        return {
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            created_at: contact.created_at,
            interest: activeLead?.source || 'N/A', // Usando source como interesse temporariamente se não houver asset linkado
            value: 0, // Implementar lógica de valor baseada em assets depois
            notes: lastInteraction || '',
            tags: contact.tags || [],
            leads: contact.leads
        }
    })

    return { success: true, data: clients }
}

export async function createNewClient(tenantId: string, data: ClientData) {
    const supabase = await createClient()

    // 1. Criar Contato
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
            tenant_id: tenantId,
            name: data.name,
            phone: cleanPhone(data.phone),
            email: data.email,
            tags: data.tags
        })
        .select()
        .single()

    if (contactError) {
        return { success: false, error: contactError.message }
    }

    // 2. Opcional: Criar Lead inicial se houver interesse
    if (data.interest) {
        const { error: leadError } = await supabase
            .from('leads')
            .insert({
                tenant_id: tenantId,
                contact_id: contact.id,
                source: 'Manual',
                details: { interest: data.interest, value: data.value } // Salvando em details jsonb por enquanto
            })

        if (leadError) console.error('Error creating lead:', leadError)
    }

    revalidatePath('/clients')
    return { success: true, data: contact }
}

export async function updateClient(clientId: string, data: Partial<ClientData>) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('contacts')
        .update({
            name: data.name,
            phone: data.phone ? cleanPhone(data.phone) : undefined,
            email: data.email,
            tags: data.tags
        })
        .eq('id', clientId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/clients')
    return { success: true }
}

export async function deleteClient(clientId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', clientId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/clients')
    return { success: true }
}
