'use client'

import { useState } from 'react'
import { Search, Filter, RefreshCw } from 'lucide-react'
import { FormInput } from '@/components/shared/forms/FormInput'

interface LeadsHeaderProps {
    onSearch: (term: string) => void
    onOpenFilter?: () => void
    onOpenSync?: () => void
    activeFilterCount?: number
    viewToggle?: React.ReactNode
    children?: React.ReactNode
    // Mantém compatibilidade com chamadas existentes
    brokers?: any[]
    onBrokerChange?: (brokerId: string) => void
    isAdmin?: boolean
    selectedBroker?: string
}

export function LeadsHeader({
    onSearch,
    onOpenFilter,
    onOpenSync,
    activeFilterCount = 0,
    viewToggle,
    children,
}: LeadsHeaderProps) {
    const [searchTerm, setSearchTerm] = useState('')

    return (
        <div className="flex flex-col-reverse md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 w-full md:w-auto">
                <FormInput
                    value={searchTerm}
                    placeholder="Pesquisar leads..."
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        onSearch(e.target.value)
                    }}
                    onClear={() => {
                        setSearchTerm('')
                        onSearch('')
                    }}
                    icon={Search}
                    iconSize={14}
                    iconStrokeWidth={1}
                    className="w-full md:w-[320px] h-[34px]"
                />
                {viewToggle}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 md:gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide shrink-0">
                {onOpenFilter && (
                    <button
                        type="button"
                        onClick={onOpenFilter}
                        className={`h-[34px] min-w-[130px] flex items-center justify-center gap-2 px-4 border rounded-lg transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap outline-none focus:ring-2 shadow-sm ${
                            activeFilterCount > 0
                                ? 'bg-secondary/10 border-secondary text-foreground hover:bg-secondary/20 focus:ring-secondary/50'
                                : 'bg-card border-muted-foreground/30 text-foreground hover:bg-muted/50 focus:ring-ring/50'
                        }`}
                    >
                        <Filter size={14} strokeWidth={1} className="flex-shrink-0" />
                        <span>FILTRAR</span>
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                )}
                {onOpenSync && (
                    <button
                        type="button"
                        onClick={onOpenSync}
                        className="h-[34px] min-w-[130px] flex items-center justify-center gap-2 px-4 border border-muted-foreground/30 bg-card hover:bg-muted/50 text-foreground rounded-lg transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap outline-none focus:ring-2 focus:ring-ring/50 shadow-sm"
                    >
                        <RefreshCw size={14} strokeWidth={1} className="flex-shrink-0" />
                        <span>SINCRONIZAR</span>
                    </button>
                )}
                {children}
            </div>
        </div>
    )
}
