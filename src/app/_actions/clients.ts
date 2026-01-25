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
    cpf?: string
    address_street?: string
    address_number?: string
    address_complement?: string
    address_neighborhood?: string
    address_city?: string
    address_state?: string
    address_zip_code?: string
    marital_status?: string
    birth_date?: string
    primary_interest?: string
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
        stage_id,
        created_at,
        source,
        asset_id,
        assigned_to,
        profiles:assigned_to (
            full_name
        ),
        assets (
            title
        ),
        lead_stages (
            name
        ),
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
    const clients = (contacts as any[])?.map((contact) => {
        // Pegar o lead mais recente ou ativo
        const activeLead = (contact.leads as any[])?.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        
        // Pegar a última nota/mensagem
        const lastInteraction = activeLead?.interactions?.[0]?.content

        // Interesse prioritário: Asset linkado, depois source
        const interest = activeLead?.assets?.title || activeLead?.source || 'N/A'

        return {
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            cpf: contact.cpf,
            address_street: contact.address_street,
            address_number: contact.address_number,
            address_complement: contact.address_complement,
            address_neighborhood: contact.address_neighborhood,
            address_city: contact.address_city,
            address_state: contact.address_state,
            address_zip_code: contact.address_zip_code,
            marital_status: contact.marital_status,
            birth_date: contact.birth_date,
            primary_interest: contact.primary_interest,
            created_at: contact.created_at,
            interest,
            value: 0, // Implementar lógica de valor baseada em assets depois
            notes: lastInteraction || '',
            tags: contact.tags || [],
            broker_name: activeLead?.profiles?.full_name || 'Não atribuído',
            assigned_to: activeLead?.assigned_to,
            leads: (contact.leads as any[])?.map((l) => ({
                ...l,
                status_name: l.lead_stages?.name || l.status
            }))
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
            tags: data.tags,
            cpf: data.cpf,
            address_street: data.address_street,
            address_number: data.address_number,
            address_complement: data.address_complement,
            address_neighborhood: data.address_neighborhood,
            address_city: data.address_city,
            address_state: data.address_state,
            address_zip_code: data.address_zip_code,
            marital_status: data.marital_status,
            birth_date: data.birth_date || null,
            primary_interest: data.primary_interest
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
            tags: data.tags,
            cpf: data.cpf,
            address_street: data.address_street,
            address_number: data.address_number,
            address_complement: data.address_complement,
            address_neighborhood: data.address_neighborhood,
            address_city: data.address_city,
            address_state: data.address_state,
            address_zip_code: data.address_zip_code,
            marital_status: data.marital_status,
            birth_date: data.birth_date || null,
            primary_interest: data.primary_interest
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
