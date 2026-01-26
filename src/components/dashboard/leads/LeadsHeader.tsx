'use client'

import { Search, Filter } from 'lucide-react'
import { FormInput } from '@/components/shared/forms/FormInput'

interface LeadsHeaderProps {
    onSearch: (term: string) => void
    brokers?: any[]
    onBrokerChange?: (brokerId: string) => void
    isAdmin?: boolean
}

export function LeadsHeader({ onSearch, brokers, onBrokerChange, isAdmin }: LeadsHeaderProps) {
    return (
        <div className="flex items-center gap-2">
            <FormInput
                placeholder="Pesquisar leads ou imóveis..."
                onChange={(e) => onSearch(e.target.value)}
                icon={Search}
                className="md:w-[310px]"
            />
            {isAdmin && brokers && brokers.length > 0 && (
                <div className="relative group">
                    <select
                        onChange={(e) => onBrokerChange?.(e.target.value)}
                        className="appearance-none pl-9 pr-8 py-2 bg-card border border-muted-foreground/30 rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-muted/10 min-w-[160px]"
                    >
                        <option value="all">Todos os Corretores</option>
                        {brokers.map((broker) => (
                            <option key={broker.id} value={broker.id}>
                                {broker.full_name}
                            </option>
                        ))}
                    </select>
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
            )}
        </div>
    )
}
