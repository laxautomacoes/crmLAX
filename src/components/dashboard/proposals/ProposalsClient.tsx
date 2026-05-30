'use client'

import { useState, useEffect } from 'react'
import { getAllProposals, updateProposalStatus } from '@/app/_actions/proposals'
import { getProfile } from '@/app/_actions/profile'
import { PageHeader } from '@/components/shared/PageHeader'
import { FileText, Search, Filter, Loader2, Eye, ChevronDown, List, Columns3 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Proposal {
    id: string
    lead_id: string
    value: number
    status: string
    created_at: string
    updated_at: string
    payment_terms?: any
    contact?: { id: string; name: string; phone: string; email: string; cpf: string } | null
    property?: { id: string; title: string; price: number; type: string; address_city: string; address_state: string } | null
    lead?: { id: string; property_interest: string; stage_id: string; lead_stages?: { name: string } } | null
    creator?: { full_name: string } | null
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'Todos', color: '' },
    { value: 'rascunho', label: 'Rascunho', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    { value: 'enviada', label: 'Enviada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'aceita', label: 'Aceita', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'recusada', label: 'Recusada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
]

const STATUS_PIPELINE_COLORS: Record<string, string> = {
    rascunho: '#6B7280',
    enviada: '#3B82F6',
    aceita: '#22C55E',
    recusada: '#EF4444',
}

function getStatusBadge(status: string) {
    const option = STATUS_OPTIONS.find(o => o.value === status)
    return option ? option.color : STATUS_OPTIONS[1].color
}

function getStatusLabel(status: string) {
    const option = STATUS_OPTIONS.find(o => o.value === status)
    return option ? option.label : status
}

/* ── Sortable Card ── */
function SortableProposalCard({ proposal, onClick }: { proposal: Proposal; onClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: proposal.id })
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className="bg-white dark:bg-card border border-border/40 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-border/60 transition-all cursor-grab active:cursor-grabbing group"
        >
            <div onClick={onClick}>
                {/* Cliente */}
                <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-black text-secondary-foreground">
                            {(proposal.contact?.name || '?').charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate leading-tight">
                            {proposal.contact?.name || '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                            {proposal.contact?.phone || proposal.contact?.email || ''}
                        </p>
                    </div>
                </div>
                {/* Imóvel */}
                <div className="mb-2.5">
                    <p className="text-[11px] text-muted-foreground truncate">
                        {proposal.property?.title || proposal.lead?.property_interest || 'Imóvel não especificado'}
                    </p>
                    {proposal.property?.address_city && (
                        <p className="text-[10px] text-muted-foreground/60 truncate">
                            {proposal.property.address_city}{proposal.property.address_state ? ` - ${proposal.property.address_state}` : ''}
                        </p>
                    )}
                </div>
                {/* Valor + Data */}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-xs font-bold text-foreground">
                        R$ {proposal.value ? parseFloat(proposal.value.toString()).toLocaleString('pt-BR') : '0'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {new Date(proposal.updated_at).toLocaleDateString('pt-BR')}
                    </span>
                </div>
            </div>
        </div>
    )
}

/* ── Droppable Column ── */
function DroppableStatusColumn({ statusValue, statusLabel, borderColor, proposals, onCardClick }: {
    statusValue: string
    statusLabel: string
    borderColor: string
    proposals: Proposal[]
    onCardClick: (leadId: string) => void
}) {
    const { setNodeRef, isOver } = useDroppable({ id: statusValue })
    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col rounded-xl p-4 border shadow-sm bg-card dark:bg-card overflow-hidden transition-all ${
                isOver ? 'border-secondary ring-2 ring-secondary/20' : 'border-muted-foreground/30'
            }`}
            style={{ borderTop: `4px solid ${borderColor}` }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2 flex-1">
                    <h3 className="font-bold text-foreground/80 dark:text-foreground text-[13px] uppercase tracking-widest leading-none truncate">
                        {statusLabel}
                    </h3>
                    <span className="bg-card px-2 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground border border-muted-foreground/30 flex-shrink-0">
                        {proposals.length}
                    </span>
                </div>
            </div>
            {/* Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pb-4 min-h-0">
                <SortableContext id={statusValue} items={proposals.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {proposals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <FileText size={20} className="text-muted-foreground/30 mb-1.5" />
                            <p className="text-[10px] text-muted-foreground/50">Nenhuma proposta</p>
                        </div>
                    ) : (
                        proposals.map(proposal => (
                            <SortableProposalCard
                                key={proposal.id}
                                proposal={proposal}
                                onClick={() => onCardClick(proposal.lead_id)}
                            />
                        ))
                    )}
                </SortableContext>
            </div>
        </div>
    )
}

export default function ProposalsClient() {
    const [proposals, setProposals] = useState<Proposal[]>([])
    const [filtered, setFiltered] = useState<Proposal[]>([])
    const [loading, setLoading] = useState(true)
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list')
    const [activeDragProposal, setActiveDragProposal] = useState<Proposal | null>(null)
    const router = useRouter()

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    useEffect(() => {
        async function load() {
            const { profile } = await getProfile()
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id)
                const res = await getAllProposals(profile.tenant_id)
                if (res.success && res.data) {
                    setProposals(res.data as Proposal[])
                    setFiltered(res.data as Proposal[])
                }
            }
            setLoading(false)
        }
        load()
    }, [])

    useEffect(() => {
        let result = [...proposals]
        if (searchTerm) {
            const q = searchTerm.toLowerCase()
            result = result.filter(p =>
                (p.contact?.name || '').toLowerCase().includes(q) ||
                (p.property?.title || '').toLowerCase().includes(q) ||
                (p.lead?.property_interest || '').toLowerCase().includes(q)
            )
        }
        if (statusFilter !== 'all') {
            result = result.filter(p => p.status === statusFilter)
        }
        setFiltered(result)
    }, [searchTerm, statusFilter, proposals])

    const handleStatusChange = async (proposalId: string, newStatus: string) => {
        setUpdatingId(proposalId)
        const res = await updateProposalStatus(proposalId, newStatus)
        if (res.success) {
            setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p))
            toast.success('Status atualizado')
        } else {
            toast.error('Erro ao atualizar status')
        }
        setUpdatingId(null)
    }

    const handleOpenLead = (leadId: string) => {
        router.push(`/leads?id=${leadId}`)
    }

    const handleDragStart = (event: DragStartEvent) => {
        const draggedId = event.active.id.toString()
        const proposal = proposals.find(p => p.id === draggedId)
        if (proposal) setActiveDragProposal(proposal)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveDragProposal(null)
        const { active, over } = event
        if (!over) return

        const proposalId = active.id.toString()
        const overId = over.id.toString()
        const proposal = proposals.find(p => p.id === proposalId)
        if (!proposal) return

        // Determinar o novo status: pode ser o ID da coluna (droppable) ou outro card
        const statusValues = STATUS_OPTIONS.filter(s => s.value !== 'all').map(s => s.value)
        let newStatus = overId

        if (!statusValues.includes(overId)) {
            // Dropped sobre outro card - pegar o status desse card
            const overProposal = proposals.find(p => p.id === overId)
            if (overProposal) newStatus = overProposal.status
            else return
        }

        if (proposal.status !== newStatus) {
            // Atualização otimista
            const oldProposals = [...proposals]
            setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p))

            const res = await updateProposalStatus(proposalId, newStatus)
            if (res.success) {
                toast.success(`Movido para "${getStatusLabel(newStatus)}"`)
            } else {
                toast.error('Erro ao atualizar status')
                setProposals(oldProposals)
            }
        }
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
        )
    }

    return (
        <div className="max-w-[1600px] mx-auto flex flex-col gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader title="Propostas">
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:flex-none md:w-[260px] order-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente ou imóvel..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/30"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative order-3">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/30 cursor-pointer"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm shrink-0 order-2">
                        <button
                            onClick={() => setViewMode('pipeline')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'pipeline' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}`}
                            title="Visualização em Pipeline"
                        >
                            <Columns3 size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}`}
                            title="Visualização em Lista"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </PageHeader>

            {/* Contadores - apenas na lista */}
            {viewMode === 'list' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STATUS_OPTIONS.filter(s => s.value !== 'all').map(status => {
                    const count = proposals.filter(p => p.status === status.value).length
                    return (
                        <button
                            key={status.value}
                            onClick={() => setStatusFilter(statusFilter === status.value ? 'all' : status.value)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                                statusFilter === status.value 
                                    ? 'border-secondary bg-secondary/10' 
                                    : 'border-border/40 bg-card hover:border-border'
                            }`}
                        >
                            <span className="text-xs font-bold text-foreground">{status.label}</span>
                            <span className={`text-lg font-black ${count > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>{count}</span>
                        </button>
                    )
                })}
            </div>
            )}

            {/* View: Lista ou Pipeline */}
            {viewMode === 'list' ? (
                /* ── LISTA ── */
                filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                            <FileText size={28} className="text-muted-foreground/50" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-foreground">Nenhuma proposta encontrada</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {searchTerm || statusFilter !== 'all' 
                                    ? 'Tente ajustar os filtros de busca.' 
                                    : 'As propostas criadas nos leads aparecerão aqui.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border/40">
                                        <th className="text-center px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider">Cliente</th>
                                        <th className="text-center px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider hidden md:table-cell">Imóvel</th>
                                        <th className="text-center px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider">Status</th>
                                        <th className="text-center px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider hidden lg:table-cell">Atualizado</th>
                                        <th className="text-center px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(proposal => (
                                        <tr 
                                            key={proposal.id} 
                                            className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate">
                                                        {proposal.contact?.name || '—'}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        {proposal.contact?.phone || proposal.contact?.email || '—'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell text-center">
                                                <div className="min-w-0 text-center">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {proposal.property?.title || proposal.lead?.property_interest || '—'}
                                                    </p>
                                                    {proposal.property?.address_city && (
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {proposal.property.address_city}{proposal.property.address_state ? ` - ${proposal.property.address_state}` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="relative">
                                                    <select
                                                        value={proposal.status}
                                                        onChange={e => handleStatusChange(proposal.id, e.target.value)}
                                                        disabled={updatingId === proposal.id}
                                                        className={`appearance-none text-[11px] font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 ${getStatusBadge(proposal.status)} ${updatingId === proposal.id ? 'opacity-50' : ''}`}
                                                    >
                                                        {STATUS_OPTIONS.filter(s => s.value !== 'all').map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell text-center">
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {new Date(proposal.updated_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleOpenLead(proposal.lead_id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-foreground border border-border/40 hover:bg-muted/40 rounded-lg transition-all"
                                                >
                                                    <Eye size={12} />
                                                    Ver Lead
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                /* ── PIPELINE com DnD ── */
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 min-h-[60vh]">
                        {STATUS_OPTIONS.filter(s => s.value !== 'all').map(status => (
                            <DroppableStatusColumn
                                key={status.value}
                                statusValue={status.value}
                                statusLabel={status.label}
                                borderColor={STATUS_PIPELINE_COLORS[status.value] || '#6B7280'}
                                proposals={filtered.filter(p => p.status === status.value)}
                                onCardClick={handleOpenLead}
                            />
                        ))}
                    </div>
                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
                    }}>
                        {activeDragProposal ? (
                            <div className="w-[280px] bg-white dark:bg-card border border-border/40 rounded-xl p-3.5 shadow-2xl">
                                <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                                        <span className="text-[11px] font-black text-secondary-foreground">
                                            {(activeDragProposal.contact?.name || '?').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-foreground truncate leading-tight">
                                            {activeDragProposal.contact?.name || '—'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">
                                            {activeDragProposal.contact?.phone || activeDragProposal.contact?.email || ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="mb-2.5">
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {activeDragProposal.property?.title || activeDragProposal.lead?.property_interest || 'Imóvel não especificado'}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                    <span className="text-xs font-bold text-foreground">
                                        R$ {activeDragProposal.value ? parseFloat(activeDragProposal.value.toString()).toLocaleString('pt-BR') : '0'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(activeDragProposal.updated_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}
        </div>
    )
}
