'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { formatPhone } from '@/lib/utils/phone'
import { toast } from 'sonner'
import { createLead, updateLead } from '@/app/_actions/leads'

interface LeadModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string
    stages: Array<{ id: string; name: string }>
    onSuccess: () => void
    editingLead?: any // Para edição
}

export function LeadModal({
    isOpen,
    onClose,
    tenantId,
    stages,
    onSuccess,
    editingLead
}: LeadModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [leadData, setLeadData] = useState({
        name: '',
        phone: '',
        email: '',
        interest: '',
        value: '',
        notes: '',
        stage_id: ''
    })

    useEffect(() => {
        if (editingLead) {
            setLeadData({
                name: editingLead.name || '',
                phone: editingLead.phone ? formatPhone(editingLead.phone) : '',
                email: editingLead.email || '',
                interest: editingLead.interest || '',
                value: editingLead.value?.toString() || '',
                notes: editingLead.notes || '',
                stage_id: editingLead.status || (stages.length > 0 ? stages[0].id : '')
            })
        } else {
            setLeadData({
                name: '',
                phone: '',
                email: '',
                interest: '',
                value: '',
                notes: '',
                stage_id: stages.length > 0 ? stages[0].id : ''
            })
        }
    }, [editingLead, isOpen, stages])

    const handleSubmit = async () => {
        if (!leadData.name || !leadData.phone || !tenantId) {
            toast.error('Nome e Telefone são obrigatórios')
            return
        }

        if (!leadData.stage_id) {
            toast.error('Por favor, selecione um estágio inicial')
            return
        }

        setIsLoading(true)
        try {
            const dataToSubmit = {
                ...leadData,
                value: leadData.value ? parseFloat(leadData.value) : 0
            }

            let result;
            if (editingLead?.id) {
                result = await updateLead(tenantId, editingLead.id, dataToSubmit)
            } else {
                result = await createLead(tenantId, dataToSubmit)
            }

            if (result.success) {
                toast.success(editingLead ? 'Lead atualizado com sucesso!' : 'Lead criado com sucesso!')
                onSuccess()
                onClose()
            } else {
                toast.error('Erro ao processar lead: ' + result.error)
            }
        } catch (error) {
            console.error('Erro ao salvar lead:', error)
            toast.error('Ocorreu um erro ao salvar o lead')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingLead ? "Editar Lead" : "Novo Lead"}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Nome completo *</label>
                        <input
                            type="text"
                            value={leadData.name}
                            onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                            placeholder="Ex: João Silva"
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Telefone *</label>
                        <input
                            type="text"
                            value={leadData.phone}
                            onChange={(e) => setLeadData({ ...leadData, phone: formatPhone(e.target.value) })}
                            placeholder="(48) 99999 9999"
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">E-mail</label>
                        <input
                            type="email"
                            value={leadData.email}
                            onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                            placeholder="joao@email.com"
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Interesse</label>
                        <input
                            type="text"
                            value={leadData.interest}
                            onChange={(e) => setLeadData({ ...leadData, interest: e.target.value })}
                            placeholder="Ex: Casa 3 quartos com suíte"
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Estágio Inicial *</label>
                        <select
                            value={leadData.stage_id}
                            onChange={(e) => setLeadData({ ...leadData, stage_id: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                        >
                            <option value="">Selecione um estágio</option>
                            {stages.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Valor Estimado</label>
                        <input
                            type="number"
                            value={leadData.value}
                            onChange={(e) => setLeadData({ ...leadData, value: e.target.value })}
                            placeholder="0,00"
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Notas/Observações</label>
                        <textarea
                            value={leadData.notes}
                            onChange={(e) => setLeadData({ ...leadData, notes: e.target.value })}
                            rows={3}
                            placeholder="Alguma observação importante sobre o lead..."
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all resize-none"
                        />
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg font-bold hover:bg-[#F2DB00] shadow-sm active:scale-[0.99] transition-all disabled:opacity-50"
                >
                    {isLoading ? "Processando..." : (editingLead ? "Salvar Alterações" : "Criar Lead")}
                </button>
            </div>
        </Modal>
    )
}
