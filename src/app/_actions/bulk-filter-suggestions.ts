'use server'

import { createClient } from '@/lib/supabase/server'

// Busca sugestões de autocomplete para os filtros de disparos em massa
// Retorna nomes de clientes, nomes de leads, títulos de imóveis e localizações
export async function getBulkFilterSuggestions(tenantId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || profile.tenant_id !== tenantId) {
        return { success: false, error: 'Acesso negado.' }
    }

    // Buscar nomes de contatos (clientes)
    const { data: contacts } = await supabase
        .from('contacts')
        .select('name')
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)
        .not('name', 'is', null)
        .order('name')

    // Buscar leads com nome do contato (nome do lead = nome do contato vinculado)
    const { data: leads } = await supabase
        .from('leads')
        .select('contacts(name)')
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)

    // Buscar imóveis com título, quartos e endereço
    const { data: properties } = await supabase
        .from('properties')
        .select('title, details, price')
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)

    // Processar nomes de clientes (únicos)
    const clientNames = [...new Set(
        (contacts || []).map((c: any) => c.name).filter(Boolean)
    )] as string[]

    // Processar nomes de leads (únicos)
    const leadNames = [...new Set(
        (leads || []).map((l: any) => {
            const name = Array.isArray(l.contacts) ? l.contacts[0]?.name : l.contacts?.name
            return name
        }).filter(Boolean)
    )] as string[]

    // Processar títulos de imóveis (únicos)
    const propertyNames = [...new Set(
        (properties || []).map((p: any) => p.title).filter(Boolean)
    )] as string[]

    // Processar localizações: bairro - cidade (únicos)
    const locations: string[] = []
    const locationSet = new Set<string>()
    ;(properties || []).forEach((p: any) => {
        const endereco = p.details?.endereco
        if (endereco) {
            if (endereco.bairro && !locationSet.has(endereco.bairro)) {
                locationSet.add(endereco.bairro)
                const loc = endereco.cidade 
                    ? `${endereco.bairro}, ${endereco.cidade}`
                    : endereco.bairro
                locations.push(loc)
            }
            if (endereco.cidade && !locationSet.has(`city_${endereco.cidade}`)) {
                locationSet.add(`city_${endereco.cidade}`)
                locations.push(endereco.cidade)
            }
        }
    })

    // Processar quartos disponíveis (únicos e ordenados)
    const bedroomSet = new Set<string>()
    ;(properties || []).forEach((p: any) => {
        const quartos = p.details?.quartos
        if (quartos) bedroomSet.add(quartos)
    })
    const bedroomOptions = [...bedroomSet].sort((a, b) => parseInt(a) - parseInt(b))

    return {
        success: true,
        data: {
            clientNames,
            leadNames,
            propertyNames,
            locations,
            bedroomOptions
        }
    }
}
