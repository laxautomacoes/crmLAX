'use client'

import { useState, useEffect, useMemo } from 'react'
import nextDynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Plus, Kanban, Filter } from 'lucide-react'
import { FormInput } from '@/components/shared/forms/FormInput'
import { LeadsHeader } from '@/components/dashboard/leads/LeadsHeader'
import { PipelineBoard } from '@/components/dashboard/leads/PipelineBoard'
import { LeadsFunnelView } from '@/components/dashboard/leads/LeadsFunnelView'
import { Modal } from '@/components/shared/Modal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { getProfile, getBrokers } from '@/app/_actions/profile'
import { getLeadTemperature } from '@/lib/utils/lead-temperature'
import type { LeadsFilter } from '@/components/dashboard/leads/LeadsFilterModal'

// Lazy-loaded modals — só carregam quando o usuário abre (~347KB economizados no bundle inicial)
const LeadModal = nextDynamic(() => import('@/components/dashboard/leads/LeadModal').then(mod => ({ default: mod.LeadModal })), { ssr: false })
const LeadBulkImportModal = nextDynamic(() => import('@/components/dashboard/leads/LeadBulkImportModal').then(mod => ({ default: mod.LeadBulkImportModal })), { ssr: false })
const ClientModal = nextDynamic(() => import('@/components/dashboard/clients/ClientModal').then(mod => ({ default: mod.ClientModal })), { ssr: false })
const LeadsFilterModal = nextDynamic(() => import('@/components/dashboard/leads/LeadsFilterModal').then(mod => ({ default: mod.LeadsFilterModal })), { ssr: false })

import { getPipelineData, deleteLead, archiveLead } from '@/app/_actions/leads'
import { getFunnels, createFunnel, updateFunnel, deleteFunnel, setPreferredFunnel } from '@/app/_actions/funnels'
import { FunnelSelector } from '@/components/dashboard/leads/FunnelSelector'
import { getClientById } from '@/app/_actions/clients'
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
    role?: string
}

type PipelineLead = Lead & {
    property_interest?: string
    lead_source?: string
    source?: string
    campaign?: string
    property_id?: string
    date?: string | null
    created_at?: string | null
}

const initialFilters: LeadsFilter = {
    period: '',
    startDate: '',
    endDate: '',
    stageId: '',
    source: '',
    campaign: '',
    brokerId: '',
    temperature: '',
    hasProposal: '',
}

export default function LeadsPage() {
    const [isStageModalOpen, setIsStageModalOpen] = useState(false)
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
    const [isLeadBulkImportModalOpen, setIsLeadBulkImportModalOpen] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [newStageName, setNewStageName] = useState('')
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [stages, setStages] = useState<Stage[]>([])
    const [leads, setLeads] = useState<PipelineLead[]>([])
    const [filteredLeads, setFilteredLeads] = useState<PipelineLead[]>([])
    const [brokers, setBrokers] = useState<Broker[]>([])
    const [userRole, setUserRole] = useState<string>('user')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [funnels, setFunnels] = useState<any[]>([])
    const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null)
    const [preferredFunnelId, setPreferredFunnelId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filters, setFilters] = useState<LeadsFilter>(initialFilters)
    const [editingLead, setEditingLead] = useState<Partial<PipelineLead> | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [hasAIAccess, setHasAIAccess] = useState(false)
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [proposalClient, setProposalClient] = useState<any>(null)
    const [pendingProposalLeadId, setPendingProposalLeadId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'pipeline' | 'funnel'>('pipeline')
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean
        title: string
        message: React.ReactNode
        confirmLabel?: string
        variant?: 'danger' | 'warning' | 'success'
        onConfirm: () => void
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    })

    const searchParams = useSearchParams()
    const leadIdFromUrl = searchParams.get('id')

    const fetchData = async (funnelIdToFetch?: string) => {
        try {
            const { profile } = await getProfile()
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id)
                setUserRole(profile.role)
                setCurrentUserId(profile.id)

                const userPreferred = (profile as any)?.default_funnel_id || (typeof window !== 'undefined' ? localStorage.getItem(`crm_pref_funnel_${profile.tenant_id}`) : null)
                if (userPreferred) {
                    setPreferredFunnelId(userPreferred)
                }

                const activeFunnelId = funnelIdToFetch || selectedFunnelId || userPreferred || undefined;

                const [pipelineResult, brokersResult, aiAccessResult, funnelsResult] = await Promise.all([
                    getPipelineData(profile.tenant_id, activeFunnelId),
                    profile.role === 'admin' || profile.role === 'superadmin' 
                        ? getBrokers(profile.tenant_id) 
                        : Promise.resolve({ success: true, data: [] }),
                    checkPlanFeatureAction(profile.tenant_id, 'ai'),
                    getFunnels(profile.tenant_id)
                ])

                if (funnelsResult.success && funnelsResult.data) {
                    setFunnels(funnelsResult.data)
                    const availableFunnels = funnelsResult.data
                    if (funnelIdToFetch) {
                        setSelectedFunnelId(funnelIdToFetch)
                    } else if (selectedFunnelId && availableFunnels.some((f: any) => f.id === selectedFunnelId)) {
                        setSelectedFunnelId(selectedFunnelId)
                    } else if (userPreferred && availableFunnels.some((f: any) => f.id === userPreferred)) {
                        setSelectedFunnelId(userPreferred)
                    } else if (availableFunnels.length > 0) {
                        setSelectedFunnelId(availableFunnels[0].id)
                    }
                }

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

    // Lista dinâmica de origens presentes nos leads
    const availableSources = useMemo(() => {
        const set = new Set<string>()
        leads.forEach(l => {
            if (l.lead_source) set.add(l.lead_source)
            if (l.source) set.add(l.source)
        })
        return Array.from(set).filter(Boolean)
    }, [leads])

    // Lista dinâmica de campanhas presentes nos leads
    const availableCampaigns = useMemo(() => {
        const set = new Set<string>()
        leads.forEach(l => {
            if (l.campaign && l.campaign.trim()) set.add(l.campaign.trim())
        })
        return Array.from(set).filter(Boolean)
    }, [leads])

    // Contador de filtros ativos
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.period) count++
        if (filters.startDate || filters.endDate) count++
        if (filters.stageId) count++
        if (filters.source) count++
        if (filters.campaign) count++
        if (filters.brokerId) count++
        if (filters.temperature) count++
        if (filters.hasProposal) count++
        return count
    }, [filters])

    // Filtragem reativa
    useEffect(() => {
        let result = leads

        // 1. Busca textual
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            result = result.filter(lead => 
                lead.name.toLowerCase().includes(term) || 
                lead.phone.includes(term) ||
                lead.interest?.toLowerCase().includes(term) ||
                lead.campaign?.toLowerCase().includes(term) ||
                lead.lead_source?.toLowerCase().includes(term) ||
                lead.source?.toLowerCase().includes(term) ||
                lead.email?.toLowerCase().includes(term) ||
                lead.broker_name?.toLowerCase().includes(term)
            )
        }

        // 2. Período (created_at ou date)
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
                result = result.filter(lead => {
                    const rawDate = lead.created_at || (lead.date ? `${lead.date}T12:00:00` : null)
                    if (!rawDate) return false
                    const leadDate = new Date(rawDate)
                    if (start && leadDate < start) return false
                    if (end && leadDate > end) return false
                    return true
                })
            }
        }

        // 3. Estágio
        if (filters.stageId) {
            result = result.filter(lead => lead.status === filters.stageId)
        }

        // 4. Origem
        if (filters.source) {
            const src = filters.source.toLowerCase()
            result = result.filter(lead => 
                (lead.lead_source && lead.lead_source.toLowerCase() === src) ||
                (lead.source && lead.source.toLowerCase() === src) ||
                (lead.interest && lead.interest.toLowerCase().includes(src))
            )
        }

        // 5. Campanha
        if (filters.campaign) {
            const cmp = filters.campaign.toLowerCase()
            result = result.filter(lead => 
                lead.campaign && lead.campaign.toLowerCase() === cmp
            )
        }

        // 5. Corretor
        if (filters.brokerId) {
            if (filters.brokerId === 'unassigned') {
                result = result.filter(lead => !lead.assigned_to)
            } else {
                result = result.filter(lead => lead.assigned_to === filters.brokerId)
            }
        }

        // 6. Temperatura
        if (filters.temperature) {
            result = result.filter(lead => {
                const temp = getLeadTemperature(lead.last_interaction_at)
                return temp === filters.temperature
            })
        }

        // 7. Proposta Comercial
        if (filters.hasProposal) {
            if (filters.hasProposal === 'yes') {
                result = result.filter(lead => lead.has_proposal)
            } else if (filters.hasProposal === 'no') {
                result = result.filter(lead => !lead.has_proposal)
            }
        }

        setFilteredLeads(result)
    }, [searchTerm, filters, leads])

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
        if (!newStageName.trim() || !tenantId || !selectedFunnelId) return

        const result = await createStage(tenantId, selectedFunnelId, newStageName)
        if (result.success) {
            toast.success('Estágio criado com sucesso!')
            setNewStageName('')
            setIsStageModalOpen(false)
            fetchData(selectedFunnelId || undefined)
        } else {
            toast.error('Erro ao criar estágio')
        }
    }

    const handleEditLead = (lead: PipelineLead) => {
        setEditingLead(lead)
        setIsLeadModalOpen(true)
    }

    const handleDeleteLead = (leadId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Lead',
            message: 'Tem certeza que deseja excluir este lead permanentemente? Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                const result = await deleteLead(leadId)
                if (result.success) {
                    toast.success('Lead excluído com sucesso!')
                    fetchData(selectedFunnelId || undefined)
                } else {
                    toast.error('Erro ao excluir lead: ' + result.error)
                }
            }
        })
    }

    const handleArchiveLead = (leadId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Arquivar Lead',
            message: 'Tem certeza que deseja arquivar este lead? Ele não aparecerá mais no funil.',
            confirmLabel: 'Arquivar',
            variant: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                const result = await archiveLead(leadId)
                if (result.success) {
                    toast.success('Lead arquivado com sucesso!')
                    fetchData(selectedFunnelId || undefined)
                } else {
                    toast.error('Erro ao arquivar lead: ' + result.error)
                }
            }
        })
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

    const handleClearFilters = () => {
        setFilters(initialFilters)
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
            fetchData(selectedFunnelId || undefined)
        } else {
            toast.error('Erro ao renomear estágio: ' + result.error)
        }
    }

    const handleDeleteStage = (stageId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Estágio',
            message: 'Tem certeza que deseja excluir este estágio? Todos os leads deste estágio ficarão sem status.',
            confirmLabel: 'Excluir',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                const result = await deleteStage(stageId)
                if (result.success) {
                    toast.success('Estágio excluído com sucesso!')
                    fetchData(selectedFunnelId || undefined)
                } else {
                    toast.error('Erro ao excluir estágio: ' + result.error)
                }
            }
        })
    }

    const handleDuplicateStage = async (stageId: string) => {
        if (!tenantId) return

        const result = await duplicateStage(tenantId, stageId)
        if (result.success) {
            toast.success('Estágio duplicado com sucesso!')
            fetchData(selectedFunnelId || undefined)
        } else {
            toast.error('Erro ao duplicar estágio: ' + result.error)
        }
    }

    const handleUpdateStageColor = async (stageId: string, color: string) => {
        const result = await updateStageColor(stageId, color)
        if (result.success) {
            toast.success('Cor atualizada!')
            fetchData(selectedFunnelId || undefined)
        } else {
            toast.error('Erro ao atualizar cor: ' + result.error)
        }
    }

    const handleSetPreferredFunnel = async (funnelId: string | null) => {
        if (!tenantId) return
        setPreferredFunnelId(funnelId)
        try {
            if (typeof window !== 'undefined') {
                if (funnelId) {
                    localStorage.setItem(`crm_pref_funnel_${tenantId}`, funnelId)
                } else {
                    localStorage.removeItem(`crm_pref_funnel_${tenantId}`)
                }
            }
            const result = await setPreferredFunnel(funnelId)
            if (result.success) {
                toast.success(funnelId ? 'Funil definido como preferido!' : 'Funil preferido removido!')
            } else {
                toast.error('Erro ao salvar funil preferido: ' + (result.error || ''))
            }
        } catch (e: any) {
            console.error('Erro ao definir funil preferido:', e)
            toast.error('Erro ao definir funil preferido')
        }
    }

    return (
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300 h-[calc(100vh-120px)] md:h-[calc(100vh-100px)]">
            <PageHeader title="Leads" subtitle={`${filteredLeads.length} leads encontrados`}>
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto">
                    <LeadsHeader 
                        onSearch={handleSearch} 
                        onOpenFilter={() => setIsFilterModalOpen(true)}
                        activeFilterCount={activeFilterCount}
                        viewToggle={
                            <div className="h-[34px] flex bg-card border border-border rounded-lg overflow-hidden shadow-sm shrink-0">
                                <button
                                    onClick={() => setViewMode('pipeline')}
                                    className={`flex-1 px-3 flex items-center justify-center transition-all ${
                                        viewMode === 'pipeline'
                                            ? 'bg-secondary text-secondary-foreground'
                                            : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                    title="Visualização em Kanban"
                                >
                                    <Kanban size={14} strokeWidth={1} />
                                </button>
                                <button
                                    onClick={() => setViewMode('funnel')}
                                    className={`flex-1 px-3 flex items-center justify-center transition-all ${
                                        viewMode === 'funnel'
                                            ? 'bg-secondary text-secondary-foreground'
                                            : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                    title="Visualização em Funil"
                                >
                                    <Filter size={14} strokeWidth={1} />
                                </button>
                            </div>
                        }
                    >
                        <button
                            onClick={() => handleOpenLeadModal()}
                            className="min-w-[130px] h-[34px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm whitespace-nowrap"
                        >
                            <Plus size={14} strokeWidth={1} />
                            Novo Lead
                        </button>
                    </LeadsHeader>
                </div>
            </PageHeader>

            <hr className="hidden md:block border-border -mt-2" />

            <div className="flex w-full">
                <FunnelSelector 
                    funnels={funnels}
                    selectedFunnelId={selectedFunnelId}
                    preferredFunnelId={preferredFunnelId}
                    currentUserId={currentUserId}
                    onSelect={(id) => {
                        setSelectedFunnelId(id)
                        fetchData(id)
                    }}
                    onSetPreferred={handleSetPreferredFunnel}
                    onCreate={async (name) => {
                        if (!tenantId) return { success: false, error: 'Sem tenant' };
                        const result = await createFunnel(tenantId, name);
                        if (result.success) {
                            await fetchData(result.data.id);
                        }
                        return result;
                    }}
                    onEdit={async (id, data) => {
                        const result = await updateFunnel(id, data);
                        if (result.success) await fetchData(selectedFunnelId || undefined);
                        return result;
                    }}
                    onDelete={async (id) => {
                        if (!tenantId) return { success: false, error: 'Sem tenant' };
                        const result = await deleteFunnel(tenantId, id);
                        if (result.success) {
                            if (preferredFunnelId === id) {
                                handleSetPreferredFunnel(null);
                            }
                            setSelectedFunnelId(null);
                            await fetchData(); // Vai pegar o primeiro disponível
                        }
                        return result;
                    }}
                />
            </div>

            {viewMode === 'pipeline' ? (
                <PipelineBoard
                    initialStages={stages}
                    initialLeads={filteredLeads}
                    onRefresh={fetchData}
                    onAddLead={handleOpenLeadModal}
                    onDeleteStage={handleDeleteStage}
                    onDuplicateStage={handleDuplicateStage}
                    onRenameStage={handleRenameStage}
                    onUpdateStageColor={handleUpdateStageColor}
                    onAddStage={() => setIsStageModalOpen(true)}
                    onEditLead={handleEditLead}
                    onDeleteLead={handleDeleteLead}
                    onArchiveLead={handleArchiveLead}
                    onProposalClick={async (contactId, leadId) => {
                        const res = await getClientById(contactId)
                        if (res.success && res.data) {
                            setProposalClient(res.data)
                            setPendingProposalLeadId(leadId)
                            setIsClientModalOpen(true)
                        } else {
                            toast.error('Erro ao buscar cliente vinculado ao lead.')
                        }
                    }}
                />
            ) : (
                <LeadsFunnelView stages={stages} leads={filteredLeads} />
            )}

            {/* Modal Novo Estágio */}
            <Modal
                isOpen={isStageModalOpen}
                onClose={() => setIsStageModalOpen(false)}
                title={
                    <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                        Novo Estágio
                    </h3>
                }
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

            {/* Modal de Filtros Avançados */}
            <LeadsFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                filters={filters}
                setFilters={setFilters}
                stages={stages}
                sources={availableSources}
                campaigns={availableCampaigns}
                brokers={brokers}
                isAdmin={userRole === 'admin' || userRole === 'superadmin'}
                onClear={handleClearFilters}
            />

            {/* Modal de Confirmação (Substitui confirm() nativo) */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmLabel={confirmModal.confirmLabel}
                variant={confirmModal.variant}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Componente Reutilizável de Modal de Lead */}
            {tenantId && isLeadModalOpen && (
                <LeadModal
                    isOpen={isLeadModalOpen}
                    onClose={() => {
                        setIsLeadModalOpen(false)
                        setEditingLead(null)
                    }}
                    tenantId={tenantId}
                    stages={stages}
                    onSuccess={fetchData}
                    editingLead={editingLead ?? undefined}
                    onSelectImportBulk={() => {
                        setIsLeadModalOpen(false)
                        setIsLeadBulkImportModalOpen(true)
                    }}
                    onMakeProposal={async (contactId, leadId) => {
                        setIsLeadModalOpen(false)
                        setEditingLead(null)
                        const res = await getClientById(contactId)
                        if (res.success && res.data) {
                            setProposalClient(res.data)
                            setPendingProposalLeadId(leadId)
                            setIsClientModalOpen(true)
                        } else {
                            toast.error('Erro ao buscar cliente vinculado ao lead.')
                        }
                    }}
                />
            )}

            {/* Modal Importar em Massa (IA/Planilha/PDF) */}
            {tenantId && (
                <LeadBulkImportModal
                    isOpen={isLeadBulkImportModalOpen}
                    onClose={() => setIsLeadBulkImportModalOpen(false)}
                    tenantId={tenantId}
                    stages={stages}
                    brokers={brokers}
                    isAdmin={userRole === 'admin' || userRole === 'superadmin'}
                    onImportSuccess={fetchData}
                />
            )}

            {/* ClientModal para Proposta via Lead */}
            {tenantId && (
                <ClientModal
                    isOpen={isClientModalOpen}
                    onClose={() => {
                        setIsClientModalOpen(false)
                        setProposalClient(null)
                        setPendingProposalLeadId(null)
                    }}
                    tenantId={tenantId}
                    profileId=""
                    editingClient={proposalClient}
                    onSuccess={fetchData}
                    initialTab="proposals"
                    initialProposalLeadId={pendingProposalLeadId}
                />
            )}
        </div>
    )
}
