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
    com_address_street?: string
    com_address_number?: string
    com_address_complement?: string
    com_address_neighborhood?: string
    com_address_city?: string
    com_address_state?: string
    com_address_zip_code?: string
    com_address_same?: boolean
    marital_status?: string
    birth_date?: string
    contact_type?: string[]
    property_regime?: string
    spouse_name?: string
    spouse_email?: string
    spouse_phone?: string
    spouse_cpf?: string
    spouse_birth_date?: string
    marriage_date?: string
    spouse_instagram?: string
    spouse_linkedin?: string
    spouse_rg_cnh?: string
    spouse_rg_cnh_date?: string
    spouse_issuing_agency?: string
    spouse_profession?: string
    spouse_naturalness?: string
    spouse_nationality?: string
    spouse_favorite_team?: string
    spouse_marital_status?: string
    spouse_property_regime?: string
    spouse_marriage_date?: string
    spouse_father_name?: string
    spouse_mother_name?: string
    rg_cnh?: string
    rg_cnh_date?: string
    issuing_agency?: string
    profession?: string
    naturalness?: string
    nationality?: string
    father_name?: string
    mother_name?: string
    instagram?: string
    linkedin?: string
    favorite_team?: string
    images?: string[]
    videos?: string[]
    documents?: { name: string, url: string }[]
}

export async function getClientById(contactId: string) {
    const supabase = await createClient()

    const { data: contact, error } = await supabase
        .from('contacts')
        .select(`
            *,
            leads (
                *,
                profiles:assigned_to ( full_name ),
                properties ( id, title, price, type, details ),
                lead_stages ( name, color ),
                interactions ( content, type, created_at ),
                proposals ( id )
            )
        `)
        .eq('id', contactId)
        .single()

    if (error || !contact) {
        return { success: false, error: error?.message || 'Cliente não encontrado' }
    }

    const activeLead = (contact.leads as any[])?.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    const interest = activeLead?.property_interest || activeLead?.properties?.title || activeLead?.source || 'N/A'

    const client = {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        avatar_url: contact.avatar_url,
        cpf: contact.cpf,
        address_street: contact.address_street,
        address_number: contact.address_number,
        address_complement: contact.address_complement,
        address_neighborhood: contact.address_neighborhood,
        address_city: contact.address_city,
        address_state: contact.address_state,
        address_zip_code: contact.address_zip_code,
        com_address_street: contact.com_address_street,
        com_address_number: contact.com_address_number,
        com_address_complement: contact.com_address_complement,
        com_address_neighborhood: contact.com_address_neighborhood,
        com_address_city: contact.com_address_city,
        com_address_state: contact.com_address_state,
        com_address_zip_code: contact.com_address_zip_code,
        com_address_same: contact.com_address_same || false,
        marital_status: contact.marital_status,
        birth_date: contact.birth_date,
        contact_type: contact.contact_type || [],
        property_regime: contact.property_regime,
        spouse_name: contact.spouse_name,
        spouse_email: contact.spouse_email,
        spouse_phone: contact.spouse_phone,
        spouse_cpf: contact.spouse_cpf,
        spouse_birth_date: contact.spouse_birth_date,
        spouse_instagram: contact.spouse_instagram,
        spouse_linkedin: contact.spouse_linkedin,
        spouse_rg_cnh: contact.spouse_rg_cnh,
        spouse_rg_cnh_date: contact.spouse_rg_cnh_date,
        spouse_issuing_agency: contact.spouse_issuing_agency,
        spouse_profession: contact.spouse_profession,
        spouse_naturalness: contact.spouse_naturalness,
        spouse_nationality: contact.spouse_nationality,
        spouse_favorite_team: contact.spouse_favorite_team,
        spouse_marital_status: contact.spouse_marital_status,
        spouse_property_regime: contact.spouse_property_regime,
        spouse_marriage_date: contact.spouse_marriage_date,
        spouse_father_name: contact.spouse_father_name,
        spouse_mother_name: contact.spouse_mother_name,
        marriage_date: contact.marriage_date,
        rg_cnh: contact.rg_cnh,
        rg_cnh_date: contact.rg_cnh_date,
        issuing_agency: contact.issuing_agency,
        profession: contact.profession,
        naturalness: contact.naturalness,
        nationality: contact.nationality,
        father_name: contact.father_name,
        mother_name: contact.mother_name,
        instagram: contact.instagram,
        linkedin: contact.linkedin,
        favorite_team: contact.favorite_team,
        created_at: contact.created_at,
        is_archived: contact.is_archived || false,
        interest,
        value: 0,
        notes: contact.notes || '',
        tags: contact.tags || [],
        images: contact.images || [],
        videos: contact.videos || [],
        documents: contact.documents || [],
        broker_name: activeLead?.profiles?.full_name || 'Não atribuído',
        assigned_to: activeLead?.assigned_to,
        leads: ((contact.leads as any[]) || [])
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((l) => {
                const rawProp = l.properties;
                const mappedProp = rawProp ? {
                    ...rawProp,
                    address_city: rawProp.details?.endereco?.cidade || null,
                    address_state: rawProp.details?.endereco?.estado || null
                } : null;
                return {
                    ...l,
                    properties: mappedProp,
                    status_name: l.lead_stages?.name || l.status,
                    status_color: l.lead_stages?.color || null,
                    has_proposal: (l.proposals && l.proposals.length > 0)
                };
            })
    }

    return { success: true, data: client }
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
        id,
        created_at,
        status,
        source,
        assigned_to,
        property_interest,
        contact_id,
        partner_id,
        assigned_user:profiles!leads_assigned_to_fkey (
            full_name
        ),
        properties (
            id,
            title,
            price,
            type,
            details
        ),
        lead_stages (
            name,
            color
        ),
        interactions (
            content,
            type,
            created_at
        ),
        proposals ( id )
      )
    `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

    if (!includeArchived) {
        query = query.eq('is_archived', false)
    }

    // Excluir contatos que são apenas proprietários de imóvel (não são clientes)
    query = query.eq('is_owner_only', false)

    const { data: contacts, error } = await query

    if (error) {
        console.error('Error fetching clients:', error)
        try {
            require('fs').writeFileSync(require('path').join(process.cwd(), 'debug_clients_error.txt'), JSON.stringify(error, null, 2));
        } catch (e) {}
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
            avatar_url: contact.avatar_url,
            cpf: contact.cpf,
            address_street: contact.address_street,
            address_number: contact.address_number,
            address_complement: contact.address_complement,
            address_neighborhood: contact.address_neighborhood,
            address_city: contact.address_city,
            address_state: contact.address_state,
            address_zip_code: contact.address_zip_code,
            com_address_street: contact.com_address_street,
            com_address_number: contact.com_address_number,
            com_address_complement: contact.com_address_complement,
            com_address_neighborhood: contact.com_address_neighborhood,
            com_address_city: contact.com_address_city,
            com_address_state: contact.com_address_state,
            com_address_zip_code: contact.com_address_zip_code,
            com_address_same: contact.com_address_same || false,
            marital_status: contact.marital_status,
            birth_date: contact.birth_date,
            contact_type: contact.contact_type || [],
            property_regime: contact.property_regime,
            spouse_name: contact.spouse_name,
            spouse_email: contact.spouse_email,
            spouse_phone: contact.spouse_phone,
            spouse_cpf: contact.spouse_cpf,
            spouse_birth_date: contact.spouse_birth_date,
            spouse_instagram: contact.spouse_instagram,
            spouse_linkedin: contact.spouse_linkedin,
            spouse_rg_cnh: contact.spouse_rg_cnh,
            spouse_rg_cnh_date: contact.spouse_rg_cnh_date,
            spouse_issuing_agency: contact.spouse_issuing_agency,
            spouse_profession: contact.spouse_profession,
            spouse_naturalness: contact.spouse_naturalness,
            spouse_nationality: contact.spouse_nationality,
            spouse_favorite_team: contact.spouse_favorite_team,
            spouse_marital_status: contact.spouse_marital_status,
            spouse_property_regime: contact.spouse_property_regime,
            spouse_marriage_date: contact.spouse_marriage_date,
            spouse_father_name: contact.spouse_father_name,
            spouse_mother_name: contact.spouse_mother_name,
            marriage_date: contact.marriage_date,
            rg_cnh: contact.rg_cnh,
            rg_cnh_date: contact.rg_cnh_date,
            issuing_agency: contact.issuing_agency,
            profession: contact.profession,
            naturalness: contact.naturalness,
            nationality: contact.nationality,
            father_name: contact.father_name,
            mother_name: contact.mother_name,
            instagram: contact.instagram,
            linkedin: contact.linkedin,
            favorite_team: contact.favorite_team,
            created_at: contact.created_at,
            is_archived: contact.is_archived || false,
            interest,
            value: 0, // Implementar lógica de valor baseada em properties depois
            notes: contact.notes || lastInteraction || '',
            tags: contact.tags || [],
            images: contact.images || [],
            videos: contact.videos || [],
            documents: contact.documents || [],
            broker_name: (activeLead as any)?.assigned_user?.full_name || 'Não atribuído',
            assigned_to: activeLead?.assigned_to,
            leads: ((contact.leads as any[]) || [])
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((l) => {
                    const rawProp = l.properties;
                    const mappedProp = rawProp ? {
                        ...rawProp,
                        address_city: rawProp.details?.endereco?.cidade || null,
                        address_state: rawProp.details?.endereco?.estado || null
                    } : null;
                    return {
                        ...l,
                        properties: mappedProp,
                        status_name: l.lead_stages?.name || l.status,
                        status_color: l.lead_stages?.color || null,
                        has_proposal: (l.proposals && l.proposals.length > 0)
                    };
                })
        }
    })

    // Filtrar por colaborador: apenas clientes com leads atribuídos ao usuário
    if (!isAdmin && userId) {
        const beforeFilter = clients.length;
        const sampleClientLeads = clients[0]?.leads?.map((l:any) => l.assigned_to) || [];
        
        clients = clients.filter((client: any) => 
            client.leads.some((lead: any) => lead.assigned_to === userId)
        )
        
        try {
            require('fs').writeFileSync(require('path').join(process.cwd(), 'debug_corretor_filter.txt'), JSON.stringify({
                userId,
                beforeFilter,
                afterFilter: clients.length,
                sampleClientLeads
            }, null, 2));
        } catch (e) {}
    }

    try {
        const fs = require('fs');
        const path = require('path');
        const logContent = JSON.stringify({
            timestamp: new Date().toISOString(),
            tenantId,
            isAdmin,
            userId,
            userAuthenticated: !!user,
            contactsCount: contacts?.length || 0,
            clientsAfterMapCount: clients?.length || 0,
        }, null, 2);
        fs.writeFileSync(path.join(process.cwd(), 'debug_clients.txt'), logContent);
    } catch (e) {
        console.error("Failed to write debug file", e);
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
            com_address_street: data.com_address_street,
            com_address_number: data.com_address_number,
            com_address_complement: data.com_address_complement,
            com_address_neighborhood: data.com_address_neighborhood,
            com_address_city: data.com_address_city,
            com_address_state: data.com_address_state,
            com_address_zip_code: data.com_address_zip_code,
            com_address_same: data.com_address_same || false,
            marital_status: data.marital_status,
            birth_date: data.birth_date || null,
            contact_type: data.contact_type || [],
            property_regime: data.property_regime,
            spouse_name: data.spouse_name,
            spouse_email: data.spouse_email,
            spouse_phone: data.spouse_phone ? cleanPhone(data.spouse_phone) : null,
            spouse_cpf: data.spouse_cpf,
            spouse_birth_date: data.spouse_birth_date || null,
            spouse_instagram: data.spouse_instagram,
            spouse_linkedin: data.spouse_linkedin,
            spouse_rg_cnh: data.spouse_rg_cnh,
            spouse_rg_cnh_date: data.spouse_rg_cnh_date,
            spouse_issuing_agency: data.spouse_issuing_agency,
            spouse_profession: data.spouse_profession,
            spouse_naturalness: data.spouse_naturalness,
            spouse_nationality: data.spouse_nationality,
            spouse_favorite_team: data.spouse_favorite_team,
            spouse_marital_status: data.spouse_marital_status,
            spouse_property_regime: data.spouse_property_regime,
            spouse_marriage_date: data.spouse_marriage_date || null,
            spouse_father_name: data.spouse_father_name,
            spouse_mother_name: data.spouse_mother_name,
            marriage_date: data.marriage_date || null,
            rg_cnh: data.rg_cnh,
            rg_cnh_date: data.rg_cnh_date,
            issuing_agency: data.issuing_agency,
            profession: data.profession,
            naturalness: data.naturalness,
            nationality: data.nationality,
            father_name: data.father_name,
            mother_name: data.mother_name,
            instagram: data.instagram,
            linkedin: data.linkedin,
            favorite_team: data.favorite_team,
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
            com_address_street: data.com_address_street,
            com_address_number: data.com_address_number,
            com_address_complement: data.com_address_complement,
            com_address_neighborhood: data.com_address_neighborhood,
            com_address_city: data.com_address_city,
            com_address_state: data.com_address_state,
            com_address_zip_code: data.com_address_zip_code,
            com_address_same: data.com_address_same,
            marital_status: data.marital_status,
            birth_date: data.birth_date || null,
            contact_type: data.contact_type || [],
            property_regime: data.property_regime,
            spouse_name: data.spouse_name,
            spouse_email: data.spouse_email,
            spouse_phone: data.spouse_phone ? cleanPhone(data.spouse_phone) : null,
            spouse_cpf: data.spouse_cpf,
            spouse_birth_date: data.spouse_birth_date || null,
            spouse_instagram: data.spouse_instagram,
            spouse_linkedin: data.spouse_linkedin,
            spouse_rg_cnh: data.spouse_rg_cnh,
            spouse_rg_cnh_date: data.spouse_rg_cnh_date,
            spouse_issuing_agency: data.spouse_issuing_agency,
            spouse_profession: data.spouse_profession,
            spouse_naturalness: data.spouse_naturalness,
            spouse_nationality: data.spouse_nationality,
            spouse_favorite_team: data.spouse_favorite_team,
            spouse_marital_status: data.spouse_marital_status,
            spouse_property_regime: data.spouse_property_regime,
            spouse_marriage_date: data.spouse_marriage_date || null,
            spouse_father_name: data.spouse_father_name,
            spouse_mother_name: data.spouse_mother_name,
            marriage_date: data.marriage_date || null,
            rg_cnh: data.rg_cnh,
            rg_cnh_date: data.rg_cnh_date,
            issuing_agency: data.issuing_agency,
            profession: data.profession,
            naturalness: data.naturalness,
            nationality: data.nationality,
            father_name: data.father_name,
            mother_name: data.mother_name,
            instagram: data.instagram,
            linkedin: data.linkedin,
            favorite_team: data.favorite_team,
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
