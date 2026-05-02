'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Mail, Phone, MapPin, MoreHorizontal, Edit, Trash2, X, ChevronDown, Filter, User, MessageSquare, Loader2, Calendar, LayoutGrid, List } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { ClientFilterModal } from './ClientFilterModal'
import ClientCard from './ClientCard'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { MediaUpload } from '@/components/shared/MediaUpload'
import { formatPhone } from '@/lib/utils/phone'
import { fetchAddressByCep, formatCEP, fetchCepByAddress, ViaCEPResponse } from '@/lib/utils/cep'
import { createNewClient, updateClient, deleteClient, archiveClient } from '@/app/_actions/clients'
import { getBrokers, getProfile } from '@/app/_actions/profile'
import { toast } from 'sonner'
import { ClientListItem } from './ClientListItem'
import { PageHeader } from '@/components/shared/PageHeader'

interface ClientListProps {
    initialClients: any[]
    tenantId: string
    profileId: string
}

export default function ClientList({ initialClients, tenantId, profileId }: ClientListProps) {
    const [clients, setClients] = useState(initialClients)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBroker, setSelectedBroker] = useState('all')
    const [brokers, setBrokers] = useState<any[]>([])
    const [userRole, setUserRole] = useState<string>('user')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        interest: '',
        primaryInterest: '',
        brokerId: 'all',
        maritalStatus: '',
        status: 'active'
    })

    useEffect(() => {
        if (selectedBroker !== filters.brokerId) {
            setFilters(prev => ({ ...prev, brokerId: selectedBroker }))
        }
    }, [selectedBroker])

    // Form States
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

    const [editingClientId, setEditingClientId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [cepLoading, setCepLoading] = useState(false)
    const [searchResults, setSearchResults] = useState<ViaCEPResponse[]>([])
    const [showResults, setShowResults] = useState(false)
    const resultsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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

    const handleCepChange = async (cep: string) => {
        const formattedCep = formatCEP(cep)
        const digitsOnly = formattedCep.replace(/\D/g, '')

        // Se o CEP for apagado ou alterado (menos de 8 dígitos), limpa os campos de endereço
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

    useEffect(() => {
        async function fetchBrokers() {
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
        }
        fetchBrokers()
    }, [tenantId])

    const filteredClients = clients.filter(client => {
        // Filtro de status (ativo/arquivado)
        if (filters.status === 'active' && client.is_archived) return false
        if (filters.status === 'archived' && !client.is_archived) return false

        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesBroker = filters.brokerId === 'all' || client.assigned_to === filters.brokerId

        const matchesInterest = !filters.interest ||
            (client.interest && client.interest.toLowerCase().includes(filters.interest.toLowerCase()))

        const matchesContactType = !filters.primaryInterest || 
            (client.contact_type && client.contact_type.includes(filters.primaryInterest))

        const matchesMaritalStatus = !filters.maritalStatus || client.marital_status === filters.maritalStatus

        const clientDate = client.created_at ? new Date(client.created_at) : null
        let matchesDate = true
        if (clientDate) {
            if (filters.startDate) {
                const start = new Date(filters.startDate)
                start.setHours(0, 0, 0, 0)
                if (clientDate < start) matchesDate = false
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate)
                end.setHours(23, 59, 59, 999)
                if (clientDate > end) matchesDate = false
            }
        }

        return matchesSearch && matchesBroker && matchesInterest && matchesContactType && matchesMaritalStatus && matchesDate
    })

    const handleEdit = (client: any) => {
        setFormData({
            name: client.name,
            email: client.email,
            phone: client.phone ? formatPhone(client.phone) : '',
            interest: client.interest || '',
            cpf: client.cpf || '',
            address_street: client.address_street || '',
            address_number: client.address_number || '',
            address_complement: client.address_complement || '',
            address_neighborhood: client.address_neighborhood || '',
            address_city: client.address_city || '',
            address_state: client.address_state || '',
            address_zip_code: client.address_zip_code || '',
            marital_status: client.marital_status || '',
            birth_date: client.birth_date || '',
            contact_type: client.contact_type || [],
            property_regime: client.property_regime || '',
            spouse_name: client.spouse_name || '',
            spouse_email: client.spouse_email || '',
            spouse_phone: client.spouse_phone ? formatPhone(client.spouse_phone) : '',
            spouse_cpf: client.spouse_cpf || '',
            spouse_birth_date: client.spouse_birth_date || '',
            notes: client.notes || '',
            images: client.images || [],
            videos: client.videos || [],
            documents: client.documents || []
        })
        setEditingClientId(client.id)
        setIsModalOpen(true)
    }

    const handleOpenCreate = () => {
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
        setEditingClientId(null)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            const res = await deleteClient(id)
            if (res.success) {
                toast.success('Cliente excluído com sucesso')
                window.location.reload()
            } else {
                toast.error('Erro ao excluir cliente')
            }
        }
    }

    const handleArchive = async (id: string) => {
        const client = clients.find(c => c.id === id)
        const isCurrentlyArchived = client?.is_archived
        const action = isCurrentlyArchived ? 'desarquivar' : 'arquivar'

        if (confirm(`Tem certeza que deseja ${action} este cliente?`)) {
            const res = await archiveClient(id)
            if (res.success) {
                toast.success(isCurrentlyArchived ? 'Cliente desarquivado!' : 'Cliente arquivado!')
                window.location.reload()
            } else {
                toast.error(`Erro ao ${action} cliente`)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let res;
            if (editingClientId) {
                res = await updateClient(editingClientId, formData)
            } else {
                res = await createNewClient(tenantId, formData)
            }

            if (res.success) {
                toast.success(editingClientId ? 'Cliente atualizado!' : 'Cliente criado com sucesso!')
                setIsModalOpen(false)
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
                setEditingClientId(null)
                window.location.reload()
            } else {
                toast.error('Erro: ' + res.error)
            }
        } catch (err) {
            toast.error('Erro inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <PageHeader title="Clientes">
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto">
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-secondary hover:opacity-90 text-secondary-foreground rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap flex-1 md:flex-none order-1 md:order-4"
                    >
                        <Plus size={18} />
                        Novo Cliente
                    </button>

                    {/* View Toggle */}
                    <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm w-fit order-2 md:order-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                                    ? 'bg-secondary text-secondary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                                }`}
                            title="Visualização em Lista"
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                                    ? 'bg-secondary text-secondary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                                }`}
                            title="Visualização em Quadro"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 md:py-2 border rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap flex-1 md:flex-none order-3 md:order-3 ${
                            filters.status !== 'active' || filters.startDate || filters.endDate || filters.interest || filters.primaryInterest || filters.maritalStatus || (filters.brokerId && filters.brokerId !== 'all')
                                ? 'bg-secondary/10 border-secondary text-secondary-foreground'
                                : 'border-border bg-card hover:bg-muted/10 text-foreground'
                        }`}
                    >
                        <Filter size={18} />
                        Filtrar
                    </button>
                    <div className="w-full md:w-[310px] order-4 md:order-1">
                        <FormInput
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={Search}
                        />
                    </div>

                </div>
            </PageHeader>

            {/* Content Area */}
            {viewMode === 'list' ? (
                <div className="bg-card rounded-2xl border border-muted-foreground/30 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 border-b border-muted-foreground/30">
                                <tr>
                                    <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Cliente</th>
                                    <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Contato</th>
                                    <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center hidden lg:table-cell">Leads</th>
                                    <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center hidden lg:table-cell">Status</th>
                                    <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-muted-foreground/30">
                                {filteredClients.map(client => (
                                    <ClientListItem
                                        key={client.id}
                                        client={client}
                                        tenantId={tenantId}
                                        profileId={profileId}
                                        isExpanded={expandedId === client.id}
                                        onToggle={() => setExpandedId(expandedId === client.id ? null : client.id)}
                                        onEdit={() => handleEdit(client)}
                                        onDelete={() => handleDelete(client.id)}
                                        onArchive={() => handleArchive(client.id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredClients.map(client => (
                        <ClientCard
                            key={client.id}
                            client={{
                                ...client,
                                tags: client.tags || [],
                                value: client.value || 0,
                                notes: client.notes || ''
                            }}
                            tenantId={tenantId}
                            profileId={profileId}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}

            {filteredClients.length === 0 && (
                <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                    <p className="text-muted-foreground font-medium">Nenhum cliente disponível para exibição.</p>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingClientId ? "Editar Cliente" : "Novo Cliente"}
                size="lg"
                extraHeaderContent={
                    <button
                        type="submit"
                        form="client-form"
                        disabled={loading}
                        className="bg-secondary text-secondary-foreground font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-sm whitespace-nowrap"
                    >
                        {loading ? 'Salvando...' : (editingClientId ? 'Atualizar Dados' : 'Criar Cliente')}
                    </button>
                }
            >
                <form id="client-form" onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pb-4">
                    {/* Dados Pessoais */}
                    <div className="bg-muted/30 p-5 rounded-xl border border-border space-y-4 shadow-sm">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2">Dados Pessoais</h3>
                        
                        {/* Tipo de Contato */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground uppercase ml-1">Tipo de Contato</label>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { value: 'comprador', label: 'Comprador', color: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30' },
                                    { value: 'vendedor', label: 'Vendedor', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' },
                                    { value: 'construtora', label: 'Construtora', color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' }
                                ].map(option => {
                                    const isChecked = formData.contact_type.includes(option.value)
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                const updated = isChecked
                                                    ? formData.contact_type.filter((t: string) => t !== option.value)
                                                    : [...formData.contact_type, option.value]
                                                setFormData({ ...formData, contact_type: updated })
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                isChecked
                                                    ? option.color + ' ring-1 ring-current/20 shadow-sm'
                                                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                                            }`}
                                        >
                                            {isChecked ? '✓ ' : ''}{option.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <FormInput
                                    label="Nome Completo"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            <FormInput
                                label="E-mail"
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="joao@exemplo.com"
                            />
                            <div>
                                <FormInput
                                    label="Telefone / WhatsApp"
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

                        {/* Cônjuge | Sócio */}
                        <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cônjuge | Sócio</h4>
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
                    </div>

                    {/* Endereço */}
                    <div className="bg-muted/30 p-5 rounded-xl border border-border space-y-4 shadow-sm">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2">Endereço</h3>
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
                    <div className="bg-muted/30 p-5 rounded-xl border border-border space-y-4 shadow-sm">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2">Notas</h3>
                        <FormTextarea
                            label="Notas/Observações"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Alguma observação importante sobre o cliente..."
                            rows={3}
                        />
                    </div>

                    {/* Mídias e Docs */}
                    <div className="bg-muted/30 p-5 rounded-xl border border-border space-y-4 shadow-sm">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2">Mídias e Docs</h3>
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
            </Modal>
            <ClientFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                filters={filters}
                setFilters={setFilters}
                brokers={brokers}
                isAdmin={userRole === 'admin' || userRole === 'superadmin'}
                onClear={() => {
                    setFilters({
                        startDate: '',
                        endDate: '',
                        interest: '',
                        primaryInterest: '',
                        brokerId: 'all',
                        maritalStatus: '',
                        status: 'active'
                    });
                    setSelectedBroker('all');
                }}
            />
        </div>
    )
}
