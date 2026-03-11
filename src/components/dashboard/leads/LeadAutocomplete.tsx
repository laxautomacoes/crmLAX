'use client'

import { Autocomplete } from '@/components/shared/forms/Autocomplete'
import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeadAutocompleteProps {
    tenantId: string
    selectedItem: any
    onSelect: (lead: any) => void
    onClear: () => void
    label?: string
    placeholder?: string
}

export function LeadAutocomplete({ 
    tenantId, 
    selectedItem, 
    onSelect, 
    onClear,
    label = "Lead Relacionado",
    placeholder = "Buscar lead"
}: LeadAutocompleteProps) {
    const fetchLeads = async (search: string) => {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('leads')
            .select('id, contacts!inner(name)')
            .eq('tenant_id', tenantId)
            .ilike('contacts.name', `%${search}%`)
            .limit(5)
            
        if (error) {
            console.error('Error fetching leads:', error)
            return []
        }

        return (data || []).map((lead: any) => ({
            id: lead.id,
            name: lead.contacts?.name || 'Sem nome'
        }))
    }

    return (
        <Autocomplete
            label={label}
            placeholder={placeholder}
            icon={User}
            selectedItem={selectedItem}
            onSelect={onSelect}
            onClear={onClear}
            fetchItems={fetchLeads}
            itemToString={(item) => item.name}
            itemToId={(item) => item.id}
        />
    )
}
