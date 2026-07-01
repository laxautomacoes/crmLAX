'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { ClientFilterModal } from './ClientFilterModal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { formatPhone } from '@/lib/utils/phone'
import { deleteClient, archiveClient } from '@/app/_actions/clients'
import { getBrokers, getProfile } from '@/app/_actions/profile'
import { toast } from 'sonner'
import { ClientListItem } from './ClientListItem'
import { ClientModal } from './clients/ClientModal'
import { PageHeader } from '@/components/shared/PageHeader'

interface ClientListProps {
    initialClients: any[]
    tenantId: string
    profileId: string
    openId?: string
}

export default function ClientList({ initialClients, tenantId, profileId, openId }: ClientListProps) {
    const [clients, setClients] = useState(initialClients)

    useEffect(() => {
        setClients(initialClients)
    }, [initialClients])

    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBroker, setSelectedBroker] = useState('all')
    const [brokers, setBrokers] = useState<any[]>([])
    const [userRole, setUserRole] = useState<string>('user')
    const [currentPage, setCurrentPage] = useState(1)
    const PAGE_SIZE = 25
    const [sortField, setSortField] = useState<'name' | 'created_at' | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
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

    // Modal state
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [selectedClient, setSelectedClient] = useState<any | null>(null)

    useEffect(() => {
        if (selectedBroker !== filters.brokerId) {
            setFilters(prev => ({ ...prev, brokerId: selectedBroker }))
        }
    }, [selectedBroker])

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

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, filters, sortField, sortDirection])

    useEffect(() => {
        if (openId && clients.length > 0) {
            const clientToOpen = clients.find(c => c.id === openId)
            if (clientToOpen) {
                setSelectedClient(clientToOpen)
                setIsClientModalOpen(true)
            }
        }
    }, [openId, clients])

    const filteredClients = clients.filter(client => {
        // Filtro de status (ativo/arquivado)
        if (filters.status === 'active' && client.is_archived) return false
        if (filters.status === 'archived' && !client.is_archived) return false

        const matchesSearch = (client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())

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

    useEffect(() => {
        if (clients.length > 0) {
            fetch('/api/debug-front', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientsLength: clients.length,
                    filteredClientsLength: filteredClients.length,
                    searchTerm,
                    filters,
                    firstClient: clients[0] ? {
                        id: clients[0].id,
                        name: clients[0].name,
                        is_archived: clients[0].is_archived,
                        assigned_to: clients[0].assigned_to,
                        contact_type: clients[0].contact_type,
                        marital_status: clients[0].marital_status,
                        created_at: clients[0].created_at
                    } : null
                })
            }).catch(console.error);
        }
    }, [clients, filteredClients, searchTerm, filters]);

    const toggleSort = (field: 'name' | 'created_at') => {
        if (sortField === field) {
            if (sortDirection === 'asc') {
                setSortDirection('desc')
            } else {
                // Terceiro clique: desativar sort
                setSortField(null)
                setSortDirection('asc')
            }
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const sortedClients = useMemo(() => {
        if (!sortField) return filteredClients
        return [...filteredClients].sort((a, b) => {
            if (sortField === 'name') {
                const nameA = (a.name || '').toLowerCase()
                const nameB = (b.name || '').toLowerCase()
                return sortDirection === 'asc' ? nameA.localeCompare(nameB, 'pt-BR') : nameB.localeCompare(nameA, 'pt-BR')
            }
            if (sortField === 'created_at') {
                const dateA = new Date(a.created_at || 0).getTime()
                const dateB = new Date(b.created_at || 0).getTime()
                return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
            }
            return 0
        })
    }, [filteredClients, sortField, sortDirection])

    const totalPages = Math.ceil(sortedClients.length / PAGE_SIZE)

    const paginatedClients = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        const end = start + PAGE_SIZE
        return sortedClients.slice(start, end)
    }, [sortedClients, currentPage])

    const renderSortIcon = (field: 'name' | 'created_at') => {
        if (sortField !== field) return <ArrowUpDown size={12} className="opacity-40 ml-1" />
        return sortDirection === 'asc'
            ? <ArrowUp size={12} className="text-accent-icon ml-1" />
            : <ArrowDown size={12} className="text-accent-icon ml-1" />
    }

    const handleOpenClient = (client: any) => {
        setSelectedClient(client)
        setIsClientModalOpen(true)
    }

    const handleOpenCreate = () => {
        setSelectedClient(null)
        setIsClientModalOpen(true)
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

    return (
        <div className="space-y-6 md:space-y-8">
            <PageHeader title="Clientes" subtitle={`${filteredClients.length} clientes encontrados`}>
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto">
                    {/* Linha 1 mobile: Busca + Toggle */}
                    <div className="w-full md:w-[320px] md:flex-none order-1 md:order-1">
                        <FormInput
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                            icon={Search}
                            iconSize={14}
                            iconStrokeWidth={1}
                            className="w-full h-[34px]"
                        />
                    </div>



                    <div className="grid grid-flow-col auto-cols-max gap-2 md:gap-3 w-full md:w-max order-2 md:order-2">
                        <button
                            onClick={() => setIsFilterModalOpen(true)}
                            className={`min-w-[130px] h-[34px] flex items-center justify-center gap-2 px-4 border rounded-lg transition-all text-sm font-bold uppercase tracking-wide whitespace-nowrap outline-none focus:ring-2 shadow-sm ${
                                filters.status !== 'active' || filters.startDate || filters.endDate || filters.interest || filters.primaryInterest || filters.maritalStatus || (filters.brokerId && filters.brokerId !== 'all')
                                    ? 'bg-secondary/10 border-secondary text-secondary-foreground hover:bg-secondary/20 focus:ring-secondary/50'
                                    : 'bg-card border-muted-foreground/30 text-foreground hover:bg-muted/50 focus:ring-ring/50'
                            }`}
                        >
                            <Filter size={14} strokeWidth={1} />
                            Filtrar
                        </button>

                        <button
                            onClick={handleOpenCreate}
                            className="min-w-[130px] h-[34px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-sm font-bold uppercase tracking-wide shadow-sm whitespace-nowrap"
                        >
                            <Plus size={14} strokeWidth={1} />
                            Novo Cliente
                        </button>
                    </div>

                </div>
            </PageHeader>

            <hr className="hidden md:block border-border -mt-2" />

            {/* Content Area */}
                <div className="bg-card rounded-xl border border-muted-foreground/30 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                            <thead className="bg-gray-200 dark:bg-muted/50 border-b border-muted-foreground/30">
                                <tr>
                                    <th
                                        className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center cursor-pointer select-none hover:text-foreground transition-colors"
                                        style={{ width: '16%' }}
                                        onClick={() => toggleSort('name')}
                                    >
                                        <span className="inline-flex items-center justify-center">
                                            Cliente
                                            {renderSortIcon('name')}
                                        </span>
                                    </th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '20%' }}>Contato</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center hidden lg:table-cell" style={{ width: '20%' }}>Leads</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center hidden lg:table-cell" style={{ width: '12%' }}>Status</th>
                                    <th
                                        className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center hidden lg:table-cell cursor-pointer select-none hover:text-foreground transition-colors"
                                        style={{ width: '12%' }}
                                        onClick={() => toggleSort('created_at')}
                                    >
                                        <span className="inline-flex items-center justify-center">
                                            Criado em
                                            {renderSortIcon('created_at')}
                                        </span>
                                    </th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '10%' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-muted-foreground/30">
                                {paginatedClients.map(client => (
                                    <ClientListItem
                                        key={client.id}
                                        client={client}
                                        tenantId={tenantId}
                                        profileId={profileId}
                                        onClickClient={() => handleOpenClient(client)}
                                        onEdit={() => handleOpenClient(client)}
                                        onDelete={() => handleDelete(client.id)}
                                        onArchive={() => handleArchive(client.id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Contador + Paginação */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 mt-4">
                    <span className="text-xs text-muted-foreground">
                        Exibindo {Math.min(currentPage * PAGE_SIZE, sortedClients.length)} de {sortedClients.length} clientes
                    </span>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                        currentPage === page
                                            ? 'bg-secondary text-secondary-foreground shadow-sm'
                                            : 'bg-card border border-border text-foreground hover:bg-muted'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

            {filteredClients.length === 0 && (
                <div className="text-center py-20 bg-card rounded-lg border border-border/40">
                    <p className="text-muted-foreground font-medium">Nenhum cliente disponível para exibição.</p>
                </div>
            )}

            {/* Client Modal */}
            <ClientModal
                isOpen={isClientModalOpen}
                onClose={() => { setIsClientModalOpen(false); setSelectedClient(null) }}
                tenantId={tenantId}
                profileId={profileId}
                editingClient={selectedClient}
                onSuccess={() => window.location.reload()}
            />

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
