'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Building2, Calendar, TrendingUp, Hash, Filter, Search,
    DollarSign, Maximize2, Car, Layers, Send, Eye,
    ChevronDown, ChevronUp, Loader2, AlertCircle, ClipboardList, Upload, RefreshCw, ArrowUpDown, X, Trash2, AlertTriangle
} from 'lucide-react'
import { getPropertyUnits, getPriceTableInfo, updateUnitStatus, getPriceTableHistory, deletePriceTable } from '@/app/_actions/property-units'
import type { PropertyUnit, PriceTableInfo } from '@/app/_actions/property-units'
import { UnitPaymentFlowModal } from './UnitPaymentFlowModal'
import { PropertyImportPDFModal } from './PropertyImportPDFModal'
import { toast } from 'sonner'

interface PriceTableTabProps {
    propertyId: string
    propertyTitle: string
    tenantId: string
    userRole?: string
    onHasTablesChange?: (hasTables: boolean) => void
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

function formatNumberBRL(value: number | null | undefined) {
    if (!value) return '—'
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMonth(month: string) {
    if (!month) return '—'
    const [year, m] = month.split('-')
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${months[parseInt(m) - 1]} / ${year}`
}

export function PriceTableTab({ propertyId, propertyTitle, tenantId, userRole, onHasTablesChange }: PriceTableTabProps) {
    const [units, setUnits] = useState<PropertyUnit[]>([])
    const [priceTables, setPriceTables] = useState<PriceTableInfo[]>([])
    const [availableTables, setAvailableTables] = useState<PriceTableInfo[]>([])
    const [selectedTableId, setSelectedTableId] = useState<string>('')
    const [selectedTower, setSelectedTower] = useState<string>('all')
    const [selectedTipologia, setSelectedTipologia] = useState<string>('all')
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(null)
    const [isFlowModalOpen, setIsFlowModalOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [propertyMedia, setPropertyMedia] = useState<{ images: string[]; videos: string[]; documents: { url: string; name?: string }[] }>({ images: [], videos: [], documents: [] })
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'

    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        setSelectedTower('all')
        setSelectedTipologia('all')
        loadData(selectedTableId)
    }, [propertyId, selectedTableId])

    async function loadData(tableId?: string) {
        setIsLoading(true)
        const [unitsRes, historyRes, activeTableRes] = await Promise.all([
            getPropertyUnits(propertyId, tableId || undefined),
            getPriceTableHistory(propertyId),
            getPriceTableInfo(propertyId)
        ])
        
        if (unitsRes.success) setUnits(unitsRes.data as PropertyUnit[])
        
        if (historyRes.success) {
            const tables = (historyRes.data || []) as PriceTableInfo[]
            setAvailableTables(tables)
            if (onHasTablesChange) {
                onHasTablesChange(tables.length > 0)
            }
        }
        
        if (tableId) {
            const table = historyRes.data?.find((t: any) => t.id === tableId)
            if (table) setPriceTables([table as PriceTableInfo])
        } else {
            if (activeTableRes.success) setPriceTables((activeTableRes.data || []) as PriceTableInfo[])
        }

        // Buscar mídias da propriedade
        const supabase = createClient()
        const { data: propData } = await supabase
            .from('properties')
            .select('images, videos, documents')
            .eq('id', propertyId)
            .single()
        if (propData) {
            setPropertyMedia({
                images: (propData.images as string[]) || [],
                videos: (propData.videos as string[]) || [],
                documents: (propData.documents as { url: string; name?: string }[]) || []
            })
        }

        setIsLoading(false)
    }

    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    const [sortColumn, setSortColumn] = useState<'apto' | 'torre' | 'valor'>('apto')

    const towers = useMemo(() => {
        const list = priceTables
            .map(t => t.block_tower)
            .filter((t): t is string => !!t)
        return Array.from(new Set(list)).sort()
    }, [priceTables])

    const tipologias = useMemo(() => {
        const list = units
            .map(u => u.extra_data?.tipologia || u.extra_data?.secao)
            .filter((t): t is string => !!t)
        return Array.from(new Set(list)).sort()
    }, [units])

    const activePriceTable = useMemo(() => {
        if (priceTables.length === 0) return null
        if (selectedTower === 'all') {
            return priceTables[0]
        }
        return priceTables.find(t => t.block_tower === selectedTower) || priceTables[0]
    }, [priceTables, selectedTower])

    const isHistoryView = useMemo(() => {
        if (!selectedTableId) return false
        const table = availableTables.find(t => t.id === selectedTableId)
        return table ? !table.is_active : false
    }, [selectedTableId, availableTables])

    const filteredUnits = useMemo(() => {
        return units.filter(u => {
            const matchSearch = !searchTerm || 
                u.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.block_tower || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.hobby_box || '').toLowerCase().includes(searchTerm.toLowerCase())
            const matchStatus = statusFilter === 'all' || u.status === statusFilter
            const matchTower = selectedTower === 'all' || u.block_tower === selectedTower
            const uTipologia = u.extra_data?.tipologia || u.extra_data?.secao || ''
            const matchTipologia = selectedTipologia === 'all' || uTipologia === selectedTipologia
            return matchSearch && matchStatus && matchTower && matchTipologia
        })
    }, [units, searchTerm, statusFilter, selectedTower, selectedTipologia])

    const sortedUnits = useMemo(() => {
        const sorted = [...filteredUnits]
        sorted.sort((a, b) => {
            if (sortColumn === 'valor') {
                const valA = a.valor_total || 0;
                const valB = b.valor_total || 0;
                if (valA !== valB) {
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                }
                const numA = parseInt(a.unit_number.replace(/\D/g, ''), 10);
                const numB = parseInt(b.unit_number.replace(/\D/g, ''), 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' });
            } else if (sortColumn === 'torre') {
                const towerA = a.block_tower || ''
                const towerB = b.block_tower || ''
                if (towerA !== towerB) {
                    return sortDirection === 'asc' 
                        ? towerA.localeCompare(towerB)
                        : towerB.localeCompare(towerA)
                }
                // Fallback para apto se mesma torre
                const numA = parseInt(a.unit_number.replace(/\D/g, ''), 10)
                const numB = parseInt(b.unit_number.replace(/\D/g, ''), 10)
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB
                }
                return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' })
            } else if (sortColumn === 'tipo') {
                const tipoA = a.extra_data?.tipologia || a.extra_data?.secao || ''
                const tipoB = b.extra_data?.tipologia || b.extra_data?.secao || ''
                if (tipoA !== tipoB) {
                    return sortDirection === 'asc' 
                        ? tipoA.localeCompare(tipoB)
                        : tipoB.localeCompare(tipoA)
                }
                const numA = parseInt(a.unit_number.replace(/\D/g, ''), 10)
                const numB = parseInt(b.unit_number.replace(/\D/g, ''), 10)
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB
                return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' })
            } else if (sortColumn === 'valor_m2') {
                const m2A = (a.valor_total && a.area_privativa && Number(a.area_privativa) > 0) ? (a.valor_total / Number(a.area_privativa)) : 0;
                const m2B = (b.valor_total && b.area_privativa && Number(b.area_privativa) > 0) ? (b.valor_total / Number(b.area_privativa)) : 0;
                if (m2A !== m2B) {
                    return sortDirection === 'asc' ? m2A - m2B : m2B - m2A;
                }
                const numA = parseInt(a.unit_number.replace(/\D/g, ''), 10)
                const numB = parseInt(b.unit_number.replace(/\D/g, ''), 10)
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB
                return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' })
            } else {
                const numA = parseInt(a.unit_number.replace(/\D/g, ''), 10)
                const numB = parseInt(b.unit_number.replace(/\D/g, ''), 10)

                if (!isNaN(numA) && !isNaN(numB)) {
                    return sortDirection === 'asc' ? numA - numB : numB - numA
                }

                return sortDirection === 'asc' 
                    ? a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' })
                    : b.unit_number.localeCompare(a.unit_number, undefined, { numeric: true, sensitivity: 'base' })
            }
        })
        return sorted
    }, [filteredUnits, sortDirection, sortColumn])

    const stats = useMemo(() => {
        const towerUnits = selectedTower === 'all' 
            ? units 
            : units.filter(u => u.block_tower === selectedTower)

        const available = towerUnits.filter(u => u.status === 'available').length
        const reserved = towerUnits.filter(u => u.status === 'reserved').length
        const proposal = towerUnits.filter(u => u.status === 'proposal').length
        const sold = towerUnits.filter(u => u.status === 'sold').length
        const priceList = towerUnits.filter(u => u.valor_total && u.valor_total > 0).map(u => u.valor_total!)
        const minPrice = priceList.length > 0 ? Math.min(...priceList) : 0
        const maxPrice = priceList.length > 0 ? Math.max(...priceList) : 0
        return { available, reserved, proposal, sold, total: towerUnits.length, minPrice, maxPrice }
    }, [units, selectedTower])

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

    async function handleDeleteTable() {
        if (!activePriceTable?.id) return
        setIsDeleting(true)
        const result = await deletePriceTable(activePriceTable.id)
        setIsDeleting(false)
        if (result.success) {
            toast.success('Tabela e unidades atreladas excluídas com sucesso!')
            setIsDeleteDialogOpen(false)
            setSelectedTableId('')
            loadData()
        } else {
            toast.error(result.error || 'Erro ao excluir tabela')
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-2">
                <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
        )
    }

    if (availableTables.length === 0 && priceTables.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-2 space-y-4">
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
                {isAdmin && (
                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-all active:scale-[0.98] shadow-sm mt-2"
                    >
                        <Upload size={16} />
                        Importar Tabela de Preços
                    </button>
                )}
                {isImportOpen && (
                    <PropertyImportPDFModal
                        isOpen={isImportOpen}
                        onClose={() => setIsImportOpen(false)}
                        tenantId={tenantId}
                        onImportSuccess={() => { setIsImportOpen(false); loadData() }}
                        properties={[{ id: propertyId, title: propertyTitle }]}
                        initialMode="tabela"
                        initialPropertyId={propertyId}
                    />
                )}
            </div>
        )
    }

    const paymentStructure = activePriceTable?.payment_structure || {}

    const activeTableToDisplay = selectedTableId 
        ? availableTables.find(t => t.id === selectedTableId) 
        : availableTables.find(t => t.is_active)
    
    const activeTableLabel = activeTableToDisplay 
        ? (activeTableToDisplay.is_active ? '[VIGENTE] ' : 'Histórico: ') + formatMonth(activeTableToDisplay.reference_month) + (activeTableToDisplay.block_tower ? ` - ${activeTableToDisplay.block_tower}` : '')
        : 'Selecione...'

    return (
        <div className="space-y-6">
            {/* ── Header da Tabela ── */}
            <div className="bg-background border border-border/40 rounded-lg p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="hidden sm:block flex-1" />
                    <div className="flex items-center justify-center flex-1 gap-3">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap mt-[2px]">Tabela Vigente</span>
                        <div className="relative inline-flex items-center" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="appearance-none bg-card border border-border rounded-lg pl-4 pr-10 py-2 text-sm font-bold text-foreground cursor-pointer hover:border-foreground/30 transition-colors focus:outline-none focus:border-secondary shadow-sm min-w-[200px] text-left relative"
                            >
                                {activeTableLabel}
                                <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 min-w-full bg-card border border-border rounded-lg shadow-xl overflow-hidden z-[60] py-1">
                                    <button 
                                        onClick={() => { setSelectedTableId(''); setIsDropdownOpen(false) }}
                                        className="w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-muted/50 text-foreground transition-colors"
                                    >
                                        Selecione...
                                    </button>
                                    {availableTables.map(t => (
                                        <div key={t.id} className="flex items-center justify-between hover:bg-muted/50 transition-colors group">
                                            <button
                                                onClick={() => { setSelectedTableId(t.id); setIsDropdownOpen(false) }}
                                                className="flex-1 text-left px-4 py-2.5 text-sm font-bold text-foreground truncate"
                                            >
                                                {t.is_active ? '[VIGENTE] ' : 'Histórico: '} 
                                                {formatMonth(t.reference_month)}
                                                {t.block_tower ? ` - ${t.block_tower}` : ''}
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setSelectedTableId(t.id);
                                                        setIsDropdownOpen(false); 
                                                        setIsDeleteDialogOpen(true); 
                                                    }}
                                                    className="p-2 mr-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                                    title="Excluir Tabela"
                                                >
                                                    <Trash2 size={16} strokeWidth={1.5} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-2 flex-1 w-full sm:w-auto">
                        {activePriceTable?.file_url && (
                            <a
                                href={activePriceTable.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-muted-foreground border border-border rounded-lg hover:bg-muted/30 transition-colors"
                            >
                                <Eye size={14} />
                                Ver PDF Original
                            </a>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border/30">
                    <div className="flex flex-col items-center justify-center text-center">
                        <p className="text-2xl font-black text-foreground">{stats.total}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                        <p className="text-2xl font-black text-emerald-500">{stats.available}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Disponíveis</p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                        <p className="text-2xl font-black text-amber-500">{stats.reserved + stats.proposal}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reservados</p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                        <p className="text-2xl font-black text-red-500">{stats.sold}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vendidos</p>
                    </div>
                </div>
            </div>

            {/* ── Abas de Tipologia (Plantas) ── */}
            {tipologias.length > 0 && (
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                        Selecione a Planta / Tipologia
                    </span>
                    <div className="flex flex-wrap gap-1.5 p-1 bg-background border border-border/40 rounded-xl max-w-max shadow-sm">
                        <button
                            onClick={() => setSelectedTipologia('all')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                selectedTipologia === 'all'
                                    ? 'bg-secondary text-secondary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                        >
                            Todas ({units.length})
                        </button>
                        {tipologias.map(t => {
                            const count = units.filter(u => (u.extra_data?.tipologia || u.extra_data?.secao) === t).length
                            return (
                                <button
                                    key={t}
                                    onClick={() => setSelectedTipologia(t)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                        selectedTipologia === t
                                            ? 'bg-secondary text-secondary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                                >
                                    {t} ({count})
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Filtros ── */}
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex flex-col gap-1.5 flex-1 w-full">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Buscar Unidade</span>
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar apto, torre, HB..."
                            className="w-full bg-foreground/5 border border-border/40 rounded-lg pl-10 pr-10 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground outline-none"
                            >
                                <X size={14} strokeWidth={1.5} />
                            </button>
                        )}
                    </div>
                </div>
                {towers.length > 0 && (
                    <div className="flex flex-col gap-1.5 w-full md:w-56">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Torre</span>
                        <div className="relative w-full">
                            <select
                                value={selectedTower}
                                onChange={(e) => setSelectedTower(e.target.value)}
                                className="w-full appearance-none bg-foreground/5 border border-border/40 rounded-lg px-4 pr-10 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all cursor-pointer"
                            >
                                <option value="all">Todas as Torres</option>
                                {towers.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                )}
                <div className="flex flex-col gap-1.5 w-full md:w-56">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                    <div className="relative w-full">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full appearance-none bg-foreground/5 border border-border/40 rounded-lg px-4 pr-10 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all cursor-pointer"
                        >
                            <option value="all">Todos ({stats.total})</option>
                            <option value="available">Disponíveis ({stats.available})</option>
                            <option value="reserved">Reservados ({stats.reserved})</option>
                            <option value="proposal">Em Proposta ({stats.proposal})</option>
                            <option value="sold">Vendidos ({stats.sold})</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* ── Tabela de Unidades ── */}
            <div className="bg-background border border-border/40 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-foreground/5 border-b border-border/30 whitespace-nowrap">
                                <th 
                                    onClick={() => {
                                        if (sortColumn === 'apto') {
                                            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                        } else {
                                            setSortColumn('apto')
                                            setSortDirection('asc')
                                        }
                                    }}
                                    className="text-[10px] font-bold text-foreground uppercase tracking-wider px-4 py-3 text-center cursor-pointer hover:bg-foreground/5 select-none"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Apto
                                        {sortColumn === 'apto' ? (
                                            sortDirection === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />
                                        ) : (
                                            <ArrowUpDown size={12} className="text-muted-foreground/40" />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => {
                                        if (sortColumn === 'torre') {
                                            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                        } else {
                                            setSortColumn('torre')
                                            setSortDirection('asc')
                                        }
                                    }}
                                    className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden md:table-cell cursor-pointer hover:bg-foreground/5 select-none"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Torre
                                        {sortColumn === 'torre' ? (
                                            sortDirection === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />
                                        ) : (
                                            <ArrowUpDown size={12} className="text-muted-foreground/40" />
                                        )}
                                    </div>
                                </th>
                                 <th 
                                     onClick={() => {
                                         if (sortColumn === 'tipo') {
                                             setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                         } else {
                                             setSortColumn('tipo')
                                             setSortDirection('asc')
                                         }
                                     }}
                                     className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden md:table-cell cursor-pointer hover:bg-foreground/5 select-none"
                                 >
                                     <div className="flex items-center justify-center gap-1">
                                         Tipo
                                         {sortColumn === 'tipo' ? (
                                             sortDirection === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />
                                         ) : (
                                             <ArrowUpDown size={12} className="text-muted-foreground/40" />
                                         )}
                                     </div>
                                 </th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden lg:table-cell">Vaga</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden lg:table-cell">HB</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden md:table-cell">Área Priv. (m²)</th>
                                <th 
                                    onClick={() => {
                                        if (sortColumn === 'valor') {
                                            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                        } else {
                                            setSortColumn('valor')
                                            setSortDirection('asc')
                                        }
                                    }}
                                    className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center cursor-pointer hover:bg-foreground/5 select-none"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Valor Total (R$)
                                        {sortColumn === 'valor' ? (
                                            sortDirection === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />
                                        ) : (
                                            <ArrowUpDown size={12} className="text-muted-foreground/40" />
                                        )}
                                    </div>
                                </th>
                                 <th 
                                     onClick={() => {
                                         if (sortColumn === 'valor_m2') {
                                             setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                         } else {
                                             setSortColumn('valor_m2')
                                             setSortDirection('asc')
                                         }
                                     }}
                                     className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden md:table-cell cursor-pointer hover:bg-foreground/5 select-none"
                                 >
                                     <div className="flex items-center justify-center gap-1">
                                         Valor m² (R$)
                                         {sortColumn === 'valor_m2' ? (
                                             sortDirection === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />
                                         ) : (
                                             <ArrowUpDown size={12} className="text-muted-foreground/40" />
                                         )}
                                     </div>
                                 </th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden lg:table-cell">Ato (R$)</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden lg:table-cell">Mensais (R$)</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden lg:table-cell">Reforços (R$)</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden lg:table-cell">Chaves (R$)</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden lg:table-cell">Saldo (R$)</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center hidden lg:table-cell">Financ. (R$)</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center sticky right-[80px] bg-muted z-20 w-[120px] min-w-[120px] max-w-[120px] border-l border-border/50">Status</th>
                                <th className="text-[10px] font-bold text-foreground uppercase tracking-wider px-3 py-3 text-center sticky right-0 bg-muted z-20 w-[80px] min-w-[80px] max-w-[80px]">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {sortedUnits.map((unit) => {
                                const statusCfg = STATUS_CONFIG[unit.status] || STATUS_CONFIG.available
                                return (
                                    <tr key={unit.id} className="hover:bg-foreground/[0.02] transition-colors group">
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-black text-foreground">{unit.unit_number}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden md:table-cell">
                                            <span className="text-xs font-medium text-foreground">{unit.block_tower || '-'}</span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden md:table-cell">
                                            <span className="text-[10px] font-bold text-foreground min-w-[130px] max-w-[180px] line-clamp-2 whitespace-normal break-words leading-tight mx-auto block" title={unit.extra_data?.tipologia || unit.extra_data?.secao || ''}>
                                                {unit.extra_data?.tipologia || unit.extra_data?.secao || '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                                            <div className="flex flex-col items-center">
                                                {!unit.garage_type && !unit.garage_number ? (
                                                    <span className="text-xs font-medium text-foreground">-</span>
                                                ) : (
                                                    <>
                                                        {unit.garage_type && (
                                                            <span className="text-xs font-medium text-foreground">{unit.garage_type}</span>
                                                        )}
                                                        {unit.garage_number && (
                                                            <span className="text-xs font-medium text-foreground">{unit.garage_number}</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                                            <span className="text-xs font-bold text-foreground">{unit.hobby_box || '-'}</span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden md:table-cell">
                                            <span className="text-xs font-medium text-foreground">
                                                {unit.area_privativa ? Number(unit.area_privativa).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className="text-sm font-black text-foreground">
                                                {formatNumberBRL(unit.valor_total)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden md:table-cell">
                                            <span className="text-xs font-bold text-foreground">
                                                {(unit.valor_total && unit.area_privativa && Number(unit.area_privativa) > 0) ? formatNumberBRL(unit.valor_total / Number(unit.area_privativa)) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                                            <span className="text-xs font-medium text-foreground">
                                                {unit.valor_ato ? formatNumberBRL(unit.valor_ato) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                                            <span className="text-xs font-medium text-foreground">
                                                {unit.valor_mensais ? formatNumberBRL(unit.valor_mensais) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                                            <span className="text-xs font-medium text-foreground">
                                                {unit.valor_reforcos ? formatNumberBRL(unit.valor_reforcos) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                                            <span className="text-xs font-medium text-foreground">
                                                {unit.valor_chaves ? formatNumberBRL(unit.valor_chaves) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                                            <span className="text-xs font-medium text-foreground">
                                                {unit.soma_poupanca ? formatNumberBRL(unit.soma_poupanca) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                                            <span className="text-xs font-medium text-foreground">
                                                {unit.valor_financiamento ? formatNumberBRL(unit.valor_financiamento) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center sticky right-[80px] bg-background group-hover:bg-foreground/[0.02] transition-colors z-10 w-[120px] min-w-[120px] max-w-[120px] border-l border-border/50">
                                            {isAdmin && !isHistoryView ? (
                                                <div className="relative inline-block">
                                                    <select
                                                        value={unit.status}
                                                        onChange={(e) => handleStatusChange(unit.id, e.target.value as any)}
                                                        className={`appearance-none text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded border cursor-pointer text-center ${statusCfg.color}`}
                                                    >
                                                        <option value="available">Disponível</option>
                                                        <option value="reserved">Reservado</option>
                                                        <option value="proposal">Em Proposta</option>
                                                        <option value="sold">Vendido</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded border text-center ${statusCfg.color}`}>
                                                    {statusCfg.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center sticky right-0 bg-background group-hover:bg-foreground/[0.02] transition-colors z-10 w-[80px] min-w-[80px] max-w-[80px]">
                                            <button
                                                onClick={() => handleOpenFlow(unit)}
                                                className="inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded border border-transparent text-center text-secondary-foreground bg-secondary hover:bg-secondary/90 transition-all active:scale-[0.97]"
                                            >
                                                Fluxo
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {sortedUnits.length === 0 && (
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
                    priceTable={activePriceTable}
                    tenantId={tenantId}
                    propertyImages={propertyMedia.images}
                    propertyVideos={propertyMedia.videos}
                    propertyDocuments={propertyMedia.documents}
                />
            )}

            {isDeleteDialogOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card shadow-xl rounded-xl w-full max-w-sm p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95">
                        <div className="flex flex-col text-center items-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                <AlertTriangle size={24} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-foreground uppercase tracking-widest">Excluir Tabela</h3>
                                <p className="text-sm text-muted-foreground leading-snug mt-1">
                                    <span className="block">Tem certeza que deseja excluir esta tabela?</span>
                                    <span className="block">Todas as unidades atreladas a ela serão permanentemente removidas.</span>
                                    <span className="block">Esta ação não pode ser desfeita.</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 text-sm font-bold text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteTable}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
