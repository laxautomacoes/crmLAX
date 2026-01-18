'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
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
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', interest: '' })
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
            interest: client.interest || ''
        })
        setEditingClientId(client.id)
        setIsModalOpen(true)
    }

    const handleOpenCreate = () => {
        setFormData({ name: '', email: '', phone: '', interest: '' })
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
                setFormData({ name: '', email: '', phone: '', interest: '' })
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
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99]"
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
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center hidden lg:table-cell">Status/Leads</th>
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
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-[#404F4F]/80 ml-1">Nome Completo</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: João Silva"
                            className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FFE600] focus:ring-1 focus:ring-[#FFE600] transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[#404F4F]/80 ml-1">E-mail</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="joao@exemplo.com"
                            className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FFE600] focus:ring-1 focus:ring-[#FFE600] transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[#404F4F]/80 ml-1">Telefone / WhatsApp</label>
                        <input
                            required
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                            placeholder="(48) 99999 9999"
                            className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FFE600] focus:ring-1 focus:ring-[#FFE600] transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[#404F4F]/80 ml-1">Interesse Inicial (Opcional)</label>
                        <input
                            value={formData.interest}
                            onChange={e => setFormData({ ...formData, interest: e.target.value })}
                            placeholder="Ex: Consultoria Premium"
                            className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FFE600] focus:ring-1 focus:ring-[#FFE600] transition-all"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-3 rounded-lg font-bold border border-[#404F4F]/20 text-[#404F4F] hover:bg-[#404F4F]/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={loading}
                            className="flex-[2] bg-[#404F4F] text-white font-bold py-3 rounded-lg hover:bg-[#2d3939] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : (editingClientId ? 'Atualizar Dados' : 'Criar Cliente')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
