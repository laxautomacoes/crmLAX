'use client'

import { Autocomplete } from '@/components/shared/forms/Autocomplete'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AssetAutocompleteProps {
    tenantId: string
    selectedItem: any
    onSelect: (asset: any) => void
    onClear: () => void
    label?: string
    placeholder?: string
    icon?: any
}

export function AssetAutocomplete({ 
    tenantId, 
    selectedItem, 
    onSelect, 
    onClear,
    label = "Imóvel Relacionado",
    placeholder = "Buscar imóvel",
    icon = Building2
}: AssetAutocompleteProps) {
    const fetchAssets = async (search: string) => {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('assets')
            .select('id, title')
            .eq('tenant_id', tenantId)
            .ilike('title', `%${search}%`)
            .limit(5)
            
        if (error) {
            console.error('Error fetching assets:', error)
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
            fetchItems={fetchAssets}
            itemToString={(item) => item.title}
            itemToId={(item) => item.id}
        />
    )
}
