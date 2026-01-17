'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { formatPhone } from '@/lib/utils/phone'
import { LeadsHeader } from '@/components/dashboard/leads/LeadsHeader'
import { PipelineBoard } from '@/components/dashboard/leads/PipelineBoard'
import { Modal } from '@/components/shared/Modal'
import { getProfile } from '@/app/_actions/profile'
import { getPipelineData, createStage, createLead, updateLead, deleteLead, deleteStage, duplicateStage, updateStageName } from '@/app/_actions/leads'
import { toast } from 'sonner'

export default function LeadsPage() {
    const [isStageModalOpen, setIsStageModalOpen] = useState(false)
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
    const [newStageName, setNewStageName] = useState('')
    const [newLead, setNewLead] = useState({
        name: '',
        phone: '',
        email: '',
        interest: '',
        value: '',
        notes: '',
        stage_id: ''
    })
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [stages, setStages] = useState<any[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchData = async () => {
        try {
            const { profile } = await getProfile()
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id)
                const result = await getPipelineData(profile.tenant_id)
                if (result.success && result.data) {
                    setStages(result.data.stages)
                    setLeads(result.data.leads)
                    if (result.data.stages.length > 0) {
                        setNewLead(prev => ({ ...prev, stage_id: result.data.stages[0].id }))
                    }
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

    const handleCreateLead = async () => {
        if (!newLead.name || !newLead.phone || !tenantId) {
            toast.error('Nome e Telefone são obrigatórios')
            return
        }

        const leadData = {
            ...newLead,
            value: newLead.value ? parseFloat(newLead.value) : 0
        }

        let result;
        if (editingLeadId) {
            result = await updateLead(tenantId, editingLeadId, leadData)
        } else {
            result = await createLead(tenantId, leadData)
        }

        if (result.success) {
            toast.success(editingLeadId ? 'Lead atualizado com sucesso!' : 'Lead criado com sucesso!')
            setIsLeadModalOpen(false)
            setEditingLeadId(null)
            setNewLead({
                name: '',
                phone: '',
                email: '',
                interest: '',
                value: '',
                notes: '',
                stage_id: stages[0]?.id || ''
            })
            fetchData()
        } else {
            toast.error('Erro ao processar lead: ' + result.error)
        }
    }

    const handleEditLead = (lead: any) => {
        setNewLead({
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            interest: lead.interest || '',
            value: lead.value?.toString() || '',
            notes: lead.notes || '',
            stage_id: lead.status
        })
        setEditingLeadId(lead.id)
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
            setNewLead(prev => ({ ...prev, stage_id: stageId }))
        } else if (stages.length > 0) {
            setNewLead(prev => ({ ...prev, stage_id: stages[0].id }))
        }
        setIsLeadModalOpen(true)
    }

    const handleSearch = (term: string) => {
        // Implementar filtro local
        console.log('Pesquisar por:', term)
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
                <h1 className="text-2xl font-bold text-foreground">Leads</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <LeadsHeader onSearch={handleSearch} />
                    <button
                        onClick={() => setIsStageModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted/10 text-foreground rounded-lg transition-all text-sm font-bold shadow-sm"
                    >
                        <Plus size={18} />
                        Novo Estágio
                    </button>
                    <button
                        onClick={() => handleOpenLeadModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99]"
                    >
                        <Plus size={18} />
                        Novo Lead
                    </button>
                </div>
            </div>

            <PipelineBoard
                initialStages={stages}
                initialLeads={leads}
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
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Nome do Estágio</label>
                        <input
                            type="text"
                            value={newStageName}
                            onChange={(e) => setNewStageName(e.target.value)}
                            placeholder="Ex: Qualificação"
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleNewStage}
                        disabled={!newStageName.trim()}
                        className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        Criar Estágio
                    </button>
                </div>
            </Modal>

            {/* Modal Novo Lead */}
            <Modal
                isOpen={isLeadModalOpen}
                onClose={() => {
                    setIsLeadModalOpen(false)
                    setEditingLeadId(null)
                    setNewLead({
                        name: '',
                        phone: '',
                        email: '',
                        interest: '',
                        value: '',
                        notes: '',
                        stage_id: stages[0]?.id || ''
                    })
                }}
                title={editingLeadId ? "Editar Lead" : "Novo Lead"}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1">Nome completo *</label>
                            <input
                                type="text"
                                value={newLead.name}
                                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Telefone *</label>
                            <input
                                type="text"
                                value={newLead.phone}
                                onChange={(e) => setNewLead({ ...newLead, phone: formatPhone(e.target.value) })}
                                placeholder="(48) 99999 9999"
                                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">E-mail</label>
                            <input
                                type="email"
                                value={newLead.email}
                                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1">Interesse</label>
                            <input
                                type="text"
                                value={newLead.interest}
                                onChange={(e) => setNewLead({ ...newLead, interest: e.target.value })}
                                placeholder="Ex: Toyota Corolla 2023"
                                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Estágio Inicial</label>
                            <select
                                value={newLead.stage_id}
                                onChange={(e) => setNewLead({ ...newLead, stage_id: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                            >
                                {stages.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Valor Estimado</label>
                            <input
                                type="number"
                                value={newLead.value}
                                onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1">Notas/Observações</label>
                            <textarea
                                value={newLead.notes}
                                onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all resize-none"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleCreateLead}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 shadow-sm active:scale-[0.99] transition-all"
                    >
                        {editingLeadId ? "Salvar Alterações" : "Criar Lead"}
                    </button>
                </div>
            </Modal>
        </div>
    )
}
