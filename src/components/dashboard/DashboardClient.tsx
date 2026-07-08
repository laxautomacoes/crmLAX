'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Filter, Plus } from 'lucide-react'
import KPICards from '@/components/dashboard/KPICards'
import SalesFunnel from '@/components/dashboard/SalesFunnel'
import RecentLeadsList from '@/components/dashboard/RecentLeadsList'
import ROIDashboard from '@/components/dashboard/ROIDashboard'
import { PageHeader } from '@/components/shared/PageHeader'
import type { DashboardMetrics, ROIMetrics } from '@/app/_actions/dashboard'

// Lazy-loaded modals — só carregam quando o usuário abre
const FilterModal = dynamic(() => import('@/components/dashboard/FilterModal').then(mod => ({ default: mod.FilterModal })), { ssr: false })
const LeadModal = dynamic(() => import('@/components/dashboard/leads/LeadModal').then(mod => ({ default: mod.LeadModal })), { ssr: false })

export interface DashboardFilter {
    period: string
    startDate: string
    endDate: string
    stageId: string
    sourceId: string
    brokerId: string
}

export interface FilterOptions {
    stages: Array<{ id: string; name: string; color?: string | null }>
    sources: Array<{ id: string; name: string }>
    members: Array<{ id: string; name: string }>
}

const INITIAL_FILTERS: DashboardFilter = {
    period: '',
    startDate: '',
    endDate: '',
    stageId: '',
    sourceId: '',
    brokerId: '',
}

interface DashboardClientProps {
    metrics: DashboardMetrics
    roiData: ROIMetrics
    profileName: string
    tenantId: string
    userRole: string
    isAdmin: boolean
    filterOptions: FilterOptions
}

export default function DashboardClient({ metrics, roiData, profileName, tenantId, userRole, isAdmin, filterOptions }: DashboardClientProps) {
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
    const [filters, setFilters] = useState<DashboardFilter>(INITIAL_FILTERS)
    const router = useRouter()

    // Contar filtros ativos
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.period) count++
        if (filters.startDate || filters.endDate) count++
        if (filters.stageId) count++
        if (filters.sourceId) count++
        if (filters.brokerId) count++
        return count
    }, [filters])

    // Filtrar leads recentes baseado nos filtros ativos
    const filteredRecentLeads = useMemo(() => {
        let leads = [...metrics.recentLeads]

        // Filtro por período
        if (filters.period || (filters.startDate && filters.endDate)) {
            const now = new Date()
            let start: Date | null = null
            let end: Date | null = null

            switch (filters.period) {
                case 'today':
                    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
                    break
                case '7days':
                    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    end = now
                    break
                case '30days':
                    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                    end = now
                    break
                case 'month':
                    start = new Date(now.getFullYear(), now.getMonth(), 1)
                    end = now
                    break
                case 'custom':
                    if (filters.startDate) start = new Date(filters.startDate + 'T00:00:00')
                    if (filters.endDate) end = new Date(filters.endDate + 'T23:59:59')
                    break
            }

            if (start || end) {
                leads = leads.filter(lead => {
                    const leadDate = new Date(lead.created_at)
                    if (start && leadDate < start) return false
                    if (end && leadDate > end) return false
                    return true
                })
            }
        }

        // Filtro por estágio
        if (filters.stageId) {
            const stageName = filterOptions.stages.find(s => s.id === filters.stageId)?.name
            if (stageName) {
                leads = leads.filter(lead => lead.status === stageName)
            }
        }

        // Filtro por origem (source do lead)
        if (filters.sourceId) {
            const sourceName = filterOptions.sources.find(s => s.id === filters.sourceId)?.name
            if (sourceName) {
                leads = leads.filter(lead =>
                    lead.interest?.toLowerCase().includes(sourceName.toLowerCase())
                )
            }
        }

        return leads
    }, [metrics.recentLeads, filters, filterOptions])

    // Filtrar funil de vendas por estágio selecionado
    const filteredFunnelSteps = useMemo(() => {
        if (!filters.stageId) return metrics.funnelSteps
        return metrics.funnelSteps.filter(step => step.stageId === filters.stageId)
    }, [metrics.funnelSteps, filters.stageId])

    // Mapear os estágios do funil para o formato esperado pelo LeadModal
    const stages = metrics.funnelSteps.map(step => ({
        id: step.stageId,
        name: step.label
    }))

    const handleSuccess = () => {
        router.refresh()
    }

    const handleClearFilters = () => {
        setFilters(INITIAL_FILTERS)
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">

            {/* Header / Actions Section */}
            <PageHeader title="Dashboard">
                <div className="grid grid-cols-2 md:grid-flow-col md:auto-cols-max gap-2 md:gap-3 w-full md:w-max">
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={`w-full md:w-auto md:min-w-[130px] h-[34px] flex items-center justify-center gap-2 px-4 border rounded-lg transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap outline-none focus:ring-2 shadow-sm relative ${
                            activeFilterCount > 0
                                ? 'bg-secondary/10 border-secondary text-secondary-foreground hover:bg-secondary/20 focus:ring-secondary/50'
                                : 'bg-card border-muted-foreground/30 text-foreground hover:bg-muted/50 focus:ring-ring/50'
                        }`}
                    >
                        <Filter size={14} strokeWidth={1} />
                        <span>FILTRAR</span>
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-secondary text-secondary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setIsLeadModalOpen(true)}
                        className="w-full md:w-auto md:min-w-[130px] h-[34px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm whitespace-nowrap"
                    >
                        <Plus size={14} strokeWidth={1} />
                        <span>NOVO LEAD</span>
                    </button>
                </div>
            </PageHeader>

            <hr className="hidden md:block border-border" />

            <KPICards kpis={metrics.kpis} />

            {/* Seção ROI - Apenas para Admins */}
            {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'super administrador') && (
                <div className="pt-4">
                    <ROIDashboard data={roiData} />
                </div>
            )}

            <SalesFunnel funnelSteps={filteredFunnelSteps} />
            <RecentLeadsList recentLeads={filteredRecentLeads} />

            <FilterModal
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                setFilters={setFilters}
                filterOptions={filterOptions}
                isAdmin={isAdmin}
                onClear={handleClearFilters}
            />

            <LeadModal
                isOpen={isLeadModalOpen}
                onClose={() => setIsLeadModalOpen(false)}
                tenantId={tenantId}
                stages={stages}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
