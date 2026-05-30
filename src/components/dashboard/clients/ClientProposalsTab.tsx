'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProposalsByContact, saveProposal, updateProposalStatus } from '@/app/_actions/proposals'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { Plus, FileText, Home, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency'
// @ts-expect-error - lodash/debounce does not have types installed
import debounce from 'lodash/debounce'

interface ClientProposalsTabProps {
    client: any
    tenantId: string
    initialLeadId?: string | null
    onConsumeInitialLead?: () => void
}

interface ProposalItem {
    id: string
    lead_id: string
    value: number
    status: string
    created_at: string
    updated_at: string
    payment_terms?: any
    property?: { id: string; title: string; price: number; type: string; address_city: string; address_state: string } | null
    lead?: { id: string; property_interest: string; stage_id: string; lead_stages?: { name: string; color: string } } | null
}

const STATUS_OPTIONS = [
    { value: 'rascunho', label: 'Rascunho', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    { value: 'enviada', label: 'Enviada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'aceita', label: 'Aceita', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'recusada', label: 'Recusada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
]

function getStatusBadge(status: string) {
    return STATUS_OPTIONS.find(o => o.value === status)?.color || STATUS_OPTIONS[0].color
}

export function ClientProposalsTab({ client, tenantId, initialLeadId, onConsumeInitialLead }: ClientProposalsTabProps) {
    const [proposals, setProposals] = useState<ProposalItem[]>([])
    const [loading, setLoading] = useState(true)
    const [showNewForm, setShowNewForm] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [selectedLeadId, setSelectedLeadId] = useState('')
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        value: '',
        down_payment: '',
        financing: '',
        installments: '',
        permutas: '',
        notes: '',
    })

    const clientLeads = client?.leads || []

    useEffect(() => {
        async function load() {
            if (!client?.id) return
            setLoading(true)
            const res = await getProposalsByContact(client.id)
            if (res.success && res.data) {
                setProposals(res.data as ProposalItem[])
            }
            setLoading(false)
        }
        load()
    }, [client?.id])

    // Auto-abrir formulário quando vem do botão "Fazer Proposta" em Leads
    useEffect(() => {
        if (initialLeadId) {
            setSelectedLeadId(initialLeadId)
            setShowNewForm(true)
            onConsumeInitialLead?.()
        }
    }, [initialLeadId])

    const resetForm = () => {
        setFormData({ value: '', down_payment: '', financing: '', installments: '', permutas: '', notes: '' })
        setSelectedLeadId('')
        setShowNewForm(false)
    }

    const handleCreateProposal = async () => {
        if (!selectedLeadId) {
            toast.error('Selecione um lead/imóvel para criar a proposta.')
            return
        }

        setSaving(true)
        const lead = clientLeads.find((l: any) => l.id === selectedLeadId)

        const payload = {
            value: parseCurrencyBRL(formData.value),
            payment_terms: {
                down_payment: parseCurrencyBRL(formData.down_payment),
                financing: parseCurrencyBRL(formData.financing),
                installments: formData.installments,
                permutas: formData.permutas,
                notes: formData.notes
            },
            status: 'rascunho',
            contact_id: client.id,
            property_id: lead?.property_id || undefined
        }

        const res = await saveProposal(selectedLeadId, tenantId, payload)
        if (res.success) {
            toast.success('Proposta criada com sucesso!')
            resetForm()
            // Recarregar
            const updated = await getProposalsByContact(client.id)
            if (updated.success && updated.data) setProposals(updated.data as ProposalItem[])
        } else {
            toast.error('Erro ao criar proposta: ' + res.error)
        }
        setSaving(false)
    }

    const handleStatusChange = async (proposalId: string, newStatus: string) => {
        const res = await updateProposalStatus(proposalId, newStatus)
        if (res.success) {
            setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: newStatus } : p))
            toast.success(`Status atualizado para "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}"`)
        } else {
            toast.error('Erro ao atualizar status')
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-secondary" />
            </div>
        )
    }

    return (
        <div className="space-y-5 px-1 pb-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Propostas</h3>
                {!showNewForm && (
                    <button
                        onClick={() => setShowNewForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all"
                    >
                        <Plus size={14} />
                        Nova Proposta
                    </button>
                )}
            </div>

            {/* Formulário de Nova Proposta */}
            {showNewForm && (
                <div className="bg-card dark:bg-muted/10 p-5 rounded-xl border border-border/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Nova Proposta</h4>
                        <button onClick={resetForm} className="p-1 hover:bg-muted rounded-md transition-colors">
                            <X size={14} className="text-muted-foreground" />
                        </button>
                    </div>

                    {/* Seletor de Lead/Imóvel + Valor cadastrado */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <FormSelect
                                label="Lead / Imóvel de Interesse"
                                value={selectedLeadId}
                                onChange={e => setSelectedLeadId(e.target.value)}
                                options={[
                                    { value: '', label: 'Selecione o lead...' },
                                    ...clientLeads.map((lead: any) => ({
                                        value: lead.id,
                                        label: lead.property_interest || lead.properties?.title || lead.source || `Lead ${new Date(lead.created_at).toLocaleDateString('pt-BR')}`
                                    }))
                                ]}
                            />
                        </div>
                        <div>
                            <FormInput
                                label="Valor Cadastrado (R$)"
                                value={(() => {
                                    if (!selectedLeadId) return ''
                                    const lead = clientLeads.find((l: any) => l.id === selectedLeadId)
                                    const price = lead?.properties?.price
                                    return price ? parseFloat(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
                                })()}
                                onChange={() => {}}
                                disabled
                                placeholder="—"
                            />
                        </div>
                    </div>

                    {/* Condições */}
                    <div className="grid grid-cols-3 gap-3">
                        <FormInput
                            label="Valor Total (R$)"
                            value={formData.value}
                            onChange={e => setFormData({ ...formData, value: formatCurrencyBRL(e.target.value) })}
                            placeholder="0,00"
                        />
                        <FormInput
                            label="Sinal/Entrada"
                            value={formData.down_payment}
                            onChange={e => setFormData({ ...formData, down_payment: formatCurrencyBRL(e.target.value) })}
                            placeholder="0,00"
                        />
                        <FormInput
                            label="Saldo Financiado"
                            value={formData.financing}
                            onChange={e => setFormData({ ...formData, financing: formatCurrencyBRL(e.target.value) })}
                            placeholder="0,00"
                        />
                    </div>

                    <FormInput
                        label="Parcelamento Direto"
                        value={formData.installments}
                        onChange={e => setFormData({ ...formData, installments: e.target.value })}
                        placeholder="Ex: 12x de R$ 5.000"
                    />

                    <FormInput
                        label="Permutas / Bens"
                        value={formData.permutas}
                        onChange={e => setFormData({ ...formData, permutas: e.target.value })}
                        placeholder="Ex: Carro avaliado em R$ 120.000"
                    />

                    <FormTextarea
                        label="Observações"
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                        placeholder="Detalhes específicos..."
                    />

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground border border-border/40 rounded-lg transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateProposal}
                            disabled={!selectedLeadId || saving}
                            className="px-4 py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all disabled:opacity-50"
                        >
                            {saving ? 'Salvando...' : 'Criar Proposta'}
                        </button>
                    </div>
                </div>
            )}

            {/* Lista de Propostas */}
            {proposals.length === 0 && !showNewForm ? (
                <div className="bg-muted/50 p-8 rounded-xl border border-dashed border-border text-center">
                    <FileText size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma proposta criada para este cliente.</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Clique em "Nova Proposta" para começar.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {proposals.map(proposal => {
                        const isExpanded = expandedId === proposal.id
                        const propertyName = proposal.property?.title || proposal.lead?.property_interest || 'Imóvel não especificado'
                        const terms = proposal.payment_terms || {}

                        return (
                            <div key={proposal.id} className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
                                {/* Header */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                                    className="w-full p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-accent-icon/10 flex items-center justify-center shrink-0">
                                            <Home size={14} className="text-accent-icon" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-foreground truncate">{propertyName}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                R$ {proposal.value ? parseFloat(proposal.value.toString()).toLocaleString('pt-BR') : '0'} • {new Date(proposal.updated_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <select
                                            value={proposal.status}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => {
                                                e.stopPropagation()
                                                handleStatusChange(proposal.id, e.target.value)
                                            }}
                                            className={`appearance-none text-[10px] font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${getStatusBadge(proposal.status)}`}
                                        >
                                            {STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        {isExpanded ? (
                                            <ChevronUp size={14} className="text-muted-foreground" />
                                        ) : (
                                            <ChevronDown size={14} className="text-muted-foreground" />
                                        )}
                                    </div>
                                </button>

                                {/* Detalhes expandidos */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-1 border-t border-border/30 space-y-3 animate-in fade-in duration-200">
                                        {/* Imóvel */}
                                        {proposal.property && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Home size={12} />
                                                <span>{proposal.property.title}</span>
                                                {proposal.property.address_city && (
                                                    <span>• {proposal.property.address_city}{proposal.property.address_state ? ` - ${proposal.property.address_state}` : ''}</span>
                                                )}
                                                {proposal.property.price && (
                                                    <span className="font-bold text-foreground ml-auto">
                                                        R$ {parseFloat(proposal.property.price.toString()).toLocaleString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Valores */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-muted/30 rounded-lg p-3">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valor Proposta</p>
                                                <p className="text-sm font-bold text-foreground mt-0.5">
                                                    R$ {proposal.value ? parseFloat(proposal.value.toString()).toLocaleString('pt-BR') : '0'}
                                                </p>
                                            </div>
                                            <div className="bg-muted/30 rounded-lg p-3">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sinal/Entrada</p>
                                                <p className="text-sm font-bold text-foreground mt-0.5">
                                                    R$ {terms.down_payment ? parseFloat(terms.down_payment.toString()).toLocaleString('pt-BR') : '0'}
                                                </p>
                                            </div>
                                            <div className="bg-muted/30 rounded-lg p-3">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Financiamento</p>
                                                <p className="text-sm font-bold text-foreground mt-0.5">
                                                    R$ {terms.financing ? parseFloat(terms.financing.toString()).toLocaleString('pt-BR') : '0'}
                                                </p>
                                            </div>
                                        </div>

                                        {terms.installments && (
                                            <div className="text-xs">
                                                <span className="font-bold text-muted-foreground">Parcelamento:</span>{' '}
                                                <span className="text-foreground">{terms.installments}</span>
                                            </div>
                                        )}
                                        {terms.permutas && (
                                            <div className="text-xs">
                                                <span className="font-bold text-muted-foreground">Permutas:</span>{' '}
                                                <span className="text-foreground">{terms.permutas}</span>
                                            </div>
                                        )}
                                        {terms.notes && (
                                            <div className="text-xs">
                                                <span className="font-bold text-muted-foreground">Observações:</span>{' '}
                                                <span className="text-foreground italic">{terms.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
