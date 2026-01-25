'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Mail, Phone, MapPin, MoreHorizontal, Edit, Trash2, X, ChevronDown, Filter, User } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { formatPhone } from '@/lib/utils/phone'
import { fetchAddressByCep, formatCEP } from '@/lib/utils/cep'
import { createNewClient, updateClient, deleteClient } from '@/app/_actions/clients'
import { getBrokers, getProfile } from '@/app/_actions/profile'
import { toast } from 'sonner'
import { ClientListItem } from './ClientListItem'

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
        primary_interest: ''
    })
    const [editingClientId, setEditingClientId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [cepLoading, setCepLoading] = useState(false)

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
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesBroker = selectedBroker === 'all' || client.assigned_to === selectedBroker

        return matchesSearch && matchesBroker
    })

    const handleEdit = (client: any) => {
        setFormData({
            name: client.name,
            email: client.email,
            phone: client.phone,
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
            primary_interest: client.primary_interest || ''
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
            primary_interest: ''
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
                    primary_interest: ''
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-full md:w-[310px]">
                        <FormInput
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={Search}
                        />
                    </div>
                    {(userRole === 'admin' || userRole === 'superadmin') && brokers.length > 0 && (
                        <div className="relative group min-w-[180px]">
                            <select
                                value={selectedBroker}
                                onChange={(e) => setSelectedBroker(e.target.value)}
                                className="w-full appearance-none pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-muted/10"
                            >
                                <option value="all">Todos os Corretores</option>
                                {brokers.map((broker) => (
                                    <option key={broker.id} value={broker.id}>
                                        {broker.full_name}
                                    </option>
                                ))}
                            </select>
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                    )}
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary hover:opacity-90 text-secondary-foreground rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99]"
                    >
                        <Plus size={18} />
                        Novo Cliente
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Cliente</th>
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Contato</th>
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center hidden lg:table-cell">Leads e Interesses</th>
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
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
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
            >
                <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                    {/* Informações Pessoais */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Informações Pessoais</h3>
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
                            <FormInput
                                label="Telefone / WhatsApp"
                                required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                placeholder="(48) 99999 9999"
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
                        </div>
                    </div>

                    {/* Endereço */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Endereço</h3>
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
                            <div className="md:col-span-2">
                                <FormInput
                                    label="Rua"
                                    value={formData.address_street}
                                    onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                    placeholder="Rua / Avenida"
                                />
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

                    {/* Interesse */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Interesse</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormSelect
                                label="Tipo de Interesse"
                                value={formData.primary_interest}
                                onChange={e => setFormData({ ...formData, primary_interest: e.target.value })}
                                options={[
                                    { value: '', label: 'Selecione...' },
                                    { value: 'compra', label: 'Compra' },
                                    { value: 'venda', label: 'Venda' },
                                    { value: 'aluguel', label: 'Aluguel' }
                                ]}
                            />
                            <div className="md:col-span-2">
                                <FormTextarea
                                    label="Detalhes do Interesse"
                                    value={formData.interest}
                                    onChange={e => setFormData({ ...formData, interest: e.target.value })}
                                    placeholder="Ex: Apartamento 3 dormitórios no Centro"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2.5 rounded-lg font-bold border border-border text-foreground hover:bg-muted transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={loading}
                            className="flex-[2] bg-primary text-primary-foreground font-bold py-2.5 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 text-sm shadow-sm"
                        >
                            {loading ? 'Salvando...' : (editingClientId ? 'Atualizar Dados' : 'Criar Cliente')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
