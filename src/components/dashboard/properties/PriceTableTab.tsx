'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Building2, Calendar, TrendingUp, Hash, Filter, Search,
    DollarSign, Maximize2, Car, Layers, Send, Eye,
    ChevronDown, Loader2, AlertCircle, ClipboardList
} from 'lucide-react'
import { getPropertyUnits, getPriceTableInfo, updateUnitStatus } from '@/app/_actions/property-units'
import type { PropertyUnit, PriceTableInfo } from '@/app/_actions/property-units'
import { UnitPaymentFlowModal } from './UnitPaymentFlowModal'
import { toast } from 'sonner'

interface PriceTableTabProps {
    propertyId: string
    propertyTitle: string
    tenantId: string
    userRole?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    available: { label: 'Disponível', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
    reserved: { label: 'Reservado', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
    proposal: { label: 'Em Proposta', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
    sold: { label: 'Vendido', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
}

function formatBRL(value: number | null | undefined) {
    if (!value) return '—'
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatMonth(month: string) {
    if (!month) return '—'
    const [year, m] = month.split('-')
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${months[parseInt(m) - 1]} / ${year}`
}

export function PriceTableTab({ propertyId, propertyTitle, tenantId, userRole }: PriceTableTabProps) {
    const [units, setUnits] = useState<PropertyUnit[]>([])
    const [priceTable, setPriceTable] = useState<PriceTableInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(null)
    const [isFlowModalOpen, setIsFlowModalOpen] = useState(false)
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'

    useEffect(() => {
        loadData()
    }, [propertyId])

    async function loadData() {
        setIsLoading(true)
        const [unitsRes, tableRes] = await Promise.all([
            getPropertyUnits(propertyId),
            getPriceTableInfo(propertyId)
        ])
        if (unitsRes.success) setUnits(unitsRes.data as PropertyUnit[])
        if (tableRes.success) setPriceTable(tableRes.data as PriceTableInfo | null)
        setIsLoading(false)
    }

    const filteredUnits = useMemo(() => {
        return units.filter(u => {
            const matchSearch = !searchTerm || 
                u.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.block_tower || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.hobby_box || '').toLowerCase().includes(searchTerm.toLowerCase())
            const matchStatus = statusFilter === 'all' || u.status === statusFilter
            return matchSearch && matchStatus
        })
    }, [units, searchTerm, statusFilter])

    const stats = useMemo(() => {
        const available = units.filter(u => u.status === 'available').length
        const reserved = units.filter(u => u.status === 'reserved' || u.status === 'proposal').length
        const sold = units.filter(u => u.status === 'sold').length
        const priceList = units.filter(u => u.valor_total && u.valor_total > 0).map(u => u.valor_total!)
        const minPrice = priceList.length > 0 ? Math.min(...priceList) : 0
        const maxPrice = priceList.length > 0 ? Math.max(...priceList) : 0
        return { available, reserved, sold, total: units.length, minPrice, maxPrice }
    }, [units])

    async function handleStatusChange(unitId: string, newStatus: 'available' | 'reserved' | 'sold' | 'proposal') {
        const result = await updateUnitStatus(unitId, newStatus)
        if (result.success) {
            setUnits(prev => prev.map(u => u.id === unitId ? { ...u, status: newStatus } : u))
            toast.success('Status atualizado!')
        } else {
            toast.error(result.error || 'Erro ao atualizar status')
        }
    }

    function handleOpenFlow(unit: PropertyUnit) {
        setSelectedUnit(unit)
        setIsFlowModalOpen(true)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
        )
    }

    if (!priceTable || units.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="p-4 bg-muted/30 rounded-full">
                    <ClipboardList size={32} className="text-muted-foreground" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-base font-bold text-foreground">Nenhuma tabela de preços encontrada</p>
                    <p className="text-sm text-muted-foreground">
                        {isAdmin 
                            ? 'Faça o upload de uma tabela de preços para este empreendimento.' 
                            : 'Solicite ao administrador o upload da tabela de preços.'}
                    </p>
                </div>
            </div>
        )
    }

    const paymentStructure = priceTable.payment_structure || {}

    return (
        <div className="space-y-6">
            {/* ── Header da Tabela ── */}
            <div className="bg-foreground/5 border border-border/40 rounded-lg p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={14} />
                            Tabela Vigente
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <Calendar size={12} />
                                <span className="font-bold text-foreground">{formatMonth(priceTable.reference_month)}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <TrendingUp size={12} />
                                <span className="font-bold text-foreground">{priceTable.index_type}</span>
                                {priceTable.index_value && (
                                    <span className="text-xs">({formatBRL(priceTable.index_value)})</span>
                                )}
                            </span>
                        </div>
                    </div>
                    {priceTable.file_url && (
                        <a
                            href={priceTable.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-muted-foreground border border-border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                            <Eye size={14} />
                            Ver PDF Original
                        </a>
                    )}
                </div>

                {/* Estrutura de pagamento */}
                {Object.keys(paymentStructure).length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-border/30">
                        {paymentStructure.ato && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md">
                                Ato {paymentStructure.ato.pct}% ({paymentStructure.ato.parcelas}x)
                            </span>
                        )}
                        {paymentStructure.mensais && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md">
                                Mensais {paymentStructure.mensais.pct}% ({paymentStructure.mensais.parcelas}x)
                            </span>
                        )}
                        {paymentStructure.reforcos && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md">
                                Reforços {paymentStructure.reforcos.pct}% ({paymentStructure.reforcos.parcelas}x)
                            </span>
                        )}
                        {paymentStructure.chaves && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md">
                                Chaves {paymentStructure.chaves.pct}% ({paymentStructure.chaves.parcelas}x)
                            </span>
                        )}
                        {paymentStructure.financiamento && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md">
                                Financ. {paymentStructure.financiamento.pct}% ({paymentStructure.financiamento.parcelas}x)
                            </span>
                        )}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/30">
                    <div className="text-center">
                        <p className="text-2xl font-black text-foreground">{stats.total}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-emerald-600">{stats.available}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Disponíveis</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-amber-600">{stats.reserved}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reservados</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-red-600">{stats.sold}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vendidos</p>
                    </div>
                </div>
            </div>

            {/* ── Filtros ── */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar apto, torre, HB..."
                        className="w-full bg-foreground/5 border border-border/40 rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                    />
                </div>
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none bg-foreground/5 border border-border/40 rounded-lg px-4 pr-10 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all cursor-pointer"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="available">Disponíveis</option>
                        <option value="reserved">Reservados</option>
                        <option value="proposal">Em Proposta</option>
                        <option value="sold">Vendidos</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {/* ── Tabela de Unidades ── */}
            <div className="border border-border/40 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-foreground/5 border-b border-border/30">
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-4 py-3">Apto</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 hidden md:table-cell">Torre</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 hidden lg:table-cell">Garagem</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 hidden lg:table-cell">HB</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 hidden md:table-cell">Área Priv.</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3">Valor Total</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3">Status</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {filteredUnits.map((unit) => {
                                const statusCfg = STATUS_CONFIG[unit.status] || STATUS_CONFIG.available
                                return (
                                    <tr key={unit.id} className="hover:bg-foreground/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-black text-foreground">{unit.unit_number}</span>
                                        </td>
                                        <td className="px-3 py-3 hidden md:table-cell">
                                            <span className="text-xs font-medium text-foreground">{unit.block_tower || '—'}</span>
                                        </td>
                                        <td className="px-3 py-3 hidden lg:table-cell">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-foreground">{unit.garage_type || '—'}</span>
                                                {unit.garage_number && (
                                                    <span className="text-[10px] text-muted-foreground">Nº {unit.garage_number}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 hidden lg:table-cell">
                                            <span className="text-xs font-bold text-foreground">{unit.hobby_box || '—'}</span>
                                        </td>
                                        <td className="px-3 py-3 hidden md:table-cell">
                                            <span className="text-xs font-medium text-foreground">
                                                {unit.area_privativa ? `${unit.area_privativa}m²` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-sm font-black text-foreground">
                                                {formatBRL(unit.valor_total)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            {isAdmin ? (
                                                <div className="relative">
                                                    <select
                                                        value={unit.status}
                                                        onChange={(e) => handleStatusChange(unit.id, e.target.value as any)}
                                                        className={`appearance-none text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border cursor-pointer ${statusCfg.color}`}
                                                    >
                                                        <option value="available">Disponível</option>
                                                        <option value="reserved">Reservado</option>
                                                        <option value="proposal">Em Proposta</option>
                                                        <option value="sold">Vendido</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${statusCfg.color}`}>
                                                    {statusCfg.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <button
                                                onClick={() => handleOpenFlow(unit)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground bg-secondary hover:bg-secondary/90 rounded-lg transition-all active:scale-[0.97] shadow-sm"
                                            >
                                                <Send size={12} />
                                                Fluxo
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredUnits.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada com os filtros aplicados.</p>
                    </div>
                )}
            </div>

            {/* ── Faixa de preço ── */}
            {stats.minPrice > 0 && (
                <div className="text-center text-xs text-muted-foreground">
                    Faixa de preço: <span className="font-bold text-foreground">{formatBRL(stats.minPrice)}</span>
                    {stats.maxPrice > stats.minPrice && (
                        <> a <span className="font-bold text-foreground">{formatBRL(stats.maxPrice)}</span></>
                    )}
                </div>
            )}

            {/* ── Modal Fluxo de Pagamento ── */}
            {selectedUnit && (
                <UnitPaymentFlowModal
                    isOpen={isFlowModalOpen}
                    onClose={() => { setIsFlowModalOpen(false); setSelectedUnit(null) }}
                    unit={selectedUnit}
                    propertyTitle={propertyTitle}
                    priceTable={priceTable}
                    tenantId={tenantId}
                />
            )}
        </div>
    )
}
