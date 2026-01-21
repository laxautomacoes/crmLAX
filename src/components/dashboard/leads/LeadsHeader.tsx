'use client'

import { Search } from 'lucide-react'

interface LeadsHeaderProps {
    onSearch: (term: string) => void
}

export function LeadsHeader({ onSearch }: LeadsHeaderProps) {
    return (
        <div className="relative w-full md:w-[310px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
                type="text"
                placeholder="Pesquisar leads ou imóveis..."
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all text-foreground placeholder:text-muted-foreground shadow-sm text-sm"
            />
        </div>
    )
}
