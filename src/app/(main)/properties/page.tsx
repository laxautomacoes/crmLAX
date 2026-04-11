'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, LayoutGrid, List, Download, Filter, WifiOff, FileText } from 'lucide-react'
import { FormInput } from '@/components/shared/forms/FormInput'
import { getProfile } from '@/app/_actions/profile'
import { getAssets, createAsset, updateAsset, deleteAsset } from '@/app/_actions/assets'
import { initStorageBuckets } from '@/app/_actions/storage'
import { getTenantByUserId } from '@/app/_actions/tenant'
import { checkPlanFeatureAction } from '@/app/_actions/plan'
import { toast } from 'sonner'
import { PropertyGallery } from '@/components/dashboard/properties/PropertyGallery'
import { PropertyList } from '@/components/dashboard/properties/PropertyList'
import { PropertyModal } from '@/components/dashboard/properties/PropertyModal'
import { PropertyDetailsModal } from '@/components/dashboard/properties/PropertyDetailsModal'
import { SendToLeadModal } from '@/components/dashboard/properties/SendToLeadModal'
import { PropertyFiltersModal } from '@/components/dashboard/properties/PropertyFiltersModal'
import { PropertyImportPDFModal } from '@/components/dashboard/properties/PropertyImportPDFModal'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { getOfflineProperties } from '@/services/db'
import { PageHeader } from '@/components/shared/PageHeader'

export const dynamic = 'force-dynamic'

export default function PropertiesPage() {
    const { isOnline } = useOfflineSync()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [isSendModalOpen, setIsSendModalOpen] = useState(false)
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [isImportPDFOpen, setIsImportPDFOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [hasAIAccess, setHasAIAccess] = useState(false)
    const [hasMarketingAccess, setHasMarketingAccess] = useState(false)
    const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery')
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [tenantSlug, setTenantSlug] = useState<string>('')
    const [properties, setProperties] = useState<any[]>([])
    const [userRole, setUserRole] = useState<string>('user')
    const [userId, setUserId] = useState<string | null>(null)
    const [editingProperty, setEditingProperty] = useState<any | null>(null)
    const [viewingProperty, setViewingProperty] = useState<any | null>(null)
    const [sendingProperty, setSendingProperty] = useState<any | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const [filters, setFilters] = useState({
        status: 'all',
        type: 'all',
        minPrice: '',
        maxPrice: '',
        bedrooms: 'all',
        bathrooms: 'all',
        parking: 'all',
        sortBy: 'newest',
        city: '',
        neighborhood: ''
    })

    const fetchData = async () => {
        try {
            // Check offline status first
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                console.log("Modo Offline: Buscando dados locais...")
                const offlineProps = await getOfflineProperties()
                if (offlineProps && offlineProps.length > 0) {
                    setProperties(offlineProps)
                    toast.info('Modo Offline: Exibindo dados salvos.')
                } else {
                    toast.warning('Você está offline e não há dados salvos.')
                }
                setIsLoading(false)
                return
            }

            // Tentar inicializar buckets se necessário
            await initStorageBuckets()

            const { profile } = await getProfile()
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id)
                setUserRole(profile.role || 'user')
                setUserId(profile.id)

                // Buscar slug do tenant
                const tenant = await getTenantByUserId(profile.id)
                if (tenant) {
                    setTenantSlug(tenant.slug)
                }

                const [result, aiAccessResult, marketingAccessResult] = await Promise.all([
                    getAssets(profile.tenant_id, filters.status === 'all' ? undefined : filters.status),
                    checkPlanFeatureAction(profile.tenant_id, 'ai'),
                    checkPlanFeatureAction(profile.tenant_id, 'marketing')
                ])
                if (result.success) {
                    setProperties(result.data || [])
                }
                setHasAIAccess(aiAccessResult)
                setHasMarketingAccess(marketingAccessResult)
            }
        } catch (error) {
            console.error('Erro ao carregar imóveis:', error)
            // Fallback
            try {
                const offlineProps = await getOfflineProperties()
                if (offlineProps && offlineProps.length > 0) {
                    setProperties(offlineProps)
                    toast.info('Modo Offline (Erro de conexão)')
                } else {
                    toast.error('Erro ao carregar lista de imóveis')
                }
            } catch (e) {
                toast.error('Erro ao carregar lista de imóveis')
            }
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [filters.status])

    const handleSave = async (propertyData: any) => {
        if (!tenantId) return

        let result
        if (editingProperty) {
            result = await updateAsset(tenantId, editingProperty.id, propertyData)
        } else {
            result = await createAsset(tenantId, propertyData)
        }

        if (result.success) {
            toast.success(editingProperty ? 'Imóvel atualizado!' : 'Imóvel cadastrado!')
            setIsModalOpen(false)
            setEditingProperty(null)
            fetchData()
        } else {
            toast.error('Erro ao salvar imóvel: ' + result.error)
        }
    }

    const handleEdit = (prop: any) => {
        setEditingProperty(prop)
        setIsModalOpen(true)
    }

    const handleView = (prop: any) => {
        setViewingProperty(prop)
        setIsDetailsOpen(true)
    }

    const handleSend = (prop: any) => {
        setSendingProperty(prop)
        setIsSendModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este imóvel permanentemente?')) return
        if (!tenantId) return
        const result = await deleteAsset(tenantId, id)
        if (result.success) {
            toast.success('Imóvel excluído!')
            fetchData()
        } else {
            toast.error('Erro ao excluir')
        }
    }

    const handleExportCSV = () => {
        if (filteredProperties.length === 0) {
            toast.error('Nenhum imóvel para exportar')
            return
        }

        // Definir cabeçalhos (expandindo o JSON 'details')
        const headers = [
            'ID', 'Título', 'Tipo', 'Preço', 'Status',
            'Bairro', 'Cidade', 'Rua', 'Número', 'CEP',
            'Área Privativa', 'Área Total', 'Área Terreno', 'Área Construída',
            'Dormitórios', 'Suítes', 'Banheiros', 'Vagas', 'Vagas Numeração',
            'Torre/Bloco', 'Valor Condomínio', 'Valor IPTU',
            'Portaria 24h', 'Portaria Virtual', 'Piscina', 'Piscina Aquecida',
            'Espaço Gourmet', 'Salão de Festas', 'Academia', 'Sala de Jogos',
            'Sala Estudos/Coworking', 'Sala de Cinema', 'Playground', 'Brinquedoteca'
        ]

        // Mapear dados "achatando" o JSON details
        const csvRows = filteredProperties.map(prop => {
            const d = prop.details || {}
            const e = d.endereco || {}

            return [
                prop.id,
                `"${(prop.title || '').replace(/"/g, '""')}"`,
                prop.type,
                prop.price || 0,
                prop.status || 'Disponível',
                `"${(e.bairro || '').replace(/"/g, '""')}"`,
                `"${(e.cidade || '').replace(/"/g, '""')}"`,
                `"${(e.rua || '').replace(/"/g, '""')}"`,
                `"${(e.numero || '').replace(/"/g, '""')}"`,
                `"${(e.cep || '').replace(/"/g, '""')}"`,
                d.area_privativa || '',
                d.area_total || '',
                d.area_terreno || '',
                d.area_construida || '',
                d.dormitorios || d.quartos || 0,
                d.suites || 0,
                d.banheiros || 0,
                d.vagas || 0,
                `"${(d.vagas_numeracao || '').replace(/"/g, '""')}"`,
                `"${(d.torre_bloco || '').replace(/"/g, '""')}"`,
                d.valor_condominio || 0,
                d.valor_iptu || 0,
                d.portaria_24h ? 'Sim' : 'Não',
                d.portaria_virtual ? 'Sim' : 'Não',
                d.piscina ? 'Sim' : 'Não',
                d.piscina_aquecida ? 'Sim' : 'Não',
                d.espaco_gourmet ? 'Sim' : 'Não',
                d.salao_festas ? 'Sim' : 'Não',
                d.academia ? 'Sim' : 'Não',
                d.sala_jogos ? 'Sim' : 'Não',
                d.sala_estudos_coworking ? 'Sim' : 'Não',
                d.sala_cinema ? 'Sim' : 'Não',
                d.playground ? 'Sim' : 'Não',
                d.brinquedoteca ? 'Sim' : 'Não'
            ]
        })

        // Criar conteúdo CSV
        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n')

        // Criar blob e download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `imoveis-crm-lax-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success('Exportação iniciada!')
    }

    const filteredProperties = properties.filter(prop => {
        const matchesSearch = prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (prop.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            prop.details?.endereco?.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prop.details?.endereco?.cidade?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesType = filters.type === 'all' || prop.type === filters.type

        const price = prop.price || 0
        const matchesMinPrice = !filters.minPrice || price >= parseFloat(filters.minPrice)
        const matchesMaxPrice = !filters.maxPrice || price <= parseFloat(filters.maxPrice)

        const bedrooms = prop.details?.dormitorios || prop.details?.quartos || 0
        const matchesBedrooms = filters.bedrooms === 'all' || bedrooms >= parseInt(filters.bedrooms)

        const bathrooms = prop.details?.banheiros || 0
        const matchesBathrooms = filters.bathrooms === 'all' || bathrooms >= parseInt(filters.bathrooms)

        const parking = prop.details?.vagas || 0
        const matchesParking = filters.parking === 'all' || parking >= parseInt(filters.parking)

        const matchesCity = !filters.city ||
            prop.details?.endereco?.cidade?.toLowerCase().includes(filters.city.toLowerCase())

        const matchesNeighborhood = !filters.neighborhood ||
            prop.details?.endereco?.bairro?.toLowerCase().includes(filters.neighborhood.toLowerCase())

        return matchesSearch && matchesType && matchesMinPrice && matchesMaxPrice &&
            matchesBedrooms && matchesBathrooms && matchesParking &&
            matchesCity && matchesNeighborhood
    }).sort((a, b) => {
        switch (filters.sortBy) {
            case 'price_high':
                return (b.price || 0) - (a.price || 0)
            case 'price_low':
                return (a.price || 0) - (b.price || 0)
            case 'az':
                return (a.title || '').localeCompare(b.title || '')
            case 'oldest':
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            case 'newest':
            default:
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
    })


    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {!isOnline && (
                <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 rounded shadow-sm mb-4" role="alert">
                    <p className="font-bold flex items-center gap-2">
                        <WifiOff size={18} />
                        Modo Offline
                    </p>
                    <p className="text-sm">Você está vendo uma versão salva dos imóveis. Algumas funções como editar ou adicionar podem estar indisponíveis.</p>
                </div>
            )}
            <PageHeader 
                title="Imóveis"
                subtitle={`${filteredProperties.length} imóveis encontrados`}
            >
                <div className="flex items-center justify-center md:justify-end gap-3">
                    <div className="flex items-center bg-card border border-border rounded-lg p-0.5 shadow-sm">
                        <button
                            onClick={() => setViewMode('gallery')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'gallery' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            title="Visualização em Galeria"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            title="Visualização em Lista"
                        >
                            <List size={16} />
                        </button>
                    </div>

                    <FormInput
                        placeholder="Buscar imóveis..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={Search}
                        className="md:w-64"
                    />

                    <button
                        onClick={() => setIsFiltersOpen(true)}
                        className={`flex items-center gap-2 px-4 py-3 md:py-2 rounded-lg border transition-all text-sm font-bold shadow-sm active:scale-[0.98] ${isFiltersOpen || Object.values(filters).some(v => v !== 'all' && v !== '' && v !== 'newest')
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border text-foreground hover:bg-muted'
                            }`}
                    >
                        <Filter size={18} />
                        Filtros
                    </button>

                    <button
                        onClick={() => { setEditingProperty(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-3 md:py-2 rounded-lg hover:opacity-90 transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Novo Imóvel
                    </button>

                    <button
                        onClick={() => setIsImportPDFOpen(true)}
                        className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-3 md:py-2 rounded-lg hover:bg-primary/20 transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap"
                        title="Importar Tabela de Preços via IA"
                    >
                        <FileText size={18} />
                        Importar PDF
                    </button>
                </div>
            </PageHeader>

            {viewMode === 'gallery' ? (
                <PropertyGallery
                    properties={filteredProperties}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                    onSend={handleSend}
                    userRole={userRole}
                    userId={userId}
                />
            ) : (
                <PropertyList
                    properties={filteredProperties}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                    onSend={handleSend}
                    userRole={userRole}
                    userId={userId}
                />
            )}

            <PropertyModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingProperty(null)
                }}
                editingProperty={editingProperty}
                onSave={handleSave}
                userRole={userRole}
            />

            <PropertyDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => {
                    setIsDetailsOpen(false)
                    setViewingProperty(null)
                }}
                prop={viewingProperty}
                onSend={handleSend}
                userRole={userRole}
                hasAIAccess={hasAIAccess}
                hasMarketingAccess={hasMarketingAccess}
                tenantId={tenantId || ''}
            />

            {sendingProperty && tenantId && (
                <SendToLeadModal
                    isOpen={isSendModalOpen}
                    onClose={() => {
                        setIsSendModalOpen(false)
                        setSendingProperty(null)
                    }}
                    property={sendingProperty}
                    tenantId={tenantId}
                    tenantSlug={tenantSlug}
                />
            )}

            <PropertyFiltersModal
                isOpen={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                filters={filters}
                setFilters={setFilters}
                onExport={handleExportCSV}
                tenantId={tenantId}
                onImportSuccess={fetchData}
                userRole={userRole}
            />

            <PropertyImportPDFModal
                isOpen={isImportPDFOpen}
                onClose={() => setIsImportPDFOpen(false)}
                tenantId={tenantId}
                onImportSuccess={fetchData}
            />
        </div>
    )
}
