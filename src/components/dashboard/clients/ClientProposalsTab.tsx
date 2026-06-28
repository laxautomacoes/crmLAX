'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { getProposalsByContact, saveProposal, updateProposalStatus, getProposalTemplates, archiveProposal, deleteProposal } from '@/app/_actions/proposals'
import { getPropertyUnits } from '@/app/_actions/property-units'
import { generateProposalPdf } from '@/app/_actions/generate-proposal-pdf'
import { getWhatsAppInstance } from '@/app/_actions/whatsapp'
import { evolutionService } from '@/lib/evolution'
import { createClient } from '@/lib/supabase/client'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { Plus, FileText, Home, Loader2, ChevronDown, ChevronUp, X, Archive, Trash2, MoreVertical, Eye, Send, MessageSquare, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency'
import { autoFillProposalFields } from '@/lib/utils/proposal-autofill'
import { ProposalDynamicForm } from './ProposalDynamicForm'
import { Modal } from '@/components/shared/Modal'
import { translatePropertyType } from '@/utils/property-translations'

interface ClientProposalsTabProps {
    client: any
    tenantId: string
    initialLeadId?: string | null
    onConsumeInitialLead?: () => void
    onSuccess?: () => void
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
    lead?: { id: string; property_interest: string; stage_id: string; property_id?: string | null; properties?: { id: string; title: string; price: number; type: string; address_city: string; address_state: string } | null; lead_stages?: { name: string; color: string } } | null
    template_id?: string | null
    buyer_data?: any
    is_archived?: boolean
}

const STATUS_OPTIONS = [
    { value: 'criada', label: 'Criada', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    { value: 'enviada', label: 'Enviada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'aceita', label: 'Aceita', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'recusada', label: 'Recusada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
]

function getStatusBadge(status: string) {
    return STATUS_OPTIONS.find(o => o.value === status)?.color || STATUS_OPTIONS[0].color
}

interface ClientProposalActionsDropdownProps {
    onEdit: () => void;
    onArchive: () => void;
    onDelete: () => void;
    onDownloadPDF?: () => void;
    hasTemplate?: boolean;
    downloading?: boolean;
    onSendWhatsAppProposal?: () => void;
    onSendWhatsAppSale?: () => void;
    waConnected?: boolean;
}

function ClientProposalActionsDropdown({ 
    onEdit, 
    onArchive, 
    onDelete, 
    onDownloadPDF, 
    hasTemplate, 
    downloading,
    onSendWhatsAppProposal,
    onSendWhatsAppSale,
    waConnected
}: ClientProposalActionsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative inline-block" ref={dropdownRef} onClick={e => e.stopPropagation()}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(o => !o) }}
                className="p-1.5 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors shadow-sm"
                title="Ações"
            >
                <MoreVertical size={14} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-30 text-left">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); onEdit() }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                        <Eye size={14} className="text-blue-500" />
                        Editar
                    </button>
                    {hasTemplate && onDownloadPDF && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDownloadPDF() }}
                            disabled={downloading}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                        >
                            <FileText size={14} className="text-emerald-500" />
                            {downloading ? 'Gerando...' : 'Baixar PDF'}
                        </button>
                    )}
                    {waConnected && onSendWhatsAppProposal && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onSendWhatsAppProposal() }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                        >
                            <MessageSquare size={14} className="text-green-500" />
                            Avisar Proposta
                        </button>
                    )}
                    {waConnected && onSendWhatsAppSale && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onSendWhatsAppSale() }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                        >
                            <Send size={14} className="text-green-500" />
                            Avisar Venda
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); onArchive() }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-amber-500/10 transition-colors"
                    >
                        <Archive size={14} className="text-amber-500" />
                        Arquivar
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete() }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 size={14} className="text-red-500" />
                        Excluir
                    </button>
                </div>
            )}
        </div>
    )
}

export function ClientProposalsTab({ client, tenantId, initialLeadId, onConsumeInitialLead, onSuccess }: ClientProposalsTabProps) {
    const [proposals, setProposals] = useState<ProposalItem[]>([])
    const [loading, setLoading] = useState(true)
    const [showNewForm, setShowNewForm] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [selectedLeadId, setSelectedLeadId] = useState('')
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editingProposalId, setEditingProposalId] = useState<string | null>(null)

    // Estados para seleção de imóvel do sistema
    const [propertySearchTerm, setPropertySearchTerm] = useState('')
    const [propertySearchResults, setPropertySearchResults] = useState<any[]>([])
    const [isSearchingProperty, setIsSearchingProperty] = useState(false)
    const [selectedSystemProperty, setSelectedSystemProperty] = useState<any>(null)
    const [createLeadForProperty, setCreateLeadForProperty] = useState(false)
    const [selectedUnit, setSelectedUnit] = useState('')
    const [isPropertySelectorModalOpen, setIsPropertySelectorModalOpen] = useState(false)
    const [availableUnits, setAvailableUnits] = useState<any[]>([])
    const [isLoadingUnits, setIsLoadingUnits] = useState(false)

    // Configurações do WhatsApp
    const [waInstance, setWaInstance] = useState<any>(null)
    const [waLoading, setWaLoading] = useState(false)

    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState('')
    const [dynamicFields, setDynamicFields] = useState<any[]>([])
    const [dynamicResponses, setDynamicResponses] = useState<Record<string, string>>({})

    const [formData, setFormData] = useState({
        value: '',
        down_payment: '',
        financing: '',
        installments: '',
        permutas: '',
        notes: '',
    })

    const clientLeads = client?.leads || []

    const loadWhatsApp = async () => {
        try {
            const res = await getWhatsAppInstance()
            if (res?.data && res.data.status === 'connected') {
                setWaInstance(res.data)
            }
        } catch (error) {
            console.error('Erro ao carregar WhatsApp:', error)
        }
    }

    useEffect(() => {
        async function load() {
            if (!client?.id) return
            setLoading(true)
            const [proposalsRes, templatesRes] = await Promise.all([
                getProposalsByContact(client.id),
                getProposalTemplates(tenantId)
            ])
            if (proposalsRes.success && proposalsRes.data) {
                setProposals(proposalsRes.data as ProposalItem[])
            }
            if (templatesRes.success && templatesRes.data) {
                setTemplates(templatesRes.data)
            }
            setLoading(false)
        }
        load()
        loadWhatsApp()
    }, [client?.id, tenantId])

    // Auto-abrir formulário ou expandir proposta existente quando vem de Leads
    useEffect(() => {
        if (initialLeadId && proposals.length > 0) {
            const existingProposal = proposals.find(p => p.lead_id === initialLeadId)
            if (existingProposal) {
                // Removemos o auto-expand a pedido do usuário
                // setExpandedId(existingProposal.id) 
                setShowNewForm(false)
            } else {
                setSelectedLeadId(initialLeadId)
                setShowNewForm(true)
            }
            onConsumeInitialLead?.()
        } else if (initialLeadId && !loading) {
            setSelectedLeadId(initialLeadId)
            setShowNewForm(true)
            onConsumeInitialLead?.()
        }
    }, [initialLeadId, proposals, loading, onConsumeInitialLead])

    // Efeito para re-executar auto-preenchimento quando o Lead selecionado muda
    useEffect(() => {
        if (selectedTemplateId && selectedLeadId) {
            const template = templates.find(t => t.id === selectedTemplateId)
            if (template) {
                const fields = template.mapped_fields || []
                const autoFilled = autoFillProposalFields(fields, client, selectedLeadId)
                
                setDynamicResponses(prev => {
                    const newResponses = { ...prev }
                    fields.forEach((f: any) => {
                        const nameKey = f.name || f.label
                        if (f.crm_binding && autoFilled[nameKey]) {
                            newResponses[nameKey] = autoFilled[nameKey]
                        }
                    })
                    return newResponses
                })
            }
        }
    }, [selectedLeadId, selectedTemplateId, templates, client])

    useEffect(() => {
        if (!isPropertySelectorModalOpen) return

        const timer = setTimeout(async () => {
            setIsSearchingProperty(true)
            const supabase = createClient()
            let query = supabase
                .from('properties')
                .select('id, title, type, price, details, status, created_at')
                .eq('tenant_id', tenantId)
                .eq('is_archived', false)

            if (propertySearchTerm && propertySearchTerm.length >= 2) {
                query = query.or(`title.ilike.%${propertySearchTerm}%,details->>address_city.ilike.%${propertySearchTerm}%,details->>address_neighborhood.ilike.%${propertySearchTerm}%`)
            }

            const { data, error } = await query.order('created_at', { ascending: false }).limit(20)
            
            if (error) {
                console.error('Error fetching properties:', error)
            }
            if (data) {
                setPropertySearchResults(data)
            } else {
                setPropertySearchResults([])
            }
            setIsSearchingProperty(false)
        }, 500)

        return () => clearTimeout(timer)
    }, [propertySearchTerm, tenantId, isPropertySelectorModalOpen])

    useEffect(() => {
        async function fetchUnits() {
            if (selectedSystemProperty?.id && (selectedSystemProperty?.type === 'Empreendimento' || selectedSystemProperty?.details?.is_empreendimento)) {
                setIsLoadingUnits(true)
                const res = await getPropertyUnits(selectedSystemProperty.id)
                if (res.success && res.data) {
                    setAvailableUnits(res.data)
                } else {
                    setAvailableUnits([])
                }
                setIsLoadingUnits(false)
            } else {
                setAvailableUnits([])
            }
        }
        fetchUnits()
    }, [selectedSystemProperty])

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplateId(templateId)
        if (!templateId || templateId === 'simple') {
            setDynamicFields([])
            setDynamicResponses({})
            return
        }

        const template = templates.find(t => t.id === templateId)
        if (template) {
            const fields = template.mapped_fields || []
            setDynamicFields(fields)
            if (selectedLeadId) {
                const autoFilled = autoFillProposalFields(fields, client, selectedLeadId, selectedSystemProperty, selectedUnit, availableUnits)
                setDynamicResponses(autoFilled)
            } else {
                setDynamicResponses({})
            }
        }
    }

    // Re-trigger autofill if property/unit changes while template is selected
    useEffect(() => {
        if (selectedTemplateId && selectedTemplateId !== 'simple' && selectedLeadId) {
            const template = templates.find(t => t.id === selectedTemplateId)
            if (template) {
                const fields = template.mapped_fields || []
                const autoFilled = autoFillProposalFields(fields, client, selectedLeadId, selectedSystemProperty, selectedUnit, availableUnits)
                setDynamicResponses(prev => ({ ...prev, ...autoFilled }))
            }
        }
    }, [selectedSystemProperty, selectedUnit, availableUnits, selectedLeadId])

    const resetForm = () => {
        setFormData({ value: '', down_payment: '', financing: '', installments: '', permutas: '', notes: '' })
        setSelectedLeadId('')
        setSelectedTemplateId('')
        setDynamicFields([])
        setDynamicResponses({})
        setShowNewForm(false)
        setIsEditing(false)
        setEditingProposalId(null)
        setPropertySearchTerm('')
        setSelectedSystemProperty(null)
        setCreateLeadForProperty(false)
        setSelectedUnit('')
    }

    const handleStartEdit = (proposal: ProposalItem) => {
        const terms = proposal.payment_terms || {}
        setFormData({
            value: proposal.value ? formatCurrencyBRL(Math.round(proposal.value * 100).toString()) : '',
            down_payment: terms.down_payment ? formatCurrencyBRL(Math.round(terms.down_payment * 100).toString()) : '',
            financing: terms.financing ? formatCurrencyBRL(Math.round(terms.financing * 100).toString()) : '',
            installments: terms.installments || '',
            permutas: terms.permutas || '',
            notes: terms.notes || '',
        })
        setSelectedLeadId(proposal.lead_id)
        
        if (proposal.template_id) {
            setSelectedTemplateId(proposal.template_id)
            const template = templates.find(t => t.id === proposal.template_id)
            if (template) {
                setDynamicFields(template.mapped_fields || [])
            } else {
                setDynamicFields([])
            }
            setDynamicResponses(proposal.buyer_data || {})
        } else {
            setSelectedTemplateId('simple')
            setDynamicFields([])
            setDynamicResponses({})
        }

        setIsEditing(true)
        setEditingProposalId(proposal.id)
        setExpandedId(proposal.id)
        setShowNewForm(false)
    }

    const handleCreateProposal = async () => {
        if (!selectedLeadId) {
            toast.error('Selecione um lead/imóvel para criar a proposta.')
            return
        }

        if (selectedLeadId === 'NEW_PROPERTY' && !selectedSystemProperty) {
            toast.error('Selecione um imóvel do sistema.')
            return
        }

        if (selectedLeadId === 'NEW_PROPERTY' && selectedSystemProperty?.type === 'Empreendimento' && !selectedUnit) {
            toast.error('Selecione a unidade do empreendimento.')
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
            status: 'criada',
            contact_id: client.id,
            property_id: selectedLeadId === 'NEW_PROPERTY' ? selectedSystemProperty.id : (lead?.property_id || undefined),
            template_id: selectedTemplateId && selectedTemplateId !== 'simple' ? selectedTemplateId : undefined,
            buyer_data: selectedTemplateId && selectedTemplateId !== 'simple' ? dynamicResponses : undefined,
            unit: selectedLeadId === 'NEW_PROPERTY' ? selectedUnit : undefined,
            create_lead: selectedLeadId === 'NEW_PROPERTY' ? createLeadForProperty : undefined
        }

        const leadIdToSave = selectedLeadId === 'NEW_PROPERTY' ? null : selectedLeadId

        const res = await saveProposal(leadIdToSave, tenantId, payload)
        if (res.success) {
            toast.success(isEditing ? 'Proposta salva com sucesso!' : 'Proposta criada com sucesso!')
            resetForm()
            // Recarregar
            const updated = await getProposalsByContact(client.id)
            if (updated.success && updated.data) setProposals(updated.data as ProposalItem[])
            if (onSuccess) onSuccess()
        } else {
            toast.error('Erro ao salvar proposta: ' + res.error)
        }
        setSaving(false)
    }

    const handleStatusChange = async (proposalId: string, newStatus: string) => {
        const res = await updateProposalStatus(proposalId, newStatus)
        if (res.success) {
            setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: newStatus } : p))
            toast.success(`Status atualizado para "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}"`)
            if (onSuccess) onSuccess()
        } else {
            toast.error('Erro ao atualizar status')
        }
    }

    const [proposalToDelete, setProposalToDelete] = useState<ProposalItem | null>(null)
    const [proposalToArchive, setProposalToArchive] = useState<ProposalItem | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [archiving, setArchiving] = useState(false)

    const handleStartDelete = (proposal: ProposalItem) => {
        setProposalToDelete(proposal)
    }

    const handleStartArchive = (proposal: ProposalItem) => {
        setProposalToArchive(proposal)
    }

    const confirmDelete = async () => {
        if (!proposalToDelete) return
        setDeleting(true)
        const res = await deleteProposal(proposalToDelete.id)
        if (res.success) {
            setProposals(prev => prev.filter(p => p.id !== proposalToDelete.id))
            toast.success('Proposta excluída com sucesso!')
            setProposalToDelete(null)
            if (onSuccess) onSuccess()
        } else {
            toast.error('Erro ao excluir proposta: ' + res.error)
        }
        setDeleting(false)
    }

    const confirmArchive = async () => {
        if (!proposalToArchive) return
        setArchiving(true)
        const res = await archiveProposal(proposalToArchive.id)
        if (res.success) {
            setProposals(prev => prev.map(p => p.id === proposalToArchive.id ? { ...p, is_archived: true } : p))
            toast.success('Proposta arquivada com sucesso!')
            setProposalToArchive(null)
            if (onSuccess) onSuccess()
        } else {
            toast.error('Erro ao arquivar proposta: ' + res.error)
        }
        setArchiving(false)
    }

    const [downloadingId, setDownloadingId] = useState<string | null>(null)

    const handleDownloadPDF = async (proposalId: string) => {
        setDownloadingId(proposalId)
        try {
            const res = await generateProposalPdf(proposalId)
            if (res.success && res.base64 && res.fileName) {
                const byteCharacters = atob(res.base64)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], { type: 'application/pdf' })
                
                const link = document.createElement('a')
                link.href = window.URL.createObjectURL(blob)
                link.download = res.fileName
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                toast.success('Download da ficha iniciado!')
            } else {
                toast.error(res.error || 'Erro ao gerar PDF da proposta.')
            }
        } catch (error: any) {
            toast.error('Erro no download: ' + (error.message || error))
        } finally {
            setDownloadingId(null)
        }
    }

    const handleSendWhatsAppNotification = async (proposal: ProposalItem, type: 'proposta' | 'venda') => {
        if (!waInstance) {
            toast.error('Nenhuma instância de WhatsApp ativa ou conectada encontrada nas configurações de integração.')
            return
        }

        setWaLoading(true)
        const toastId = toast.loading('Enviando notificação de WhatsApp...')
        try {
            const supabase = createClient()
            
            // Buscar JID do grupo nas configurações do tenant (tabela tenants.branding ou campo equivalente)
            const { data: tenant } = await supabase
                .from('tenants')
                .select('branding')
                .eq('id', tenantId)
                .single()

            const groupJid = tenant?.branding?.whatsapp_group_jid

            if (!groupJid) {
                toast.error('Por favor, configure o ID do Grupo de WhatsApp nas Configurações da Empresa.', { id: toastId })
                setWaLoading(false)
                return
            }

            const property = proposal.property || proposal.lead?.properties
            const propertyName = property?.title || proposal.lead?.property_interest || 'Imóvel sem descrição'

            const emoji = type === 'proposta' ? '📝 Proposta' : '🎉 Venda'
            const message = `- ${emoji} ${propertyName}`

            await evolutionService.sendMessage(waInstance.instance_name, groupJid, message)
            toast.success('Notificação de WhatsApp enviada para o grupo!', { id: toastId })
        } catch (error: any) {
            console.error('Erro ao enviar WhatsApp:', error)
            toast.error('Falha ao enviar notificação de WhatsApp: ' + error.message, { id: toastId })
        } finally {
            setWaLoading(false)
        }
    }

    const renderProposalForm = (isInline = false, inModal = false) => {
        return (
            <div className={`${isInline ? 'bg-muted/10 p-5 rounded-lg border border-border/30' : 'bg-white dark:bg-muted/10 p-5 rounded-lg border border-border/40'} space-y-4 animate-in fade-in duration-200 text-left`}>
                {!isInline && !inModal && (
                    <div className="flex items-center justify-end">
                        <button onClick={resetForm} className="p-1 hover:bg-muted rounded-md transition-colors">
                            <X size={14} className="text-muted-foreground" />
                        </button>
                    </div>
                )}

                {/* Seletor de Lead/Imóvel */}
                {!(selectedLeadId === 'NEW_PROPERTY' && selectedSystemProperty) && (
                    <div className="grid grid-cols-1 gap-3">
                        <FormSelect
                            label="Lead / Imóvel de Interesse"
                            value={selectedLeadId}
                            disabled={isEditing}
                            onChange={e => {
                                const val = e.target.value
                                setSelectedLeadId(val)
                                if (val === 'NEW_PROPERTY' && !selectedSystemProperty) {
                                    setIsPropertySelectorModalOpen(true)
                                }
                            }}
                            options={[
                                { value: '', label: 'Selecione o lead...' },
                                ...clientLeads.map((lead: any) => {
                                    const hasProposal = lead.proposals?.length > 0 || lead.properties?.status === 'Em Proposta'
                                    const label = lead.property_interest || lead.properties?.title || lead.source || `Lead ${new Date(lead.created_at).toLocaleDateString('pt-BR')}`
                                    return {
                                        value: lead.id,
                                        label: hasProposal ? `${label} (Já possui proposta)` : label,
                                        disabled: hasProposal
                                    }
                                }),
                                { value: 'NEW_PROPERTY', label: '+ Escolher Imóvel' }
                            ]}
                        />
                    </div>
                )}

                {/* Seleção de Imóvel do Sistema */}
                {selectedLeadId === 'NEW_PROPERTY' && selectedSystemProperty && (
                    <div className="space-y-4">
                        {selectedSystemProperty && (
                            <div>
                                <label className="block text-xs font-bold text-foreground ml-1 mb-2">Imóvel</label>
                                <div className="bg-background p-3 rounded-lg border border-border flex items-start justify-between gap-3">
                                <div>
                                    <span className="block text-sm font-bold text-foreground">{selectedSystemProperty.title}</span>
                                    {!(selectedSystemProperty?.type === 'Empreendimento' || selectedSystemProperty?.details?.is_empreendimento) && (
                                        <span className="block text-xs text-muted-foreground">Valor: {selectedSystemProperty.price ? `R$ ${selectedSystemProperty.price.toLocaleString('pt-BR')}` : '—'}</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSystemProperty(null)
                                        setIsPropertySelectorModalOpen(true)
                                    }}
                                    className="text-xs text-red-500 hover:underline"
                                >
                                    Trocar
                                </button>
                            </div>
                        </div>
                        )}
                        
                        {/* Seleção de Unidade se for Empreendimento */}
                        {(selectedSystemProperty?.type === 'Empreendimento' || selectedSystemProperty?.details?.is_empreendimento) && (
                            availableUnits.length > 0 ? (
                                <FormSelect
                                    label="Unidade"
                                    value={selectedUnit}
                                    onChange={e => setSelectedUnit(e.target.value)}
                                    options={[
                                        { value: '', label: 'Selecione a unidade...' },
                                        ...availableUnits
                                            .filter((u: any) => {
                                                if (!u.status) return true;
                                                const s = u.status.toLowerCase();
                                                return s === 'disponível' || s === 'disponivel' || s === 'available' || s === 'ativo';
                                            })
                                            .sort((a: any, b: any) => {
                                                const aNum = parseInt(a.unit_number?.replace(/\D/g, '') || '0', 10);
                                                const bNum = parseInt(b.unit_number?.replace(/\D/g, '') || '0', 10);
                                                if (aNum !== bNum) return aNum - bNum;
                                                const aTower = a.block_tower || '';
                                                const bTower = b.block_tower || '';
                                                return aTower.localeCompare(bTower);
                                            })
                                            .map((u: any) => {
                                                let towerStr = '';
                                                if (u.block_tower) {
                                                    const t = u.block_tower.trim();
                                                    if (t.toLowerCase().includes('torre') || t.toLowerCase().includes('bloco')) {
                                                        towerStr = ` (${t})`;
                                                    } else {
                                                        towerStr = ` (Torre ${t})`;
                                                    }
                                                }
                                                return {
                                                    value: u.unit_number,
                                                    label: `${u.unit_number}${towerStr} - ${u.valor_total ? `R$ ${parseFloat(u.valor_total).toLocaleString('pt-BR')}` : 'Sob Consulta'}`
                                                };
                                            })
                                    ]}
                                />
                            ) : (
                                <div className="relative">
                                    <FormInput
                                        label="Unidade"
                                        value={selectedUnit}
                                        onChange={e => setSelectedUnit(e.target.value)}
                                        placeholder="Ex: Apto 101, Torre B"
                                        disabled={isLoadingUnits}
                                    />
                                    {isLoadingUnits && (
                                        <Loader2 size={14} className="absolute right-3 top-[34px] animate-spin text-muted-foreground" />
                                    )}
                                </div>
                            )
                        )}

                        {selectedSystemProperty && (
                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                                <input
                                    type="checkbox"
                                    checked={createLeadForProperty}
                                    onChange={e => setCreateLeadForProperty(e.target.checked)}
                                    className="rounded border-border text-secondary focus:ring-secondary/20"
                                />
                                <span className="text-sm text-foreground">Criar lead para esta negociação</span>
                            </label>
                        )}
                    </div>
                )}

                {/* Modelo de Ficha de Proposta */}
                <div className="pt-2 border-t border-border/30">
                    <FormSelect
                        label="Modelo de Ficha de Proposta"
                        value={selectedTemplateId}
                        onChange={e => handleTemplateChange(e.target.value)}
                        options={[
                            { value: '', label: 'Selecione um modelo...' },
                            { value: 'simple', label: 'Ficha Simples (Sem Modelo)' },
                            ...templates.map((t: any) => ({
                                value: t.id,
                                label: t.name
                            }))
                        ]}
                    />
                </div>

                {selectedTemplateId !== '' && (
                    <div className="space-y-4 animate-in fade-in duration-300 slide-in-from-top-2">
                        {/* Campos dinâmicos do modelo de proposta */}
                        {selectedTemplateId !== 'simple' && (
                            <ProposalDynamicForm
                                fields={dynamicFields}
                                responses={dynamicResponses}
                                onChange={(name, val) => setDynamicResponses(prev => ({ ...prev, [name]: val }))}
                            />
                        )}



                {/* Condições e Valor Cadastrado (Apenas para Ficha Simples) */}
                {selectedTemplateId === 'simple' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <FormInput
                            label="Valor Cadastrado (R$)"
                            value={(() => {
                                if (selectedSystemProperty) {
                                    if ((selectedSystemProperty?.type === 'Empreendimento' || selectedSystemProperty?.details?.is_empreendimento) && selectedUnit && availableUnits.length > 0) {
                                        const unitInfo = availableUnits.find((u: any) => u.unit_number === selectedUnit)
                                        if (unitInfo?.valor_total) {
                                            return parseFloat(unitInfo.valor_total.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        }
                                    }
                                    return selectedSystemProperty.price ? parseFloat(selectedSystemProperty.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
                                }
                                if (!selectedLeadId || selectedLeadId === 'NEW_PROPERTY') return ''
                                const lead = clientLeads.find((l: any) => l.id === selectedLeadId)
                                const price = lead?.properties?.price
                                return price ? parseFloat(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
                            })()}
                            onChange={() => {}}
                            disabled
                            placeholder="—"
                        />
                    </div>
                    <div>
                        <FormInput
                            label="Valor Total (R$)"
                            value={formData.value}
                            onChange={e => setFormData({ ...formData, value: formatCurrencyBRL(e.target.value) })}
                            placeholder="0,00"
                        />
                    </div>
                    <div>
                        <FormInput
                            label="Sinal/Entrada"
                            value={formData.down_payment}
                            onChange={e => setFormData({ ...formData, down_payment: formatCurrencyBRL(e.target.value) })}
                            placeholder="0,00"
                        />
                    </div>
                    <div>
                        <FormInput
                            label="Saldo Financiado"
                            value={formData.financing}
                            onChange={e => setFormData({ ...formData, financing: formatCurrencyBRL(e.target.value) })}
                            placeholder="0,00"
                        />
                    </div>
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
                    </>
                )}

                {!inModal && (
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground border border-border/40 rounded-md transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateProposal}
                            disabled={!selectedLeadId || saving || selectedTemplateId === ''}
                            className="px-4 py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-md shadow-sm transition-all disabled:opacity-50"
                        >
                            {saving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Proposta')}
                        </button>
                    </div>
                )}
                    </div>
                )}
            </div>
        )
    }

    const activeProposals = proposals.filter(p => !p.is_archived)

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
                <button
                    onClick={() => setShowNewForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-md shadow-sm transition-all"
                >
                    <Plus size={14} />
                    Nova Proposta
                </button>
            </div>

            {/* Formulário de Nova Proposta */}
            {showNewForm && !isEditing && (
                <Modal
                    isOpen={showNewForm}
                    onClose={resetForm}
                    title={<h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">Nova Proposta</h3>}
                    size="2xl"
                    extraHeaderContent={
                        <button
                            onClick={handleCreateProposal}
                            disabled={!selectedLeadId || saving || selectedTemplateId === ''}
                            className="bg-secondary text-secondary-foreground font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all text-sm shadow-sm whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                'Criar Proposta'
                            )}
                        </button>
                    }
                >
                    {renderProposalForm(false, true)}
                </Modal>
            )}

            {/* Lista de Propostas */}
            {activeProposals.length === 0 ? (
                <div className="bg-background hover:bg-gray-50 dark:hover:bg-muted/30 p-8 rounded-lg border border-border/40 text-center transition-all">
                    <FileText size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma proposta criada para este cliente.</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Clique em "Nova Proposta" para começar.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-card rounded-lg border border-muted-foreground/30 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto min-h-[500px]">
                            <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '26%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '17%' }} />
                                    <col style={{ width: '12%' }} />
                                    <col style={{ width: '12%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '8%' }} />
                                </colgroup>
                                <thead className="bg-gray-200 dark:bg-muted/50 border-b border-muted-foreground/30">
                                    <tr>
                                        <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Imóvel</th>
                                        <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Valor tabela</th>
                                        <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Valor proposto</th>
                                        <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Criado em</th>
                                        <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Atualizado em</th>
                                        <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                                        <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-muted-foreground/30">
                                    {activeProposals.map(proposal => {
                                        const isExpanded = expandedId === proposal.id
                                        const property = proposal.property || proposal.lead?.properties
                                        const propertyName = property?.title || proposal.lead?.property_interest || 'Imóvel não especificado'
                                        const terms = proposal.payment_terms || {}

                                        // Calcular diferença de valor
                                        const propertyPrice = property?.price ? parseFloat(property.price.toString()) : 0
                                        const proposalPrice = proposal.value ? parseFloat(proposal.value.toString()) : 0
                                        let diffPercentStr = ""
                                        let diffValue = 0
                                        if (propertyPrice > 0 && proposalPrice > 0) {
                                            diffValue = proposalPrice - propertyPrice
                                            const diff = (diffValue / propertyPrice) * 100
                                            const sign = diff > 0 ? '+' : ''
                                            diffPercentStr = `(${sign}${diff.toFixed(1).replace('.0', '')}%)`
                                        }

                                        return (
                                            <Fragment key={proposal.id}>
                                                <tr 
                                                    onClick={() => {
                                                        if (isExpanded) {
                                                            if (isEditing && editingProposalId === proposal.id) {
                                                                resetForm()
                                                            } else {
                                                                setExpandedId(null)
                                                            }
                                                        } else {
                                                            setExpandedId(proposal.id)
                                                        }
                                                    }}
                                                    className="bg-white dark:bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                                                >
                                                    <td className="px-4 py-5 text-sm font-bold text-foreground truncate text-center">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="truncate">{propertyName}</span>
                                                            {property?.address_city && (
                                                                <span className="text-[10px] font-medium text-muted-foreground truncate">
                                                                    {property.address_city} - {property.address_state}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 text-sm font-medium text-foreground text-center whitespace-nowrap">
                                                        R$ {property?.price ? parseFloat(property.price.toString()).toLocaleString('pt-BR') : '—'}
                                                    </td>
                                                    <td className="px-4 py-5 text-sm font-medium text-foreground text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <span>R$ {proposal.value ? parseFloat(proposal.value.toString()).toLocaleString('pt-BR') : '0'}</span>
                                                            {diffPercentStr && (
                                                                <span className={`text-[10px] font-bold ${diffValue > 0 ? 'text-emerald-500' : diffValue < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                                    {diffPercentStr}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 text-sm font-medium text-muted-foreground text-center whitespace-nowrap">
                                                        {new Date(proposal.created_at || proposal.updated_at).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-4 py-5 text-sm font-medium text-muted-foreground text-center whitespace-nowrap">
                                                        {new Date(proposal.updated_at).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-4 py-5 text-center" onClick={e => e.stopPropagation()}>
                                                        <div className="flex justify-center items-center">
                                                            <div className="inline-block relative">
                                                                <select
                                                                    value={proposal.status}
                                                                    onChange={e => handleStatusChange(proposal.id, e.target.value)}
                                                                    className={`appearance-none text-[10px] font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none text-center ${getStatusBadge(proposal.status)}`}
                                                                >
                                                                    {STATUS_OPTIONS.map(opt => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 text-center" onClick={e => e.stopPropagation()}>
                                                        <ClientProposalActionsDropdown
                                                            onEdit={() => handleStartEdit(proposal)}
                                                            onArchive={() => handleStartArchive(proposal)}
                                                            onDelete={() => handleStartDelete(proposal)}
                                                            onDownloadPDF={() => handleDownloadPDF(proposal.id)}
                                                            hasTemplate={!!proposal.template_id}
                                                            downloading={downloadingId === proposal.id}
                                                            onSendWhatsAppProposal={() => handleSendWhatsAppNotification(proposal, 'proposta')}
                                                            onSendWhatsAppSale={() => handleSendWhatsAppNotification(proposal, 'venda')}
                                                            waConnected={!!waInstance}
                                                        />
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-white dark:bg-muted/10">
                                                        <td colSpan={7} className="px-6 py-5 border-t border-border/30">
                                                            {isEditing && editingProposalId === proposal.id ? (
                                                                renderProposalForm(true)
                                                            ) : (
                                                                <div className="space-y-4 animate-in fade-in duration-200">
                                                                {/* Valores */}
                                                                <div className="grid grid-cols-3 gap-3">
                                                                    <div className="bg-white border border-border/40 dark:bg-muted/30 dark:border-0 rounded-md p-3">
                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valor Proposta</p>
                                                                        <p className="text-sm font-bold text-foreground mt-0.5">
                                                                            R$ {proposal.value ? parseFloat(proposal.value.toString()).toLocaleString('pt-BR') : '0'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="bg-white border border-border/40 dark:bg-muted/30 dark:border-0 rounded-md p-3">
                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sinal/Entrada</p>
                                                                        <p className="text-sm font-bold text-foreground mt-0.5">
                                                                            R$ {terms.down_payment ? parseFloat(terms.down_payment.toString()).toLocaleString('pt-BR') : '0'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="bg-white border border-border/40 dark:bg-muted/30 dark:border-0 rounded-md p-3">
                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Financiamento</p>
                                                                        <p className="text-sm font-bold text-foreground mt-0.5">
                                                                            R$ {terms.financing ? parseFloat(terms.financing.toString()).toLocaleString('pt-BR') : '0'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2 pt-2 border-t border-border/10">
                                                                    <div className="text-xs">
                                                                        <span className="font-bold text-muted-foreground">Parcelamento:</span>{' '}
                                                                        <span className="text-foreground">{terms.installments || '—'}</span>
                                                                    </div>
                                                                    <div className="text-xs">
                                                                        <span className="font-bold text-muted-foreground">Permutas/Bens:</span>{' '}
                                                                        <span className="text-foreground">{terms.permutas || '—'}</span>
                                                                    </div>
                                                                    <div className="text-xs">
                                                                        <span className="font-bold text-muted-foreground">Observações:</span>{' '}
                                                                        <span className="text-foreground italic">{terms.notes || '—'}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Exibição dos Dados Dinâmicos da Ficha */}
                                                                {proposal.template_id && proposal.buyer_data && Object.keys(proposal.buyer_data).length > 0 && (
                                                                    <div className="pt-3 border-t border-border/10 mt-3 space-y-2">
                                                                        <p className="text-[10px] font-bold text-accent-icon dark:text-[#FFE600] uppercase tracking-wider">
                                                                            Dados Específicos da Ficha
                                                                        </p>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                                                                            {Object.entries(proposal.buyer_data).map(([key, val]) => (
                                                                                <div key={key} className="text-xs">
                                                                                    <span className="font-bold text-muted-foreground">{key}:</span>{' '}
                                                                                    <span className="text-foreground">{val as string || '—'}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
            )}
            {/* Modal de Confirmação de Exclusão */}
            {proposalToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setProposalToDelete(null)}>
                    <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200 relative text-left" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-500/10 rounded-lg">
                                    <Trash2 size={20} className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">Excluir Proposta</h3>
                                    <p className="text-xs text-muted-foreground">Esta ação não poderá ser desfeita</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setProposalToDelete(null)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-3">
                            <p className="text-sm text-foreground">
                                Tem certeza de que deseja excluir permanentemente esta proposta?
                            </p>
                            <div className="bg-muted/30 border border-border/40 rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground">
                                <div>
                                    <span className="font-bold text-foreground">Imóvel:</span>{' '}
                                    <span>
                                        {proposalToDelete.property?.title || proposalToDelete.lead?.property_interest || 'Imóvel não especificado'}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-bold text-foreground">Valor Proposto:</span>{' '}
                                    <span>
                                        R$ {proposalToDelete.value ? parseFloat(proposalToDelete.value.toString()).toLocaleString('pt-BR') : '0'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                onClick={() => setProposalToDelete(null)}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground font-bold text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Excluindo...</span>
                                    </>
                                ) : (
                                    <span>Excluir Proposta</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Arquivamento */}
            {proposalToArchive && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setProposalToArchive(null)}>
                    <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200 relative text-left" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/10 rounded-lg">
                                    <Archive size={20} className="text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">Arquivar Proposta</h3>
                                    <p className="text-xs text-muted-foreground">Ela será movida para o arquivo</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setProposalToArchive(null)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-3">
                            <p className="text-sm text-foreground">
                                Tem certeza de que deseja arquivar esta proposta? Ela sairá da sua lista ativa de propostas do cliente.
                            </p>
                            <div className="bg-muted/30 border border-border/40 rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground">
                                <div>
                                    <span className="font-bold text-foreground">Imóvel:</span>{' '}
                                    <span>
                                        {proposalToArchive.property?.title || proposalToArchive.lead?.property_interest || 'Imóvel não especificado'}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-bold text-foreground">Valor Proposto:</span>{' '}
                                    <span>
                                        R$ {proposalToArchive.value ? parseFloat(proposalToArchive.value.toString()).toLocaleString('pt-BR') : '0'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                onClick={() => setProposalToArchive(null)}
                                disabled={archiving}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground font-bold text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmArchive}
                                disabled={archiving}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {archiving ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Arquivando...</span>
                                    </>
                                ) : (
                                    <span>Arquivar Proposta</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Buscar Imóvel do Sistema */}
            <Modal
                isOpen={isPropertySelectorModalOpen}
                onClose={() => {
                    setIsPropertySelectorModalOpen(false)
                    if (!selectedSystemProperty && selectedLeadId === 'NEW_PROPERTY') {
                        setSelectedLeadId('')
                    }
                }}
                title={
                    <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                        Buscar Imóvel
                    </h3>
                }
                size="lg"
            >
                <div className="space-y-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={propertySearchTerm}
                            onChange={e => setPropertySearchTerm(e.target.value)}
                            placeholder="Buscar imóvel por nome ou cidade..."
                            className="w-full h-10 pl-9 pr-10 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {isSearchingProperty && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                            {propertySearchTerm && !isSearchingProperty && (
                                <button
                                    type="button"
                                    onClick={() => setPropertySearchTerm('')}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    title="Limpar busca"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {propertySearchResults.length > 0 ? (
                        <div className="space-y-3">
                            <div className="text-xs text-muted-foreground font-medium px-1">
                                {propertySearchResults.length} {propertySearchResults.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
                            </div>
                            <div className="max-h-60 overflow-y-auto bg-white dark:bg-background border border-border rounded-lg shadow-sm">
                            {propertySearchResults.map(prop => (
                                <button
                                    key={prop.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedSystemProperty(prop)
                                        setIsPropertySelectorModalOpen(false)
                                    }}
                                    className="w-full flex flex-col items-start p-3 bg-white dark:bg-background hover:bg-muted/50 border-b border-border last:border-0 transition-colors"
                                >
                                    <span className="text-sm font-bold text-foreground text-left">{prop.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {translatePropertyType(prop.type)}
                                        {prop.details?.address_city ? ` • ${prop.details.address_city}` : ''}
                                        {prop.details?.address_state ? ` - ${prop.details.address_state}` : ''}
                                    </span>
                                </button>
                            ))}
                        </div>
                        </div>
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            {isSearchingProperty ? 'Buscando imóveis...' : 'Nenhum imóvel encontrado.'}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}
