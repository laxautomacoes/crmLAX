'use client'

import { useState, useEffect } from 'react'
import { getAllTenants } from '@/app/_actions/tenant'
import { PageHeader } from '@/components/shared/PageHeader'
import TenantsList from '@/components/superadmin/TenantsList'
import { Search, Plus } from 'lucide-react'

import { CreateTenantModal } from '@/components/superadmin/CreateTenantModal'

export default function TenantsPage() {
    const [search, setSearch] = useState('')
    const [tenants, setTenants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const fetchTenants = async () => {
        setIsLoading(true)
        const result = await getAllTenants()
        if (result.success) {
            setTenants(result.data as any)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchTenants()
    }, [])

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader 
                title="Empresas | Tenants" 
                subtitle="Administre todas as imobiliárias e empresas que utilizam a plataforma"
            >
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-72 order-2 md:order-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                            type="text"
                            placeholder="Buscar por nome ou slug..."
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-[#FFE600] text-[#404F4F] px-4 py-3 md:py-2 rounded-lg text-sm font-bold hover:bg-[#F2DB00] transition-all shadow-sm active:scale-[0.99] whitespace-nowrap flex-1 md:flex-none order-1 md:order-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Empresa
                    </button>
                </div>
            </PageHeader>

            <TenantsList initialTenants={tenants} search={search} onRefresh={fetchTenants} />

            <CreateTenantModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchTenants}
            />
        </div>
    )
}
