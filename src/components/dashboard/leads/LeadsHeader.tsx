'use client'

import { useState } from 'react'
import { Search, Filter, Check } from 'lucide-react'
import { FormInput } from '@/components/shared/forms/FormInput'

interface Broker {
    id: string
    full_name: string
    role?: string
}

interface LeadsHeaderProps {
    onSearch: (term: string) => void
    brokers?: Broker[]
    onBrokerChange?: (brokerId: string) => void
    isAdmin?: boolean
    selectedBroker?: string
    children?: React.ReactNode
}

export function LeadsHeader({ onSearch, brokers, onBrokerChange, isAdmin, selectedBroker = 'all', children }: LeadsHeaderProps) {
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    return (
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
            <div className="grid grid-flow-col auto-cols-max gap-2 md:gap-3 w-full md:w-max">
                {isAdmin && brokers && brokers.length > 0 && (
                    <div className="relative group hidden md:block min-w-[130px]">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="min-w-[130px] h-[34px] w-full flex items-center justify-center gap-2 bg-card border border-muted-foreground/30 text-foreground px-4 rounded-lg hover:bg-muted/50 transition-colors text-sm font-bold uppercase tracking-wide whitespace-nowrap outline-none focus:ring-2 focus:ring-ring/50"
                        >
                            <Filter size={14} strokeWidth={1} className="flex-shrink-0" />
                            <span className={selectedBroker === 'all' ? "" : "truncate max-w-[120px] md:max-w-[150px]"}>
                                {selectedBroker === 'all' 
                                    ? 'Todos' 
                                    : brokers.find(b => b.id === selectedBroker)?.full_name || 'Todos'}
                            </span>
                        </button>
                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={() => { onBrokerChange?.('all'); setIsFilterOpen(false); }}
                                        className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${selectedBroker === 'all' ? 'text-accent-icon font-bold bg-accent-icon/5' : 'text-foreground font-medium'}`}
                                    >
                                        Todos
                                        {selectedBroker === 'all' && <Check size={14} />}
                                    </button>
                                    {brokers.filter((broker) => broker.role !== 'admin' && broker.role !== 'superadmin').map((broker) => (
                                        <button
                                            key={broker.id}
                                            onClick={() => { onBrokerChange?.(broker.id); setIsFilterOpen(false); }}
                                            className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${selectedBroker === broker.id ? 'text-accent-icon font-bold bg-accent-icon/5' : 'text-foreground font-medium'}`}
                                        >
                                            <span className="truncate">{broker.full_name}</span>
                                            {selectedBroker === broker.id && <Check size={14} className="flex-shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
                {children}
            </div>
        </div>
    )
}
