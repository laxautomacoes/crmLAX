'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { formatPhone } from '@/lib/utils/phone'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
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
                        <FormInput
                            label="Nome completo *"
                            value={leadData.name}
                            onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                            placeholder="Ex: João Silva"
                        />
                    </div>
                    <div>
                        <FormInput
                            label="Telefone *"
                            value={leadData.phone}
                            onChange={(e) => setLeadData({ ...leadData, phone: formatPhone(e.target.value) })}
                            placeholder="(48) 99999 9999"
                        />
                    </div>
                    <div>
                        <FormInput
                            label="E-mail"
                            type="email"
                            value={leadData.email}
                            onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                            placeholder="joao@email.com"
                        />
                    </div>
                    <div className="col-span-2">
                        <FormInput
                            label="Interesse"
                            value={leadData.interest}
                            onChange={(e) => setLeadData({ ...leadData, interest: e.target.value })}
                            placeholder="Ex: Casa 3 quartos com suíte"
                        />
                    </div>
                    <div>
                        <FormSelect
                            label="Estágio Inicial *"
                            value={leadData.stage_id}
                            onChange={(e) => setLeadData({ ...leadData, stage_id: e.target.value })}
                            options={[
                                { value: '', label: 'Selecione um estágio' },
                                ...stages.map(s => ({ value: s.id, label: s.name }))
                            ]}
                        />
                    </div>

                    <div>
                        <FormInput
                            label="Valor Estimado"
                            type="number"
                            value={leadData.value}
                            onChange={(e) => setLeadData({ ...leadData, value: e.target.value })}
                            placeholder="0,00"
                        />
                    </div>
                    <div className="col-span-2">
                        <FormTextarea
                            label="Notas/Observações"
                            value={leadData.notes}
                            onChange={(e) => setLeadData({ ...leadData, notes: e.target.value })}
                            rows={3}
                            placeholder="Alguma observação importante sobre o lead..."
                        />
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-card text-foreground border border-border rounded-lg font-bold hover:bg-muted transition-all active:scale-[0.99]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 shadow-sm active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                        {isLoading ? "Processando..." : (editingLead ? "Salvar Alterações" : "Criar Lead")}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
