'use client'

import { Autocomplete } from '@/components/shared/forms/Autocomplete'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PropertyAutocompleteProps {
    tenantId: string
    selectedItem: any
    onSelect: (property: any) => void
    onClear: () => void
    label?: string
    placeholder?: string
    icon?: any
}

export function PropertyAutocomplete({ 
    tenantId, 
    selectedItem, 
    onSelect, 
    onClear,
    label = "Property Relacionado",
    placeholder = "Buscar property",
    icon = Building2
}: PropertyAutocompleteProps) {
    const fetchProperties = async (search: string) => {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('properties')
            .select('id, title')
            .eq('tenant_id', tenantId)
            .ilike('title', `%${search}%`)
            .limit(5)
            
        if (error) {
            console.error('Error fetching properties:', error)
            return []
        }

        return data || []
    }

    return (
        <Autocomplete
            label={label}
            placeholder={placeholder}
            icon={icon}
            selectedItem={selectedItem}
            onSelect={onSelect}
            onClear={onClear}
            fetchItems={fetchProperties}
            itemToString={(item) => item.title}
            itemToId={(item) => item.id}
        />
    )
}
