'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { formatPhone } from '@/lib/utils/phone'
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { MediaUpload } from '@/components/shared/MediaUpload'
import { toast } from 'sonner'
import { createLead, updateLead, getLeadSources, createLeadSource, getLeadCampaigns, createLeadCampaign } from '@/app/_actions/leads'
import { getBrokers, getProfile } from '@/app/_actions/profile'
import { PropertyAutocomplete } from '@/components/dashboard/properties/PropertyAutocomplete'
import { MessageSquare, X, Sparkles, User, FileText, PenLine, ChevronRight, Upload } from 'lucide-react'
import type { Lead } from './PipelineBoard'

interface Broker {
    id: string
    full_name: string
    role?: string
}

interface NamedOption {
    name: string
}

interface SelectedProperty {
    id: string
    title: string
}

interface ChatMessage {
    fromMe?: boolean
    message?: string
    text?: string
}

type EditableLead = Partial<Lead> & {
    id?: string
    lead_source?: string
    campaign?: string
    property_id?: string
    property_interest?: string
    date?: string | null
}

const LEAD_MODAL_INITIAL_SOURCES = ['Meta', 'Google', 'Portal', 'Indicação', 'Carteira'] as const

export type LeadCreationMethod = 'manual' | 'import_bulk' | null

interface LeadModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string
    stages: Array<{ id: string; name: string }>
    onSuccess: () => void
    editingLead?: EditableLead // Para edição
    onSelectImportBulk?: () => void
    onMakeProposal?: (contactId: string, leadId: string) => void
}

export function LeadModal({
    isOpen,
    onClose,
    tenantId,
    stages,
    onSuccess,
    editingLead,
    onSelectImportBulk,
    onMakeProposal
}: LeadModalProps) {
    const [creationMethod, setCreationMethod] = useState<LeadCreationMethod>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [brokers, setBrokers] = useState<Broker[]>([])
    const [userRole, setUserRole] = useState<string>('user')
    const [sources, setSources] = useState<string[]>([])
    const [campaigns, setCampaigns] = useState<string[]>([])
    const [isAddingSource, setIsAddingSource] = useState(false)
    const [isAddingCampaign, setIsAddingCampaign] = useState(false)
    const [newSource, setNewSource] = useState('')
    const [newCampaign, setNewCampaign] = useState('')
    const [leadData, setLeadData] = useState({
        name: '',
        phone: '',
        email: '',
        interest: '',
        lead_source: '',
        campaign: '',
        property_id: '',
        property_interest: '',
        selectedProperty: null as SelectedProperty | null,
        date: new Date().toISOString().split('T')[0],
        value: '',
        notes: '',
        stage_id: '',
        assigned_to: '',
        images: [] as string[],
        videos: [] as string[],
        documents: [] as { name: string; url: string }[]
    })


    // Quando o modal abre para novo lead, reseta o método de criação
    useEffect(() => {
        if (isOpen && !editingLead) {
            setCreationMethod(null)
        }
    }, [isOpen, editingLead])

    const firstStageId = stages[0]?.id ?? ''

    useEffect(() => {
        async function fetchContext() {
            const { profile } = await getProfile()
            if (profile) {
                setUserRole(profile.role)
                if (profile.role === 'admin' || profile.role === 'superadmin') {
                    const res = await getBrokers(tenantId)
                    if (res.success) {
                        setBrokers(res.data || [])
                    }
                }
            }

            const sourcesRes = await getLeadSources(tenantId)
            if (sourcesRes.success) {
                // Mesclar iniciais com as do banco
                const dbSources = ((sourcesRes.data || []) as NamedOption[]).map((s) => s.name)
                const merged = Array.from(new Set([...LEAD_MODAL_INITIAL_SOURCES, ...dbSources]))
                setSources(merged)
            } else {
                setSources([...LEAD_MODAL_INITIAL_SOURCES])
            }
        }
        if (isOpen) fetchContext()
    }, [isOpen, tenantId])

    useEffect(() => {
        async function fetchCampaigns() {
            if (leadData.lead_source) {
                const res = await getLeadCampaigns(tenantId, leadData.lead_source)
                if (res.success) {
                    setCampaigns(((res.data || []) as NamedOption[]).map((c) => c.name))
                } else {
                    setCampaigns([])
                }
            } else {
                setCampaigns([])
            }
        }
        fetchCampaigns()
    }, [leadData.lead_source, tenantId])

    useEffect(() => {
        if (!isOpen) return;

        if (editingLead) {
            setLeadData({
                name: editingLead.name || '',
                phone: editingLead.phone ? formatPhone(editingLead.phone) : '',
                email: editingLead.email || '',
                interest: editingLead.interest || '',
                lead_source: editingLead.lead_source || '',
                campaign: editingLead.campaign || '',
                property_id: editingLead.property_id || '',
                property_interest: editingLead.property_interest || '',
                selectedProperty: editingLead.property_id ? { id: editingLead.property_id, title: editingLead.interest || '' } : null,
                date: editingLead.date || new Date().toISOString().split('T')[0],
                value: editingLead.value ? formatCurrencyBRL(Math.round(Number(editingLead.value) * 100).toString()) : '',
                notes: editingLead.notes || '',
                stage_id: editingLead.status || firstStageId,
                assigned_to: editingLead.assigned_to || '',
                images: Array.isArray(editingLead.images) ? editingLead.images : [],
                videos: Array.isArray(editingLead.videos) ? editingLead.videos : [],
                documents: Array.isArray(editingLead.documents) ? editingLead.documents : []
            })
        } else {
            setLeadData({
                name: '',
                phone: '',
                email: '',
                interest: '',
                lead_source: '',
                campaign: '',
                property_id: '',
                property_interest: '',
                selectedProperty: null,
                date: new Date().toISOString().split('T')[0],
                value: '',
                notes: '',
                stage_id: firstStageId,
                assigned_to: '',
                images: [],
                videos: [],
                documents: []
            })
        }
    }, [editingLead, isOpen, firstStageId])

    const handleMediaUpload = (type: 'images' | 'videos' | 'documents', files: string[] | { name: string; url: string }[]) => {
        setLeadData(prev => ({
            ...prev,
            [type]: [...prev[type], ...files]
        }))
    }

    const handleMediaRemove = (type: 'images' | 'videos' | 'documents', index: number) => {
        setLeadData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }))
    }

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
            // Se o usuário escreveu uma nova origem, salvar primeiro
            let finalSource = leadData.lead_source
            if (isAddingSource && newSource.trim()) {
                const res = await createLeadSource(tenantId, newSource.trim())
                if (res.success) {
                    finalSource = newSource.trim()
                }
            }

            // Se o usuário escreveu uma nova campanha, salvar primeiro
            let finalCampaign = leadData.campaign
            if (isAddingCampaign && newCampaign.trim()) {
                const res = await createLeadCampaign(tenantId, finalSource, newCampaign.trim())
                if (res.success) {
                    finalCampaign = newCampaign.trim()
                }
            }

            const dataToSubmit = {
                ...leadData,
                lead_source: finalSource,
                campaign: finalCampaign,
                value: leadData.value ? parseCurrencyBRL(leadData.value) : 0
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

    const showMethodSelection = !editingLead && creationMethod === null

    const handleSelectMethod = (method: LeadCreationMethod) => {
        if (method === 'import_bulk') {
            onSelectImportBulk?.()
        } else {
            setCreationMethod('manual')
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { setCreationMethod(null); onClose() }}
            title={
                <div className="flex items-center gap-3">
                    {editingLead && (
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground flex-shrink-0 border border-border/10">
                            {editingLead.avatar_url ? (
                                <img src={editingLead.avatar_url} alt={leadData.name} className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} />
                            )}
                        </div>
                    )}
                    <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                        {editingLead ? "Editar Lead" : "Novo Lead"}
                    </h3>
                </div>
            }
            size={showMethodSelection ? 'md' : 'xl'}
            align="top"
            extraHeaderContent={
                showMethodSelection ? undefined : (
                <div className="flex items-center gap-2">
                    {editingLead?.id && editingLead?.contact_id && onMakeProposal && (
                        editingLead.has_proposal ? (
                            <span
                                className="px-4 py-1.5 border border-foreground/30 text-foreground/70 rounded-lg font-bold text-sm whitespace-nowrap flex items-center gap-1.5"
                            >
                                <span
                                    className="w-4 h-4 flex items-center justify-center text-[9px] font-black rounded-full shrink-0"
                                    style={{ backgroundColor: '#FFE600', color: '#1a1a1a' }}
                                >
                                    P
                                </span>
                                Em Proposta
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onMakeProposal(editingLead.contact_id!, editingLead.id!)}
                                className="px-4 py-1.5 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 shadow-sm active:scale-[0.97] transition-all whitespace-nowrap"
                            >
                                Fazer Proposta
                            </button>
                        )
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-4 py-1.5 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 shadow-sm active:scale-[0.97] transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                        {isLoading ? "Processando..." : (editingLead ? "Salvar Alterações" : "Criar Lead")}
                    </button>
                </div>
                )
            }
        >
            {showMethodSelection ? (
                <div className="py-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 ml-1">
                        Como deseja cadastrar?
                    </p>
                    <div className="flex flex-col gap-2">
                        {/* Preenchimento Manual */}
                        <button
                            onClick={() => handleSelectMethod('manual')}
                            className="group flex items-center gap-4 bg-foreground/5 hover:bg-foreground/10 border border-border/40 hover:border-emerald-500/30 rounded-xl px-4 py-4 transition-all text-left"
                        >
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors shrink-0">
                                <PenLine size={20} className="text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground">Preenchimento Manual</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                    Preencha todos os campos do lead manualmente
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0" />
                        </button>

                        {/* Importação com IA ou Planilha */}
                        <button
                            onClick={() => handleSelectMethod('import_bulk')}
                            className="group flex items-center gap-4 bg-foreground/5 hover:bg-foreground/10 border border-border/40 hover:border-purple-500/30 rounded-xl px-4 py-4 transition-all text-left"
                        >
                            <div className="p-2.5 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors shrink-0">
                                <Sparkles size={20} className="text-purple-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-foreground">Importar com IA ou Planilha</p>
                                    <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-wider rounded-md">IA</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                    Importe um ou múltiplos leads a partir de prints (fotos), PDFs ou planilhas
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0" />
                        </button>
                    </div>
                </div>
            ) : (
            <div className="space-y-6">
                {/* Tabs for IA if editing */}

                    <div className="space-y-8">
                    {/* Seção: Dados Pessoais */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Dados Pessoais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-4 items-end">
                                {editingLead && (
                                    <div className="w-11 h-11 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground flex-shrink-0 border border-border/10 mb-1">
                                        {editingLead.avatar_url ? (
                                            <img src={editingLead.avatar_url} alt={leadData.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} />
                                        )}
                                    </div>
                                )}
                                <div className="flex-1 md:flex-[2]">
                                    <FormInput
                                        label="Nome completo"
                                        value={leadData.name}
                                        onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                                <div className="w-full md:w-[130px]">
                                    <FormInput
                                        label="Criado em"
                                        type="date"
                                        value={leadData.date}
                                        onChange={(e) => setLeadData({ ...leadData, date: e.target.value })}
                                    />
                                </div>
                                {(userRole === 'admin' || userRole === 'superadmin') && (
                                    <div className="w-full md:w-[200px]">
                                        <FormSelect
                                            label="Responsável"
                                            value={leadData.assigned_to}
                                            onChange={(e) => setLeadData({ ...leadData, assigned_to: e.target.value })}
                                            options={[
                                                { value: '', label: 'Não atribuído' },
                                                ...brokers.filter(b => b.role !== 'admin' && b.role !== 'superadmin').map(b => ({ value: b.id, label: b.full_name }))
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <FormInput
                                    label="Telefone"
                                    value={leadData.phone}
                                    onChange={(e) => setLeadData({ ...leadData, phone: formatPhone(e.target.value) })}
                                    placeholder="(48) 99999 9999"
                                />
                                {leadData.phone && (
                                    <a
                                        href={`https://wa.me/55${leadData.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors w-fit"
                                    >
                                        <MessageSquare size={12} />
                                        Abrir conversa no WhatsApp
                                    </a>
                                )}
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
                        </div>
                    </div>

                    {/* Seção: Captação */}
                    <div className="space-y-4 pt-8 border-t border-border/50">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Captação</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                {!isAddingSource ? (
                                    <FormSelect
                                        label="Origem"
                                        value={leadData.lead_source}
                                        onChange={(e) => {
                                            if (e.target.value === 'ADD_NEW') {
                                                setIsAddingSource(true)
                                            } else {
                                                setLeadData({ ...leadData, lead_source: e.target.value })
                                            }
                                        }}
                                        options={[
                                            { value: '', label: 'Selecione a origem' },
                                            ...sources.map(s => ({ value: s, label: s })),
                                            { value: 'ADD_NEW', label: 'Outra' }
                                        ]}
                                    />
                                ) : (
                                    <FormInput
                                        label="Origem (Nova)"
                                        value={newSource}
                                        onChange={(e) => setNewSource(e.target.value)}
                                        placeholder="Ex: WhatsApp"
                                        rightElement={
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setIsAddingSource(false)
                                                    setNewSource('')
                                                }}
                                                className="text-muted-foreground hover:text-foreground p-1"
                                                title="Cancelar"
                                            >
                                                <X size={14} />
                                            </button>
                                        }
                                    />
                                )}
                            </div>
                            <div>
                                {!isAddingCampaign ? (
                                    <FormSelect
                                        label="Campanha"
                                        value={leadData.campaign}
                                        disabled={!leadData.lead_source}
                                        onChange={(e) => {
                                            if (e.target.value === 'ADD_NEW') {
                                                setIsAddingCampaign(true)
                                            } else {
                                                setLeadData({ ...leadData, campaign: e.target.value })
                                            }
                                        }}
                                        options={[
                                            { value: '', label: leadData.lead_source ? 'Selecione a campanha' : 'Selecione uma origem primeiro' },
                                            ...campaigns.map(c => ({ value: c, label: c })),
                                            { value: 'ADD_NEW', label: 'Outra' }
                                        ]}
                                    />
                                ) : (
                                    <FormInput
                                        label="Campanha (Nova)"
                                        value={newCampaign}
                                        onChange={(e) => setNewCampaign(e.target.value)}
                                        placeholder="Ex: Verão 2026"
                                        rightElement={
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setIsAddingCampaign(false)
                                                    setNewCampaign('')
                                                }}
                                                className="text-muted-foreground hover:text-foreground p-1"
                                                title="Cancelar"
                                            >
                                                <X size={14} />
                                            </button>
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Seção: Interesse */}
                    <div className="space-y-4 pt-8 border-t border-border/50">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Interesse</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <PropertyAutocomplete
                                    tenantId={tenantId}
                                    label="Imóvel Cadastrado"
                                    placeholder="Digite o nome do imóvel"
                                    showIcon={false}
                                    selectedItem={leadData.selectedProperty}
                                    onSelect={(property) => setLeadData({ ...leadData, interest: property.title, property_id: property.id, property_interest: property.title, selectedProperty: property })}
                                    onClear={() => setLeadData({ ...leadData, interest: '', property_id: '', property_interest: '', selectedProperty: null })}
                                />
                            </div>
                            <div>
                                <FormInput
                                    label="Imóvel de Interesse (texto livre)"
                                    value={leadData.property_interest}
                                    onChange={(e) => setLeadData({ ...leadData, property_interest: e.target.value })}
                                    placeholder="Ex: Apto 3 quartos na praia..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seção: Negociação */}
                    <div className="space-y-4 pt-8 border-t border-border/50">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Negociação</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    value={leadData.value}
                                    onChange={(e) => setLeadData({ ...leadData, value: formatCurrencyBRL(e.target.value) })}
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seção: Notas */}
                    <div className="space-y-4 pt-8 border-t border-border/50">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Notas</h3>
                        <FormTextarea
                            value={leadData.notes}
                            onChange={(e) => setLeadData({ ...leadData, notes: e.target.value })}
                            rows={3}
                            placeholder="Alguma observação importante sobre o lead..."
                        />
                    </div>

                    {/* Seção: Mídias e Docs */}
                    <div className="space-y-4 pt-8 border-t border-border/50">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Mídias e Docs</h3>
                        <MediaUpload
                            pathPrefix={`leads/${tenantId}`}
                            images={leadData.images}
                            videos={leadData.videos}
                            documents={leadData.documents}
                            onUpload={handleMediaUpload}
                            onRemove={handleMediaRemove}
                        />
                    </div>

                    </div>
                </div>
            )}
        </Modal>
    )
}
