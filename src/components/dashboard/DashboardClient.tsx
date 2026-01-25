'use client'

import { useState } from 'react'
import { Plus, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'
import KPICards from '@/components/dashboard/KPICards'
import SalesFunnel from '@/components/dashboard/SalesFunnel'
import RecentLeadsList from '@/components/dashboard/RecentLeadsList'
import { FilterModal } from '@/components/dashboard/FilterModal'
import { LeadModal } from '@/components/dashboard/leads/LeadModal'
import type { DashboardMetrics } from '@/app/_actions/dashboard'

interface DashboardClientProps {
    metrics: DashboardMetrics
    profileName: string
    tenantId: string
}

export default function DashboardClient({ metrics, profileName, tenantId }: DashboardClientProps) {
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
    const router = useRouter()

    // Mapear os estágios do funil para o formato esperado pelo LeadModal
    const stages = metrics.funnelSteps.map(step => ({
        id: step.stageId,
        name: step.label
    }))

    const handleSuccess = () => {
        router.refresh()
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            {/* Mobile-only Welcome Message */}
            <div className="md:hidden text-center -mt-2 mb-2">
                <p className="text-sm text-muted-foreground">
                    Bem-vindo, <span className="font-semibold text-foreground">{profileName}</span>
                </p>
            </div>

            {/* Header / Actions Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">
                    Dashboard
                </h1>

                <div className="flex items-center justify-center md:justify-end gap-3">
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className="flex items-center gap-2 bg-card border border-border text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium"
                    >
                        <Filter size={18} />
                        Filtrar
                    </button>
                    <button
                        onClick={() => setIsLeadModalOpen(true)}
                        className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-sm font-bold shadow-sm"
                    >
                        <Plus size={18} />
                        Novo Lead
                    </button>
                </div>
            </div>

            <KPICards kpis={metrics.kpis} />
            <SalesFunnel funnelSteps={metrics.funnelSteps} />
            <RecentLeadsList recentLeads={metrics.recentLeads} />

            <FilterModal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />

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
