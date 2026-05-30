'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { MediaUpload } from '@/components/shared/MediaUpload'
import { MediaPreviewModal } from '@/components/shared/MediaPreviewModal'
import { LeadTemperatureBadge } from '@/components/dashboard/leads/LeadTemperatureBadge'
import { formatPhone } from '@/lib/utils/phone'
import { fetchAddressByCep, formatCEP, fetchCepByAddress, ViaCEPResponse } from '@/lib/utils/cep'
import { createNewClient, updateClient } from '@/app/_actions/clients'
import { analyzeLeadProbability } from '@/app/_actions/ai-analysis'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User, Filter, Sparkles, MessageSquare, Search, Loader2,
    ChevronDown, MapPin, FileText, Image as ImageIcon, Video, DollarSign
} from 'lucide-react'
import { ClientProposalsTab } from './ClientProposalsTab'
import { LeadDocumentsTab } from '@/components/dashboard/leads/LeadDocumentsTab'
import { LeadFinanceTab } from '@/components/dashboard/leads/LeadFinanceTab'

interface ClientModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string
    profileId: string
    editingClient?: any | null
    onSuccess: () => void
    initialTab?: 'info' | 'leads' | 'proposals' | 'documents' | 'financeiro' | 'ai'
    initialProposalLeadId?: string | null
}

export function ClientModal({
    isOpen,
    onClose,
    tenantId,
    profileId,
    editingClient,
    onSuccess,
    initialTab,
    initialProposalLeadId
}: ClientModalProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'leads' | 'proposals' | 'documents' | 'financeiro' | 'ai'>(initialTab || 'info')
    const [pendingProposalLeadId, setPendingProposalLeadId] = useState<string | null>(initialProposalLeadId || null)
    const [loading, setLoading] = useState(false)
    const [cepLoading, setCepLoading] = useState(false)
    const [searchResults, setSearchResults] = useState<ViaCEPResponse[]>([])
    const [showResults, setShowResults] = useState(false)
    const resultsRef = useRef<HTMLDivElement>(null)

    // Sincronizar quando vem de fora (ex: LeadModal → Fazer Proposta)
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab)
        if (initialProposalLeadId) setPendingProposalLeadId(initialProposalLeadId)
    }, [initialTab, initialProposalLeadId])

    // AI State
    const [isAnalyzed, setIsAnalyzed] = useState(false)
    const [analysisLoading, setAnalysisLoading] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        interest: '',
        cpf: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        address_zip_code: '',
        marital_status: '',
        birth_date: '',
        contact_type: [] as string[],
        property_regime: '',
        spouse_name: '',
        spouse_email: '',
        spouse_phone: '',
        spouse_cpf: '',
        spouse_birth_date: '',
        notes: '',
        images: [] as string[],
        videos: [] as string[],
        documents: [] as { name: string; url: string }[]
    })

    // Preencher form quando editando
    useEffect(() => {
        if (!isOpen) return

        if (editingClient) {
            setFormData({
                name: editingClient.name || '',
                email: editingClient.email || '',
                phone: editingClient.phone ? formatPhone(editingClient.phone) : '',
                interest: editingClient.interest || '',
                cpf: editingClient.cpf || '',
                address_street: editingClient.address_street || '',
                address_number: editingClient.address_number || '',
                address_complement: editingClient.address_complement || '',
                address_neighborhood: editingClient.address_neighborhood || '',
                address_city: editingClient.address_city || '',
                address_state: editingClient.address_state || '',
                address_zip_code: editingClient.address_zip_code || '',
                marital_status: editingClient.marital_status || '',
                birth_date: editingClient.birth_date || '',
                contact_type: editingClient.contact_type || [],
                property_regime: editingClient.property_regime || '',
                spouse_name: editingClient.spouse_name || '',
                spouse_email: editingClient.spouse_email || '',
                spouse_phone: editingClient.spouse_phone ? formatPhone(editingClient.spouse_phone) : '',
                spouse_cpf: editingClient.spouse_cpf || '',
                spouse_birth_date: editingClient.spouse_birth_date || '',
                notes: editingClient.notes || '',
                images: editingClient.images || [],
                videos: editingClient.videos || [],
                documents: editingClient.documents || []
            })
            setActiveTab('info')
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                interest: '',
                cpf: '',
                address_street: '',
                address_number: '',
                address_complement: '',
                address_neighborhood: '',
                address_city: '',
                address_state: '',
                address_zip_code: '',
                marital_status: '',
                birth_date: '',
                contact_type: [],
                property_regime: '',
                spouse_name: '',
                spouse_email: '',
                spouse_phone: '',
                spouse_cpf: '',
                spouse_birth_date: '',
                notes: '',
                images: [],
                videos: [],
                documents: []
            })
            setActiveTab('info')
        }

        // Reset AI
        setIsAnalyzed(false)
        setAnalysisResult(null)
    }, [isOpen, editingClient])

    // Click outside para fechar resultado de CEP
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMediaUpload = (type: 'images' | 'videos' | 'documents', files: any[]) => {
        setFormData(prev => ({
            ...prev,
            [type]: [...prev[type], ...files]
        }))
    }

    const handleMediaRemove = (type: 'images' | 'videos' | 'documents', index: number) => {
        setFormData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }))
    }

    const handleCepChange = async (cep: string) => {
        const formattedCep = formatCEP(cep)
        const digitsOnly = formattedCep.replace(/\D/g, '')

        if (digitsOnly.length < 8) {
            setFormData(prev => ({
                ...prev,
                address_zip_code: formattedCep,
                address_street: '',
                address_neighborhood: '',
                address_city: '',
                address_state: '',
                address_complement: '',
                address_number: ''
            }))
        } else {
            setFormData(prev => ({ ...prev, address_zip_code: formattedCep }))
        }

        if (digitsOnly.length === 8) {
            setCepLoading(true)
            try {
                const address = await fetchAddressByCep(formattedCep)
                if (address) {
                    setFormData(prev => ({
                        ...prev,
                        address_street: address.logradouro || prev.address_street,
                        address_neighborhood: address.bairro || prev.address_neighborhood,
                        address_city: address.localidade || prev.address_city,
                        address_state: address.uf || prev.address_state,
                        address_zip_code: formattedCep
                    }))
                }
            } finally {
                setCepLoading(false)
            }
        }
    }

    const handleSearchAddress = async () => {
        const { address_street: rua, address_city: cidade, address_state: estado } = formData

        if (!estado || estado.length !== 2) {
            toast.error('Informe o estado (UF) com 2 letras')
            return
        }
        if (!cidade || cidade.length < 3) {
            toast.error('Informe a cidade (mínimo 3 letras)')
            return
        }
        if (!rua || rua.length < 3) {
            toast.error('Informe a rua (mínimo 3 letras)')
            return
        }

        setCepLoading(true)
        try {
            const results = await fetchCepByAddress(estado, cidade, rua)
            setSearchResults(results)
            setShowResults(true)
            if (results.length === 0) {
                toast.error('Nenhum CEP encontrado para este endereço')
            }
        } catch (error) {
            console.error('Error searching address:', error)
            toast.error('Erro ao buscar endereço')
        } finally {
            setCepLoading(false)
        }
    }

    const selectAddress = (address: ViaCEPResponse) => {
        setFormData(prev => ({
            ...prev,
            address_street: address.logradouro,
            address_neighborhood: address.bairro,
            address_city: address.localidade,
            address_state: address.uf,
            address_zip_code: formatCEP(address.cep)
        }))
        setShowResults(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let res;
            if (editingClient?.id) {
                res = await updateClient(editingClient.id, formData)
            } else {
                res = await createNewClient(tenantId, formData)
            }

            if (res.success) {
                toast.success(editingClient ? 'Cliente atualizado!' : 'Cliente criado com sucesso!')
                onClose()
                onSuccess()
            } else {
                toast.error('Erro: ' + res.error)
            }
        } catch (err) {
            toast.error('Erro inesperado')
        } finally {
            setLoading(false)
        }
    }

    const handleAnalyze = async () => {
        setAnalysisLoading(true)
        try {
            const result = await analyzeLeadProbability({
                tenant_id: tenantId,
                profile_id: profileId,
                name: editingClient?.name || '',
                phone: editingClient?.phone || '',
                source: editingClient?.interest || '',
                interactions: [editingClient?.notes || '']
            })
            if (result.success) {
                setAnalysisResult(result.analysis)
                setIsAnalyzed(true)
            } else {
                toast.error('Erro ao gerar análise.')
            }
        } catch (error) {
            toast.error('Erro na conexão com IA.')
        } finally {
            setAnalysisLoading(false)
        }
    }

    const isEditing = !!editingClient?.id

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                    {isEditing ? "Editar Cliente" : "Novo Cliente"}
                </h3>
            }
            size="xl"
            align="top"
            extraHeaderContent={
                <button
                    type="submit"
                    form="client-modal-form"
                    disabled={loading}
                    className="bg-secondary text-secondary-foreground font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-sm whitespace-nowrap"
                >
                    {loading ? 'Salvando...' : (isEditing ? 'Atualizar Dados' : 'Criar Cliente')}
                </button>
            }
        >
            <div className="space-y-6">
                {/* Tabs — só para clientes existentes */}
                {isEditing && (
                    <div className="flex items-center gap-1.5 p-1.5 rounded-xl mb-6 overflow-x-auto no-scrollbar border border-border/30" style={{ backgroundColor: 'var(--background)' }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('info')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'info' ? 'bg-[#FFE600] text-[#404F4F] shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
                        >
                            <User size={14} />
                            Informações
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('leads')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'leads' ? 'bg-[#FFE600] text-[#404F4F] shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
                        >
                            <Filter size={14} />
                            Leads
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('proposals')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'proposals' ? 'bg-[#FFE600] text-[#404F4F] shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
                        >
                            <FileText size={14} />
                            Propostas
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('documents')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'documents' ? 'bg-[#FFE600] text-[#404F4F] shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
                        >
                            <FileText size={14} />
                            Documentos
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('financeiro')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'financeiro' ? 'bg-[#FFE600] text-[#404F4F] shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
                        >
                            <DollarSign size={14} />
                            Financeiro
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('ai')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'ai' ? 'bg-[#FFE600] text-[#404F4F] shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
                        >
                            <Sparkles size={14} />
                            Análise IA
                        </button>
                    </div>
                )}

                {/* Tab: Informações */}
                {activeTab === 'info' && (
                    <form id="client-modal-form" onSubmit={handleSubmit} className="space-y-8 px-1 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {/* Dados Pessoais */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Dados Pessoais</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2 flex flex-col md:flex-row md:items-end gap-4">
                                                <div className="flex-1">
                                                    <FormInput
                                                        label="Nome Completo"
                                                        required
                                                        value={formData.name}
                                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                        placeholder="Ex: João Silva"
                                                    />
                                                </div>
                                                {/* Tipo de Contato */}
                                                <div className="flex items-center gap-3 pb-[10px] shrink-0">
                                                    {[
                                                        { value: 'comprador', label: 'Comprador' },
                                                        { value: 'vendedor', label: 'Vendedor' },
                                                        { value: 'construtora', label: 'Construtora' }
                                                    ].map(option => {
                                                        const isChecked = formData.contact_type.includes(option.value)
                                                        return (
                                                            <label
                                                                key={option.value}
                                                                className="flex items-center gap-1.5 cursor-pointer select-none group"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {
                                                                        const updated = isChecked
                                                                            ? formData.contact_type.filter((t: string) => t !== option.value)
                                                                            : [...formData.contact_type, option.value]
                                                                        setFormData({ ...formData, contact_type: updated })
                                                                    }}
                                                                    className="w-4 h-4 rounded border-muted-foreground/40 bg-foreground/5 text-secondary focus:ring-secondary/30 focus:ring-offset-0 cursor-pointer accent-[#FFE600]"
                                                                />
                                                                <span className={`text-xs font-bold transition-colors ${isChecked ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/80'}`}>
                                                                    {option.label}
                                                                </span>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <FormInput
                                                    label="Telefone"
                                                    required
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                                    placeholder="(48) 99999 9999"
                                                />
                                                {formData.phone && (
                                                    <a
                                                        href={`https://wa.me/55${formData.phone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors w-fit"
                                                    >
                                                        <MessageSquare size={12} />
                                                        Abrir conversa no WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                            <FormInput
                                                label="E-mail"
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="joao@exemplo.com"
                                            />
                                            <FormInput
                                                label="CPF"
                                                value={formData.cpf}
                                                onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                                placeholder="000.000.000-00"
                                            />
                                            <FormInput
                                                label="Data de Nascimento"
                                                type="date"
                                                value={formData.birth_date}
                                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                            />
                                            <FormSelect
                                                label="Estado Civil"
                                                value={formData.marital_status}
                                                onChange={e => setFormData({ ...formData, marital_status: e.target.value })}
                                                options={[
                                                    { value: '', label: 'Selecione...' },
                                                    { value: 'Solteiro(a)', label: 'Solteiro(a)' },
                                                    { value: 'Casado(a)', label: 'Casado(a)' },
                                                    { value: 'Divorciado(a)', label: 'Divorciado(a)' },
                                                    { value: 'Viúvo(a)', label: 'Viúvo(a)' },
                                                    { value: 'União Estável', label: 'União Estável' }
                                                ]}
                                            />
                                            <FormSelect
                                                label="Regime de Comunhão"
                                                value={formData.property_regime}
                                                onChange={e => setFormData({ ...formData, property_regime: e.target.value })}
                                                options={[
                                                    { value: '', label: 'Selecione...' },
                                                    { value: 'Comunhão Parcial', label: 'Comunhão Parcial' },
                                                    { value: 'Comunhão Universal', label: 'Comunhão Universal' },
                                                    { value: 'Separação Total', label: 'Separação Total' },
                                                    { value: 'Separação Obrigatória', label: 'Separação Obrigatória' },
                                                    { value: 'Participação Final nos Aquestos', label: 'Participação Final nos Aquestos' }
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    {/* Cônjuge | Sócio */}
                                    <div className="space-y-4 pt-8 border-t border-border/50">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Cônjuge | Sócio</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <FormInput
                                                    label="Nome Completo"
                                                    value={formData.spouse_name}
                                                    onChange={e => setFormData({ ...formData, spouse_name: e.target.value })}
                                                    placeholder="Nome do cônjuge ou sócio"
                                                />
                                            </div>
                                            <FormInput
                                                label="E-mail"
                                                type="email"
                                                value={formData.spouse_email}
                                                onChange={e => setFormData({ ...formData, spouse_email: e.target.value })}
                                                placeholder="email@exemplo.com"
                                            />
                                            <FormInput
                                                label="Telefone / WhatsApp"
                                                value={formData.spouse_phone}
                                                onChange={e => setFormData({ ...formData, spouse_phone: formatPhone(e.target.value) })}
                                                placeholder="(48) 99999 9999"
                                            />
                                            <FormInput
                                                label="CPF"
                                                value={formData.spouse_cpf}
                                                onChange={e => setFormData({ ...formData, spouse_cpf: e.target.value })}
                                                placeholder="000.000.000-00"
                                            />
                                            <FormInput
                                                label="Data de Nascimento"
                                                type="date"
                                                value={formData.spouse_birth_date}
                                                onChange={e => setFormData({ ...formData, spouse_birth_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Endereço */}
                                    <div className="space-y-4 pt-8 border-t border-border/50">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Endereço</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormInput
                                                label={
                                                    <div className="flex items-center gap-1">
                                                        CEP <span className="text-[9px] lowercase font-normal opacity-70">(digite para buscar endereço)</span>
                                                    </div>
                                                }
                                                value={formData.address_zip_code}
                                                onChange={e => handleCepChange(e.target.value)}
                                                placeholder="00000-000"
                                                disabled={cepLoading}
                                            />
                                            <div className="md:col-span-2 relative" ref={resultsRef}>
                                                <FormInput
                                                    label="Rua"
                                                    value={formData.address_street}
                                                    onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                                    placeholder="Rua / Avenida"
                                                    rightElement={
                                                        <button
                                                            type="button"
                                                            onClick={handleSearchAddress}
                                                            className="p-1 hover:bg-muted rounded-md transition-colors text-foreground"
                                                            title="Buscar CEP por endereço"
                                                            disabled={cepLoading}
                                                        >
                                                            {cepLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                                        </button>
                                                    }
                                                />

                                                {showResults && (
                                                    <div className="absolute z-50 w-full mt-1 bg-card border border-muted-foreground/30 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                        {searchResults.length > 0 ? (
                                                            searchResults.map((result, index) => (
                                                                <button
                                                                    key={index}
                                                                    type="button"
                                                                    onClick={() => selectAddress(result)}
                                                                    className="w-full text-left px-4 py-2 hover:bg-secondary/10 border-b border-muted-foreground/10 last:border-0 transition-colors"
                                                                >
                                                                    <div className="text-sm font-medium">{result.logradouro}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {result.bairro}, {result.localidade} - {result.uf} | CEP: {result.cep}
                                                                    </div>
                                                                </button>
                                                            ))
                                                        ) : !cepLoading && (
                                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                                Nenhum endereço encontrado.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <FormInput
                                                label="Nº"
                                                value={formData.address_number}
                                                onChange={e => setFormData({ ...formData, address_number: e.target.value })}
                                                placeholder="123"
                                            />
                                            <FormInput
                                                label="Complemento"
                                                value={formData.address_complement}
                                                onChange={e => setFormData({ ...formData, address_complement: e.target.value })}
                                                placeholder="Apto, Bloco, etc"
                                            />
                                            <FormInput
                                                label="Bairro"
                                                value={formData.address_neighborhood}
                                                onChange={e => setFormData({ ...formData, address_neighborhood: e.target.value })}
                                                placeholder="Bairro"
                                            />
                                            <div className="md:col-span-2">
                                                <FormInput
                                                    label="Cidade"
                                                    value={formData.address_city}
                                                    onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                                    placeholder="Cidade"
                                                />
                                            </div>
                                            <FormInput
                                                label="Estado"
                                                value={formData.address_state}
                                                onChange={e => setFormData({ ...formData, address_state: e.target.value })}
                                                maxLength={2}
                                            />
                                        </div>
                                    </div>

                                    {/* Notas */}
                                    <div className="space-y-4 pt-8 border-t border-border/50">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Notas</h3>
                                        <FormTextarea
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder="Alguma observação importante sobre o cliente..."
                                            rows={3}
                                        />
                                    </div>

                                    {/* Mídias e Docs */}
                                    <div className="space-y-4 pt-8 border-t border-border/50">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Mídias e Docs</h3>
                                        <MediaUpload
                                            pathPrefix={`clients/${tenantId}`}
                                            images={formData.images}
                                            videos={formData.videos}
                                            documents={formData.documents}
                                            onUpload={handleMediaUpload}
                                            onRemove={handleMediaRemove}
                                        />
                                    </div>
                                </form>
                )}

                {/* Tab: Leads */}
                {activeTab === 'leads' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <ClientLeadsTab client={editingClient} onMakeProposal={(leadId: string) => {
                            setPendingProposalLeadId(leadId)
                            setActiveTab('proposals')
                        }} />
                    </div>
                )}

                {/* Tab: Propostas */}
                {activeTab === 'proposals' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <ClientProposalsTab 
                            client={editingClient} 
                            tenantId={tenantId}
                            initialLeadId={pendingProposalLeadId}
                            onConsumeInitialLead={() => setPendingProposalLeadId(null)}
                        />
                    </div>
                )}

                {/* Tab: Documentos */}
                {activeTab === 'documents' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <ClientLeadSelectorTab
                            client={editingClient}
                            tenantId={tenantId}
                            renderTab={(leadId, leadName, propertyInterest) => (
                                <LeadDocumentsTab
                                    leadId={leadId}
                                    tenantId={tenantId}
                                    leadName={leadName}
                                    propertyInterest={propertyInterest}
                                    userRole="admin"
                                />
                            )}
                            emptyMessage="Selecione um lead para gerenciar documentos."
                        />
                    </div>
                )}

                {/* Tab: Financeiro */}
                {activeTab === 'financeiro' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <ClientLeadSelectorTab
                            client={editingClient}
                            tenantId={tenantId}
                            renderTab={(leadId, _leadName, _propertyInterest, assignedTo) => (
                                <LeadFinanceTab
                                    leadId={leadId}
                                    tenantId={tenantId}
                                    assignedToId={assignedTo}
                                />
                            )}
                            emptyMessage="Selecione um lead para gerenciar o financeiro."
                        />
                    </div>
                )}

                {/* Tab: Análise IA */}
                {activeTab === 'ai' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <ClientAITab
                            isAnalyzed={isAnalyzed}
                            analysisLoading={analysisLoading}
                            analysisResult={analysisResult}
                            handleAnalyze={handleAnalyze}
                            setIsAnalyzed={setIsAnalyzed}
                        />
                    </div>
                )}
            </div>
        </Modal>
    )
}

// ─── Wrapper com seletor de Lead para Docs/Financeiro ────────────────

function ClientLeadSelectorTab({ 
    client, 
    tenantId, 
    renderTab, 
    emptyMessage 
}: { 
    client: any
    tenantId: string
    renderTab: (leadId: string, leadName: string, propertyInterest: string, assignedTo?: string) => React.ReactNode
    emptyMessage: string
}) {
    const [selectedLeadId, setSelectedLeadId] = useState('')
    const leads = client?.leads || []

    // Auto-select se houver apenas 1 lead
    useEffect(() => {
        if (leads.length === 1 && !selectedLeadId) {
            setSelectedLeadId(leads[0].id)
        }
    }, [leads, selectedLeadId])

    const selectedLead = leads.find((l: any) => l.id === selectedLeadId)

    return (
        <div className="space-y-4 px-1 pb-4">
            {leads.length === 0 ? (
                <div className="bg-muted/50 p-8 rounded-xl border border-dashed border-border text-center">
                    <FileText size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhum lead vinculado a este cliente.</p>
                </div>
            ) : (
                <>
                    {leads.length > 1 && (
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-foreground/80 ml-0.5">Selecione o Lead</label>
                            <div className="relative">
                                <select
                                    value={selectedLeadId}
                                    onChange={e => setSelectedLeadId(e.target.value)}
                                    className="appearance-none w-full bg-gray-50 dark:bg-input border border-gray-200 dark:border-border rounded-lg px-3 py-2.5 text-xs font-medium text-foreground outline-none cursor-pointer focus:ring-2 focus:ring-secondary/30 pr-8"
                                >
                                    <option value="">Selecione...</option>
                                    {leads.map((lead: any) => (
                                        <option key={lead.id} value={lead.id}>
                                            {lead.property_interest || lead.properties?.title || lead.source || `Lead ${new Date(lead.created_at).toLocaleDateString('pt-BR')}`}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {selectedLeadId && selectedLead ? (
                        renderTab(
                            selectedLeadId, 
                            client.name || '', 
                            selectedLead.property_interest || selectedLead.properties?.title || '',
                            selectedLead.assigned_to
                        )
                    ) : leads.length > 1 ? (
                        <div className="bg-muted/50 p-6 rounded-xl border border-dashed border-border text-center">
                            <p className="text-xs text-muted-foreground">{emptyMessage}</p>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    )
}

// ─── Aba Leads ──────────────────────────────────────────────────────

function ClientLeadsTab({ client, onMakeProposal }: { client: any; onMakeProposal?: (leadId: string) => void }) {
    return (
        <div className="space-y-6 px-1 pb-4">
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Leads e Interesses</h3>
                <div className="space-y-3">
                    {client.leads && client.leads.length > 0 ? (
                        client.leads.map((lead: any) => (
                            <LeadCardDropdown key={lead.id} lead={lead} onMakeProposal={onMakeProposal} />
                        ))
                    ) : (
                        <div className="bg-muted/50 p-6 rounded-xl border border-dashed border-border text-center">
                            <p className="text-xs text-muted-foreground">Nenhum lead vinculado a este cliente ainda.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function LeadCardDropdown({ lead, onMakeProposal }: { lead: any; onMakeProposal?: (leadId: string) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const hasAttachments = lead.images?.length > 0 || lead.videos?.length > 0 || lead.documents?.length > 0

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left"
            >
                <div className="flex-1 min-w-0">
                    <span className="text-base font-bold text-foreground truncate block">
                        {lead.property_interest || lead.properties?.title || lead.source || 'Interesse não especificado'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                        const c = lead.status_color
                        const isLight = c && ['#FFFFFF', '#FACC15', '#FDE047', '#FEF08A', '#FCD34D'].includes(c.toUpperCase())
                        return (
                            <span
                                className="px-2.5 py-0.5 text-xs font-medium rounded-full uppercase whitespace-nowrap"
                                style={c ? {
                                    backgroundColor: c,
                                    color: isLight ? '#1a1a1a' : '#ffffff',
                                } : {
                                    backgroundColor: 'var(--secondary)',
                                    color: 'var(--foreground)',
                                    opacity: 0.6
                                }}
                            >
                                {lead.status_name || lead.status}
                            </span>
                        )
                    })()}
                    <LeadTemperatureBadge lastInteractionAt={lead.last_interaction_at || lead.created_at} />
                    {lead.created_at && (
                        <span className="text-xs text-muted-foreground font-medium">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </span>
                    )}
                    <ChevronDown
                        size={14}
                        className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3 border-t border-border/50" style={{ backgroundColor: 'var(--background)' }}>
                            <div className="pt-3 space-y-1.5">
                                {lead.source && (
                                    <p className="text-base text-muted-foreground">
                                        <span className="font-bold">Origem:</span> {lead.source}
                                    </p>
                                )}
                                {lead.lead_source && lead.lead_source !== lead.source && (
                                    <p className="text-base text-muted-foreground">
                                        <span className="font-bold">Canal:</span> {lead.lead_source}
                                    </p>
                                )}
                                {lead.notes && (
                                    <p className="text-base text-muted-foreground">
                                        <span className="font-bold">Notas:</span> <span className="italic">"{lead.notes}"</span>
                                    </p>
                                )}
                            </div>
                            {hasAttachments && (
                                <LeadAttachments lead={lead} />
                            )}
                            {onMakeProposal && (
                                <div className="pt-2 border-t border-border/30">
                                    <button
                                        onClick={() => onMakeProposal(lead.id)}
                                        className="px-3 py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all w-full"
                                    >
                                        Fazer Proposta
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function LeadAttachments({ lead }: { lead: any }) {
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewIndex, setPreviewIndex] = useState(0)

    const mediaItems = [
        ...(lead.images || []).map((img: string, i: number) => ({ type: 'image' as const, url: img, label: `Imagem ${i + 1}` })),
        ...(lead.videos || []).map((vid: string, i: number) => ({ type: 'video' as const, url: vid, label: `Vídeo ${i + 1}` }))
    ]

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
                {lead.images?.map((img: string, i: number) => (
                    <button
                        key={`img-${i}`}
                        onClick={() => { setPreviewIndex(i); setPreviewOpen(true) }}
                        className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg text-base hover:bg-muted/50 transition-colors text-left"
                    >
                        <ImageIcon size={14} className="text-blue-500" />
                        <span className="truncate">Imagem {i + 1}</span>
                    </button>
                ))}
                {lead.videos?.map((vid: string, i: number) => (
                    <button
                        key={`vid-${i}`}
                        onClick={() => { setPreviewIndex((lead.images?.length || 0) + i); setPreviewOpen(true) }}
                        className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg text-base hover:bg-muted/50 transition-colors text-left"
                    >
                        <Video size={14} className="text-purple-500" />
                        <span className="truncate">Vídeo {i + 1}</span>
                    </button>
                ))}
                {lead.documents?.map((doc: any, i: number) => (
                    <a key={`doc-${i}`} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg text-base hover:bg-muted/50 transition-colors">
                        <FileText size={14} className="text-emerald-500" />
                        <span className="truncate">{doc.name || `Documento ${i + 1}`}</span>
                    </a>
                ))}
            </div>

            <MediaPreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                items={mediaItems}
                initialIndex={previewIndex}
            />
        </div>
    )
}

// ─── Aba IA ─────────────────────────────────────────────────────────

function ClientAITab({
    isAnalyzed,
    analysisLoading,
    analysisResult,
    handleAnalyze,
    setIsAnalyzed
}: {
    isAnalyzed: boolean
    analysisLoading: boolean
    analysisResult: string | null
    handleAnalyze: () => void
    setIsAnalyzed: (v: boolean) => void
}) {
    return (
        <div className="space-y-4 px-1 pb-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Inteligência Artificial</h3>
            <div className="bg-primary p-4 rounded-xl text-primary-foreground shadow-xl relative overflow-hidden group">

                {!isAnalyzed ? (
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="bg-secondary w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-secondary-foreground shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-sm">Análise Preditiva</h5>
                            <p className="text-xs text-primary-foreground/70 mt-0.5">Gere um insight automático baseado no comportamento deste cliente.</p>
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={analysisLoading}
                            className="px-4 py-2 bg-secondary hover:opacity-90 text-secondary-foreground rounded-lg font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 whitespace-nowrap"
                        >
                            {analysisLoading ? <span className="animate-pulse">Analisando...</span> : 'Gerar Insight'}
                        </button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h5 className="font-bold text-base flex items-center gap-2">
                                <Sparkles size={14} className="text-secondary" /> Resultado IA
                            </h5>
                            <button
                                onClick={() => setIsAnalyzed(false)}
                                className="text-xs text-primary-foreground/60 hover:text-primary-foreground underline"
                            >
                                Nova Análise
                            </button>
                        </div>
                        <p className="text-sm text-primary-foreground/90 leading-relaxed italic bg-black/20 p-4 rounded-xl border border-white/5">
                            {analysisResult}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
