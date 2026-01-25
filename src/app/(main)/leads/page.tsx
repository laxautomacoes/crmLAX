'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { formatPhone } from '@/lib/utils/phone'
import { FormInput } from '@/components/shared/forms/FormInput'
import { LeadsHeader } from '@/components/dashboard/leads/LeadsHeader'
import { PipelineBoard } from '@/components/dashboard/leads/PipelineBoard'
import { Modal } from '@/components/shared/Modal'
import { LeadModal } from '@/components/dashboard/leads/LeadModal'
import { getProfile, getBrokers } from '@/app/_actions/profile'
import { getPipelineData, deleteLead } from '@/app/_actions/leads'
import { createStage, deleteStage, duplicateStage, updateStageName } from '@/app/_actions/stages'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

export default function LeadsPage() {
    const [isStageModalOpen, setIsStageModalOpen] = useState(false)
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
    const [newStageName, setNewStageName] = useState('')
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [stages, setStages] = useState<any[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [filteredLeads, setFilteredLeads] = useState<any[]>([])
    const [brokers, setBrokers] = useState<any[]>([])
    const [userRole, setUserRole] = useState<string>('user')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBroker, setSelectedBroker] = useState('all')
    const [editingLead, setEditingLead] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchData = async () => {
        try {
            const { profile } = await getProfile()
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id)
                setUserRole(profile.role)

                const [pipelineResult, brokersResult] = await Promise.all([
                    getPipelineData(profile.tenant_id),
                    profile.role === 'admin' || profile.role === 'superadmin' 
                        ? getBrokers(profile.tenant_id) 
                        : Promise.resolve({ success: true, data: [] })
                ])

                if (pipelineResult.success && pipelineResult.data) {
                    setStages(pipelineResult.data.stages || [])
                    setLeads(pipelineResult.data.leads || [])
                    setFilteredLeads(pipelineResult.data.leads || [])
                }

                if (brokersResult.success) {
                    setBrokers(brokersResult.data || [])
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            toast.error('Erro ao carregar dados do funil')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        let result = leads

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            result = result.filter(lead => 
                lead.name.toLowerCase().includes(term) || 
                lead.phone.includes(term) ||
                lead.interest?.toLowerCase().includes(term)
            )
        }

        if (selectedBroker !== 'all') {
            result = result.filter(lead => lead.assigned_to === selectedBroker)
        }

        setFilteredLeads(result)
    }, [searchTerm, selectedBroker, leads])

    const handleNewStage = async () => {
        if (!newStageName.trim() || !tenantId) return

        const result = await createStage(tenantId, newStageName)
        if (result.success) {
            toast.success('Estágio criado com sucesso!')
            setNewStageName('')
            setIsStageModalOpen(false)
            fetchData()
        } else {
            toast.error('Erro ao criar estágio')
        }
    }

    const handleEditLead = (lead: any) => {
        setEditingLead(lead)
        setIsLeadModalOpen(true)
    }

    const handleDeleteLead = async (leadId: string) => {
        if (!confirm('Tem certeza que deseja excluir este lead?')) return

        const result = await deleteLead(leadId)
        if (result.success) {
            toast.success('Lead excluído com sucesso!')
            fetchData()
        } else {
            toast.error('Erro ao excluir lead: ' + result.error)
        }
    }

    const handleOpenLeadModal = (stageId?: string) => {
        if (stageId) {
            setEditingLead({ status: stageId })
        } else {
            setEditingLead(null)
        }
        setIsLeadModalOpen(true)
    }

    const handleSearch = (term: string) => {
        setSearchTerm(term)
    }

    const handleBrokerChange = (brokerId: string) => {
        setSelectedBroker(brokerId)
    }

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    const handleRenameStage = async (stageId: string, newName: string) => {
        const result = await updateStageName(stageId, newName)
        if (result.success) {
            toast.success('Estágio renomeado com sucesso!')
            fetchData()
        } else {
            toast.error('Erro ao renomear estágio: ' + result.error)
        }
    }

    const handleDeleteStage = async (stageId: string) => {
        if (!confirm('Tem certeza que deseja excluir este estágio? Todos os leads ficarão sem status.')) return

        const result = await deleteStage(stageId)
        if (result.success) {
            toast.success('Estágio excluído com sucesso!')
            fetchData()
        } else {
            toast.error('Erro ao excluir estágio: ' + result.error)
        }
    }

    const handleDuplicateStage = async (stageId: string) => {
        if (!tenantId) return

        const result = await duplicateStage(tenantId, stageId)
        if (result.success) {
            toast.success('Estágio duplicado com sucesso!')
            fetchData()
        } else {
            toast.error('Erro ao duplicar estágio: ' + result.error)
        }
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">Leads</h1>
                <div className="flex items-center justify-center md:justify-end gap-3">
                    <LeadsHeader 
                        onSearch={handleSearch} 
                        brokers={brokers}
                        onBrokerChange={handleBrokerChange}
                        isAdmin={userRole === 'admin' || userRole === 'superadmin'}
                    />
                    <button
                        onClick={() => setIsStageModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted/10 text-foreground rounded-lg transition-all text-sm font-bold shadow-sm whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Novo Estágio
                    </button>
                    <button
                        onClick={() => handleOpenLeadModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary hover:opacity-90 text-secondary-foreground rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Novo Lead
                    </button>
                </div>
            </div>

            <PipelineBoard
                initialStages={stages}
                initialLeads={filteredLeads}
                onRefresh={fetchData}
                onAddLead={handleOpenLeadModal}
                onDeleteStage={handleDeleteStage}
                onDuplicateStage={handleDuplicateStage}
                onRenameStage={handleRenameStage}
                onEditLead={handleEditLead}
                onDeleteLead={handleDeleteLead}
            />

            {/* Modal Novo Estágio */}
            <Modal
                isOpen={isStageModalOpen}
                onClose={() => setIsStageModalOpen(false)}
                title="Novo Estágio"
            >
                <div className="space-y-4">
                    <FormInput
                        label="Nome do Estágio"
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        placeholder="Ex: Qualificação"
                    />
                    <button
                        onClick={handleNewStage}
                        disabled={!newStageName.trim()}
                        className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        Criar Estágio
                    </button>
                </div>
            </Modal>

            {/* Componente Reutilizável de Modal de Lead */}
            {tenantId && (
                <LeadModal
                    isOpen={isLeadModalOpen}
                    onClose={() => {
                        setIsLeadModalOpen(false)
                        setEditingLead(null)
                    }}
                    tenantId={tenantId}
                    stages={stages}
                    onSuccess={fetchData}
                    editingLead={editingLead}
                />
            )}
        </div>
    )
}
