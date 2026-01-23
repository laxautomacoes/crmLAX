'use client'

import { useState } from 'react'
import { Search, Plus, Mail, Phone, MapPin, MoreHorizontal, Edit, Trash2, X, ChevronDown } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { formatPhone } from '@/lib/utils/phone'
import { createNewClient, updateClient, deleteClient } from '@/app/_actions/clients'
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

    const filteredClients = clients.filter(client => {
        return client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <div className="relative w-full md:w-[310px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all text-foreground placeholder:text-muted-foreground shadow-sm text-sm"
                        />
                    </div>
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
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Nome Completo</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: João Silva"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">E-mail</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="joao@exemplo.com"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Telefone / WhatsApp</label>
                                <input
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                    placeholder="(48) 99999 9999"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">CPF</label>
                                <input
                                    value={formData.cpf}
                                    onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                    placeholder="000.000.000-00"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={formData.birth_date}
                                    onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Estado Civil</label>
                                <select
                                    value={formData.marital_status}
                                    onChange={e => setFormData({ ...formData, marital_status: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Solteiro(a)">Solteiro(a)</option>
                                    <option value="Casado(a)">Casado(a)</option>
                                    <option value="Divorciado(a)">Divorciado(a)</option>
                                    <option value="Viúvo(a)">Viúvo(a)</option>
                                    <option value="União Estável">União Estável</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Endereço */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Endereço</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Rua</label>
                                <input
                                    value={formData.address_street}
                                    onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                    placeholder="Nome da rua"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Número</label>
                                <input
                                    value={formData.address_number}
                                    onChange={e => setFormData({ ...formData, address_number: e.target.value })}
                                    placeholder="123"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Complemento</label>
                                <input
                                    value={formData.address_complement}
                                    onChange={e => setFormData({ ...formData, address_complement: e.target.value })}
                                    placeholder="Apto, Bloco, etc"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Bairro</label>
                                <input
                                    value={formData.address_neighborhood}
                                    onChange={e => setFormData({ ...formData, address_neighborhood: e.target.value })}
                                    placeholder="Bairro"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">CEP</label>
                                <input
                                    value={formData.address_zip_code}
                                    onChange={e => setFormData({ ...formData, address_zip_code: e.target.value })}
                                    placeholder="00000-000"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Cidade</label>
                                <input
                                    value={formData.address_city}
                                    onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                    placeholder="Cidade"
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Estado</label>
                                <input
                                    value={formData.address_state}
                                    onChange={e => setFormData({ ...formData, address_state: e.target.value })}
                                    placeholder="UF"
                                    maxLength={2}
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Interesse */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Interesse</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Tipo de Interesse</label>
                                <select
                                    value={formData.primary_interest}
                                    onChange={e => setFormData({ ...formData, primary_interest: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="compra">Compra</option>
                                    <option value="venda">Venda</option>
                                    <option value="aluguel">Aluguel</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-muted-foreground ml-1 uppercase">Detalhes do Interesse</label>
                                <textarea
                                    value={formData.interest}
                                    onChange={e => setFormData({ ...formData, interest: e.target.value })}
                                    placeholder="Ex: Apartamento 3 quartos no Centro"
                                    rows={2}
                                    className="w-full p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm resize-none"
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
