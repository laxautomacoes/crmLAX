'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { FormInput } from '@/components/shared/forms/FormInput'
import { LeadsHeader } from '@/components/dashboard/leads/LeadsHeader'
import { PipelineBoard } from '@/components/dashboard/leads/PipelineBoard'
import { Modal } from '@/components/shared/Modal'
import { LeadModal } from '@/components/dashboard/leads/LeadModal'
import { getProfile, getBrokers } from '@/app/_actions/profile'
import { getPipelineData, deleteLead, archiveLead } from '@/app/_actions/leads'
import { createStage, deleteStage, duplicateStage, updateStageName, updateStageColor } from '@/app/_actions/stages'
import { checkPlanFeatureAction } from '@/app/_actions/plan'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import type { Lead } from '@/components/dashboard/leads/PipelineBoard'

export const dynamic = 'force-dynamic'

interface Stage {
    id: string
    name: string
    order_index: number
    color?: string
}

interface Broker {
    id: string
    full_name: string
}

type PipelineLead = Lead & {
    property_interest?: string
    lead_source?: string
    campaign?: string
    property_id?: string
    date?: string | null
}

export default function LeadsPage() {
    const [isStageModalOpen, setIsStageModalOpen] = useState(false)
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
    const [newStageName, setNewStageName] = useState('')
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [stages, setStages] = useState<Stage[]>([])
    const [leads, setLeads] = useState<PipelineLead[]>([])
    const [filteredLeads, setFilteredLeads] = useState<PipelineLead[]>([])
    const [brokers, setBrokers] = useState<Broker[]>([])
    const [userRole, setUserRole] = useState<string>('user')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBroker, setSelectedBroker] = useState('all')
    const [editingLead, setEditingLead] = useState<Partial<PipelineLead> | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [hasAIAccess, setHasAIAccess] = useState(false)
    const searchParams = useSearchParams()
    const leadIdFromUrl = searchParams.get('id')

    const fetchData = async () => {
        try {
            const { profile } = await getProfile()
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id)
                setUserRole(profile.role)

                const [pipelineResult, brokersResult, aiAccessResult] = await Promise.all([
                    getPipelineData(profile.tenant_id),
                    profile.role === 'admin' || profile.role === 'superadmin' 
                        ? getBrokers(profile.tenant_id) 
                        : Promise.resolve({ success: true, data: [] }),
                    checkPlanFeatureAction(profile.tenant_id, 'ai')
                ])

                if (pipelineResult.success && pipelineResult.data) {
                    setStages((pipelineResult.data.stages || []) as Stage[])
                    const pipelineLeads = (pipelineResult.data.leads || []) as PipelineLead[]
                    setLeads(pipelineLeads)
                    setFilteredLeads(pipelineLeads)
                }

                if (brokersResult.success) {
                    setBrokers((brokersResult.data || []) as Broker[])
                }
                setHasAIAccess(aiAccessResult)
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

    useEffect(() => {
        if (leadIdFromUrl && leads.length > 0) {
            const leadToEdit = leads.find(l => l.id === leadIdFromUrl)
            if (leadToEdit) {
                setEditingLead(leadToEdit)
                setIsLeadModalOpen(true)
            }
        }
    }, [leadIdFromUrl, leads])

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

    const handleEditLead = (lead: PipelineLead) => {
        setEditingLead(lead)
        setIsLeadModalOpen(true)
    }

    const handleDeleteLead = async (leadId: string) => {
        if (!confirm('Tem certeza que deseja excluir este lead permanentemente?')) return

        const result = await deleteLead(leadId)
        if (result.success) {
            toast.success('Lead excluído com sucesso!')
            fetchData()
        } else {
            toast.error('Erro ao excluir lead: ' + result.error)
        }
    }

    const handleArchiveLead = async (leadId: string) => {
        if (!confirm('Tem certeza que deseja arquivar este lead? Ele não aparecerá mais no funil.')) return

        const result = await archiveLead(leadId)
        if (result.success) {
            toast.success('Lead arquivado com sucesso!')
            fetchData()
        } else {
            toast.error('Erro ao arquivar lead: ' + result.error)
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

    const handleUpdateStageColor = async (stageId: string, color: string) => {
        const result = await updateStageColor(stageId, color)
        if (result.success) {
            toast.success('Cor atualizada!')
            fetchData()
        } else {
            toast.error('Erro ao atualizar cor: ' + result.error)
        }
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader title="Leads">
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto">
                    <button
                        onClick={() => handleOpenLeadModal()}
                        className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-secondary hover:opacity-90 text-secondary-foreground rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap flex-1 md:flex-none order-1 md:order-3"
                    >
                        <Plus size={18} />
                        Novo Lead
                    </button>
                    <button
                        onClick={() => setIsStageModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 border border-border bg-card hover:bg-muted/10 text-foreground rounded-lg transition-all text-sm font-bold shadow-sm whitespace-nowrap flex-1 md:flex-none order-2 md:order-2"
                    >
                        <Plus size={18} />
                        Novo Estágio
                    </button>
                    <LeadsHeader 
                        onSearch={handleSearch} 
                        brokers={brokers}
                        onBrokerChange={handleBrokerChange}
                        isAdmin={userRole === 'admin' || userRole === 'superadmin'}
                    />
                </div>
            </PageHeader>

            <PipelineBoard
                initialStages={stages}
                initialLeads={filteredLeads}
                onRefresh={fetchData}
                onAddLead={handleOpenLeadModal}
                onDeleteStage={handleDeleteStage}
                onDuplicateStage={handleDuplicateStage}
                onRenameStage={handleRenameStage}
                onUpdateStageColor={handleUpdateStageColor}
                onEditLead={handleEditLead}
                onDeleteLead={handleDeleteLead}
                onArchiveLead={handleArchiveLead}
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
                    hasAIAccess={hasAIAccess}
                />
            )}
        </div>
    )
}
