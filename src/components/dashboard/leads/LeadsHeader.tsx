'use client'

import { Search } from 'lucide-react'
import { FormInput } from '@/components/shared/forms/FormInput'

interface LeadsHeaderProps {
    onSearch: (term: string) => void
}

export function LeadsHeader({ onSearch }: LeadsHeaderProps) {
    return (
        <FormInput
            placeholder="Pesquisar leads ou imóveis..."
            onChange={(e) => onSearch(e.target.value)}
            icon={Search}
            className="md:w-[310px]"
        />
    )
}
