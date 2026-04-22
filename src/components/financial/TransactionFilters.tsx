'use client'

import { Search, Calendar, Filter as FilterIcon } from 'lucide-react'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import type { FinancialCategory } from '@/app/_actions/financial'

interface TransactionFiltersProps {
    tipo: string
    onTipoChange: (v: string) => void
    categoria: string
    onCategoriaChange: (v: string) => void
    periodo: string
    onPeriodoChange: (v: string) => void
    search: string
    onSearchChange: (v: string) => void
    categories: FinancialCategory[]
}

export function TransactionFilters({
    tipo, onTipoChange,
    categoria, onCategoriaChange,
    periodo, onPeriodoChange,
    search, onSearchChange,
    categories
}: TransactionFiltersProps) {
    const filteredCategories = tipo && tipo !== 'Todas'
        ? categories.filter(c => c.tipo === tipo || c.tipo === 'Ambos')
        : categories

    return (
        <div className="bg-card border border-border rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                {/* Busca */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar por descrição..."
                        className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                    />
                </div>

                {/* Período */}
                <div className="flex items-center gap-2 min-w-[160px]">
                    <Calendar size={14} className="text-muted-foreground hidden md:block flex-shrink-0" />
                    <FormSelect
                        label=""
                        value={periodo}
                        onChange={(e) => onPeriodoChange(e.target.value)}
                        options={[
                            { value: 'month', label: 'Este Mês' },
                            { value: '3months', label: 'Últimos 3 meses' },
                            { value: '6months', label: 'Últimos 6 meses' },
                            { value: 'year', label: 'Este Ano' },
                            { value: 'all', label: 'Tudo' },
                        ]}
                    />
                </div>

                {/* Tipo */}
                <div className="flex items-center gap-2 min-w-[140px]">
                    <FilterIcon size={14} className="text-muted-foreground hidden md:block flex-shrink-0" />
                    <FormSelect
                        label=""
                        value={tipo}
                        onChange={(e) => onTipoChange(e.target.value)}
                        options={[
                            { value: 'Todas', label: 'Todas' },
                            { value: 'Receita', label: 'Receitas' },
                            { value: 'Despesa', label: 'Despesas' },
                        ]}
                    />
                </div>

                {/* Categoria */}
                {filteredCategories.length > 0 && (
                    <div className="min-w-[160px]">
                        <FormSelect
                            label=""
                            value={categoria}
                            onChange={(e) => onCategoriaChange(e.target.value)}
                            options={[
                                { value: '', label: 'Todas categorias' },
                                ...filteredCategories.map(c => ({
                                    value: c.name,
                                    label: c.name,
                                }))
                            ]}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
