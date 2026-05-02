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
    contact_type?: string[]
    property_regime?: string
    spouse_name?: string
    spouse_email?: string
    spouse_phone?: string
    spouse_cpf?: string
    spouse_birth_date?: string
    images?: string[]
    videos?: string[]
    documents?: { name: string, url: string }[]
}

export async function getClients(tenantId: string, includeArchived = false) {
    const supabase = await createClient()

    // Verificar role do usuário para filtrar por atribuição
    const { data: { user } } = await supabase.auth.getUser()
    let isAdmin = false
    let userId: string | undefined

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', user.id)
            .single()

        if (profile) {
            isAdmin = profile.role === 'admin' || profile.role === 'superadmin'
            userId = profile.id
        }
    }

    // Buscar contatos
    let query = supabase
        .from('contacts')
        .select(`
      *,
      leads (
        * ,
        profiles:assigned_to (
            full_name
        ),
        properties (
            title
        ),
        lead_stages (
            name,
            color
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

    if (!includeArchived) {
        query = query.eq('is_archived', false)
    }

    const { data: contacts, error } = await query

    if (error) {
        console.error('Error fetching clients:', error)
        return { success: false, error: error.message }
    }

    // Mapear para o formato esperado pelo front
    let clients = (contacts || []).map((contact: Record<string, any>) => {
        // Pegar o lead mais recente ou ativo
        const activeLead = (contact.leads as any[])?.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        
        // Pegar a última nota/mensagem
        const lastInteraction = activeLead?.interactions?.[0]?.content

        // Interesse prioritário: property_interest (texto livre), depois Property linkado, depois source
        const interest = activeLead?.property_interest || activeLead?.properties?.title || activeLead?.source || 'N/A'

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
            contact_type: contact.contact_type || [],
            property_regime: contact.property_regime,
            spouse_name: contact.spouse_name,
            spouse_email: contact.spouse_email,
            spouse_phone: contact.spouse_phone,
            spouse_cpf: contact.spouse_cpf,
            spouse_birth_date: contact.spouse_birth_date,
            created_at: contact.created_at,
            is_archived: contact.is_archived || false,
            interest,
            value: 0, // Implementar lógica de valor baseada em properties depois
            notes: contact.notes || lastInteraction || '',
            tags: contact.tags || [],
            images: contact.images || [],
            videos: contact.videos || [],
            documents: contact.documents || [],
            broker_name: (activeLead as any)?.profiles?.full_name || 'Não atribuído',
            assigned_to: activeLead?.assigned_to,
            leads: ((contact.leads as any[]) || [])
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((l) => ({
                ...l,
                status_name: l.lead_stages?.name || l.status,
                status_color: l.lead_stages?.color || null
            }))
        }
    })

    // Filtrar por colaborador: apenas clientes com leads atribuídos ao usuário
    if (!isAdmin && userId) {
        clients = clients.filter((client: any) => 
            client.leads.some((lead: any) => lead.assigned_to === userId)
        )
    }

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
            contact_type: data.contact_type || [],
            property_regime: data.property_regime,
            spouse_name: data.spouse_name,
            spouse_email: data.spouse_email,
            spouse_phone: data.spouse_phone ? cleanPhone(data.spouse_phone) : null,
            spouse_cpf: data.spouse_cpf,
            spouse_birth_date: data.spouse_birth_date || null,
            notes: data.notes,
            images: data.images || [],
            videos: data.videos || [],
            documents: data.documents || []
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
                details: { interest: data.interest, value: data.value }, // Salvando em details jsonb por enquanto
                notes: data.notes,
                images: data.images || [],
                videos: data.videos || [],
                documents: data.documents || []
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
            contact_type: data.contact_type || [],
            property_regime: data.property_regime,
            spouse_name: data.spouse_name,
            spouse_email: data.spouse_email,
            spouse_phone: data.spouse_phone ? cleanPhone(data.spouse_phone) : null,
            spouse_cpf: data.spouse_cpf,
            spouse_birth_date: data.spouse_birth_date || null,
            notes: data.notes,
            images: data.images,
            videos: data.videos,
            documents: data.documents
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

    if (error) return { success: false, error: error.message }

    revalidatePath('/clients')
    return { success: true }
}

export async function archiveClient(clientId: string) {
    const supabase = await createClient()

    // Verificar estado atual do contato
    const { data: contact } = await supabase
        .from('contacts')
        .select('is_archived')
        .eq('id', clientId)
        .single()

    const newState = !(contact?.is_archived ?? false)

    // Toggle o contato
    const { error } = await supabase
        .from('contacts')
        .update({ is_archived: newState })
        .eq('id', clientId)

    if (error) return { success: false, error: error.message }

    // Toggle todos os leads vinculados
    await supabase
        .from('leads')
        .update({ is_archived: newState })
        .eq('contact_id', clientId)

    revalidatePath('/clients')
    revalidatePath('/leads')
    return { success: true, archived: newState }
}
