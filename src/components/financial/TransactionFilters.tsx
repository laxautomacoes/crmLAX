'use client'

import { Calendar, Filter as FilterIcon } from 'lucide-react'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { Modal } from '@/components/shared/Modal'
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
    isOpen: boolean
    onClose: () => void
}

export function TransactionFilters({
    tipo, onTipoChange,
    categoria, onCategoriaChange,
    periodo, onPeriodoChange,
    search, onSearchChange,
    categories,
    isOpen, onClose
}: TransactionFiltersProps) {
    const filteredCategories = tipo && tipo !== 'Todas'
        ? categories.filter(c => c.tipo === tipo || c.tipo === 'Ambos')
        : categories

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Filtros">
            <div className="space-y-4">
                {/* Período */}
                <FormSelect
                    label="Período"
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

                {/* Tipo */}
                <FormSelect
                    label="Tipo"
                    value={tipo}
                    onChange={(e) => onTipoChange(e.target.value)}
                    options={[
                        { value: 'Todas', label: 'Todas' },
                        { value: 'Receita', label: 'Receitas' },
                        { value: 'Despesa', label: 'Despesas' },
                    ]}
                />

                {/* Categoria */}
                {filteredCategories.length > 0 && (
                    <FormSelect
                        label="Categoria"
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
                )}
            </div>
            
            <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-border/50">
                <button
                    onClick={() => {
                        onPeriodoChange('month')
                        onTipoChange('Todas')
                        onCategoriaChange('')
                        onSearchChange('')
                    }}
                    className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                    Limpar
                </button>
                <button
                    onClick={onClose}
                    className="bg-secondary text-secondary-foreground h-[34px] px-6 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                >
                    Aplicar
                </button>
            </div>
        </Modal>
    )
}
