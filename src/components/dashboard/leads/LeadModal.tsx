'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { formatPhone } from '@/lib/utils/phone'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { MediaUpload } from '@/components/shared/MediaUpload'
import { toast } from 'sonner'
import { createLead, updateLead, getLeadSources, createLeadSource, getLeadCampaigns, createLeadCampaign } from '@/app/_actions/leads'
import { getBrokers, getProfile } from '@/app/_actions/profile'
import { PropertyAutocomplete } from '@/components/dashboard/properties/PropertyAutocomplete'
import { MessageSquare, X, Sparkles, User } from 'lucide-react'
import LeadAICard from '@/components/ai/LeadAICard'
import type { Lead } from './PipelineBoard'

interface Broker {
    id: string
    full_name: string
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
    date?: string
}

const LEAD_MODAL_INITIAL_SOURCES = ['Meta', 'Google', 'Portal', 'Indicação', 'Carteira'] as const

interface LeadModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string
    stages: Array<{ id: string; name: string }>
    onSuccess: () => void
    editingLead?: EditableLead // Para edição
    hasAIAccess: boolean
}

export function LeadModal({
    isOpen,
    onClose,
    tenantId,
    stages,
    onSuccess,
    editingLead,
    hasAIAccess
}: LeadModalProps) {
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
    const [activeTab, setActiveTab] = useState<'info' | 'ai'>('info')

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
                selectedProperty: editingLead.property_id ? { id: editingLead.property_id, title: editingLead.interest } : null,
                date: editingLead.date || new Date().toISOString().split('T')[0],
                value: editingLead.value?.toString() || '',
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
            size="lg"
            extraHeaderContent={
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 shadow-sm active:scale-[0.97] transition-all disabled:opacity-50 whitespace-nowrap"
                >
                    {isLoading ? "Processando..." : (editingLead ? "Salvar Alterações" : "Criar Lead")}
                </button>
            }
        >
            <div className="space-y-6">
                {/* Tabs for IA if editing */}
                {editingLead?.id && (
                    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl mb-6">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'info' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <User size={16} />
                            Informações
                        </button>
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'ai' ? 'bg-[#FFE600] text-[#404F4F] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Sparkles size={16} />
                            IA & Matchmaking
                        </button>
                    </div>
                )}

                {activeTab === 'info' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Linha 1: Nome e Data */}
                    <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 md:flex-[2]">
                            <FormInput
                                label="Nome completo *"
                                value={leadData.name}
                                onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                                placeholder="Ex: João Silva"
                            />
                        </div>
                        <div className="w-full md:w-[160px]">
                            <FormInput
                                label="Data"
                                type="date"
                                value={leadData.date}
                                onChange={(e) => setLeadData({ ...leadData, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <FormInput
                            label="Telefone *"
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
                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <PropertyAutocomplete
                                tenantId={tenantId}
                                label="Imóvel Cadastrado"
                                placeholder="Buscar imóvel no sistema..."
                                icon={() => null}
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

                    {(userRole === 'admin' || userRole === 'superadmin') && (
                        <div className="col-span-1 md:col-span-2">
                            <FormSelect
                                label="Corretor Responsável"
                                value={leadData.assigned_to}
                                onChange={(e) => setLeadData({ ...leadData, assigned_to: e.target.value })}
                                options={[
                                    { value: '', label: 'Não atribuído' },
                                    ...brokers.map(b => ({ value: b.id, label: b.full_name }))
                                ]}
                            />
                        </div>
                    )}

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
                    <div className="col-span-1 md:col-span-2">
                        <FormTextarea
                            label="Notas/Observações"
                            value={leadData.notes}
                            onChange={(e) => setLeadData({ ...leadData, notes: e.target.value })}
                            rows={3}
                            placeholder="Alguma observação importante sobre o lead..."
                        />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-sm font-bold text-gray-800 ml-1 mb-3">Anexos</h3>
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
            ) : editingLead?.id ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <LeadAICard 
                            leadId={editingLead.id}
                            tenantId={tenantId}
                            profileId={editingLead.assigned_to}
                            leadName={leadData.name}
                            leadSource={leadData.lead_source}
                            interactions={((editingLead.whatsapp_chat || []) as ChatMessage[]).map((m) => 
                                `${m.fromMe ? 'Corretor' : 'Lead'}: ${m.message || m.text || ''}`
                            )}
                            hasAIAccess={hasAIAccess}
                        />
                    </div>
                ) : null}


            </div>
        </Modal>
    )
}
