'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, LayoutGrid, List, Map, Filter, WifiOff, Archive, Trash2 } from 'lucide-react'
import { FormInput } from '@/components/shared/forms/FormInput'
import { getProperties, createProperty, updateProperty, deleteProperty, approveProperty, rejectProperty, archiveProperty, togglePublishProperty } from '@/app/_actions/properties'
import { toast } from 'sonner'
import { parseCurrencyBRL } from '@/lib/utils/currency'
import { PropertyGallery } from '@/components/dashboard/properties/PropertyGallery'
import { PropertyList } from '@/components/dashboard/properties/PropertyList'
import { PropertyModal } from '@/components/dashboard/properties/PropertyModal'
import { PropertyDetailsModal } from '@/components/dashboard/properties/PropertyDetailsModal'
import { SendToLeadModal } from '@/components/dashboard/properties/SendToLeadModal'
import { PropertyFiltersModal } from '@/components/dashboard/properties/PropertyFiltersModal'
import { PropertyImportPDFModal } from '@/components/dashboard/properties/PropertyImportPDFModal'
import { PropertyScrapingModal } from '@/components/dashboard/properties/PropertyScrapingModal'
import { PropertyRejectModal } from '@/components/dashboard/properties/PropertyRejectModal'
import type { CreationMethod } from '@/components/dashboard/properties/PropertyModal'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { getOfflineProperties } from '@/services/db'
import { PropertiesMapView } from '@/components/shared/PropertiesMapView'
import { PageHeader } from '@/components/shared/PageHeader'
import { translatePropertyType } from '@/utils/property-translations'

interface PropertiesClientProps {
    initialProperties: any[]
    tenantId: string
    tenantSlug: string
    userId: string
    userRole: string
    hasAIAccess: boolean
    hasMarketingAccess: boolean
}

export default function PropertiesClient({
    initialProperties,
    tenantId,
    tenantSlug,
    userId,
    userRole,
    hasAIAccess,
    hasMarketingAccess,
}: PropertiesClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isOnline } = useOfflineSync()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [isSendModalOpen, setIsSendModalOpen] = useState(false)
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [isImportPDFOpen, setIsImportPDFOpen] = useState(false)
    const [isScrapingOpen, setIsScrapingOpen] = useState(false)
    const [scrapingInitialMode, setScrapingInitialMode] = useState<'url' | 'text'>('url')
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [viewMode, setViewMode] = useState<'gallery' | 'list' | 'map'>('list')
    const [properties, setProperties] = useState<any[]>(initialProperties)
    const [editingProperty, setEditingProperty] = useState<any | null>(null)
    const [viewingProperty, setViewingProperty] = useState<any | null>(null)
    const [sendingProperty, setSendingProperty] = useState<any | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [rejectingProperty, setRejectingProperty] = useState<any | null>(null)
    const [columnSort, setColumnSort] = useState<{ column: 'title' | 'type' | 'price' | null, direction: 'asc' | 'desc' }>({ column: null, direction: 'asc' })

    const [filters, setFilters] = useState({
        city: '',
        neighborhood: '',
        type: 'all',
        bedrooms: 'all',
        bathrooms: 'all',
        garages: 'all',
        minPrice: '',
        maxPrice: '',
        status: 'all',
        origin: 'all',
        situacao: 'all',
        suites: 'all',
        minArea: '',
        maxArea: '',
        published: 'all',
        empreendimento: 'all',
        sortBy: 'newest',
        archived: false,
        // Filtros avançados
        has_dependencia_empregada: false,
        has_despensa: false,
        has_escritorio: false,
        has_lavabo: false,
        has_sacada_sem_churrasqueira: false,
        has_sacada_com_churrasqueira: false,
        has_vista_livre: false
    })

    // Abre modal de edição automaticamente via query param ?edit={id}
    useEffect(() => {
        const editId = searchParams.get('edit')
        if (editId) {
            const propToEdit = properties.find((p: any) => p.id === editId)
            if (propToEdit) {
                setEditingProperty(propToEdit)
                setIsModalOpen(true)
            }
            // Limpa o query param da URL sem reload
            router.replace('/properties', { scroll: false })
        }
    }, [searchParams])

    // Abre modal de edição instantaneamente via evento customizado (vido do modal de detalhes interceptado)
    useEffect(() => {
        const handleOpenEdit = (e: Event) => {
            const customEvent = e as CustomEvent
            if (customEvent.detail) {
                setEditingProperty(customEvent.detail)
                setIsModalOpen(true)
            }
        }
        window.addEventListener('open-edit-property', handleOpenEdit)
        return () => {
            window.removeEventListener('open-edit-property', handleOpenEdit)
        }
    }, [])

    // Recarrega lista usando server action com contexto de sessão correto
    const refreshProperties = async (statusFilter?: string) => {
        setIsRefreshing(true)
        try {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                const offlineProps = await getOfflineProperties()
                if (offlineProps && offlineProps.length > 0) {
                    setProperties(offlineProps)
                    toast.info('Modo Offline: Exibindo dados salvos.')
                } else {
                    toast.warning('Você está offline e não há dados salvos.')
                }
                return
            }

            const result = await getProperties(
                tenantId,
                statusFilter === 'all' ? undefined : statusFilter,
                userId,
                userRole
            )
            if (result.success) {
                setProperties(result.data || [])
            } else {
                toast.error('Erro ao carregar imóveis')
            }
        } catch (error) {
            console.error('Erro ao recarregar imóveis:', error)
            try {
                const offlineProps = await getOfflineProperties()
                if (offlineProps && offlineProps.length > 0) {
                    setProperties(offlineProps)
                    toast.info('Modo Offline (Erro de conexão)')
                } else {
                    toast.error('Erro ao carregar lista de imóveis')
                }
            } catch {
                toast.error('Erro ao carregar lista de imóveis')
            }
        } finally {
            setIsRefreshing(false)
        }
    }

    const handleSave = async (propertyData: any) => {
        const isAutoSave = propertyData._isAutoSave
        const { _isAutoSave, ...cleanData } = propertyData

        let result
        if (editingProperty?.id) {
            result = await updateProperty(tenantId, editingProperty.id, cleanData)
        } else {
            result = await createProperty(tenantId, cleanData)
        }

        if (result.success) {
            if (!isAutoSave) {
                toast.success(editingProperty ? 'Imóvel atualizado!' : 'Imóvel cadastrado!')
            }
            // Atualiza o editingProperty com os dados salvos para manter o modal sincronizado
            if (result.data) {
                setEditingProperty(result.data)
                // Autosave: atualiza apenas o item local sem recarregar a lista toda
                if (isAutoSave && editingProperty?.id) {
                    setProperties(prev => prev.map(p => p.id === editingProperty.id ? { ...p, ...result.data } : p))
                }
            } else if (editingProperty?.id) {
                setEditingProperty({ ...editingProperty, ...cleanData })
                if (isAutoSave) {
                    setProperties(prev => prev.map(p => p.id === editingProperty.id ? { ...p, ...cleanData } : p))
                }
            }
            // Só recarrega a lista inteira no save manual (não no autosave)
            if (!isAutoSave) {
                refreshProperties(filters.status)
            }
        } else {
            toast.error('Erro ao salvar imóvel: ' + result.error)
        }
    }

    const handleApprove = async (id: string) => {
        if (!confirm('Deseja realmente autorizar este imóvel?')) return

        const result = await approveProperty(tenantId, id)
        if (result.success) {
            toast.success('Imóvel autorizado! O responsável foi notificado.')
            refreshProperties()
        } else {
            toast.error('Erro ao autorizar imóvel: ' + result.error)
        }
    }

    const handleReject = async (note: string) => {
        if (!rejectingProperty) return
        const result = await rejectProperty(tenantId, rejectingProperty.id, note)
        if (result.success) {
            toast.success('Imóvel reprovado! O responsável foi notificado.')
            setRejectingProperty(null)
            refreshProperties()
        } else {
            toast.error('Erro ao reprovar imóvel: ' + result.error)
        }
    }

    const handleEdit = (prop: any) => {
        setEditingProperty(prop)
        setIsModalOpen(true)
    }

    const handleView = (prop: any) => {
        if (prop.slug && prop.type) {
            router.push(`/properties/${prop.type}/${prop.slug}`)
        } else {
            // Fallback para imóveis sem slug (legado)
            setViewingProperty(prop)
            setIsDetailsOpen(true)
        }
    }

    const handleSend = (prop: any) => {
        setSendingProperty(prop)
        setIsSendModalOpen(true)
    }

    const handleDelete = (id: string) => {
        setConfirmDeleteId(id)
    }

    const handleConfirmDelete = async (id: string) => {
        const result = await deleteProperty(tenantId, id)
        if (result.success) {
            toast.success('Imóvel excluído!')
            setConfirmDeleteId(null)
            refreshProperties(filters.status)
        } else {
            toast.error('Erro ao excluir')
            setConfirmDeleteId(null)
        }
    }

    const handleArchive = async (id: string) => {
        const result = await archiveProperty(tenantId, id)
        if (result.success) {
            toast.success('Imóvel arquivado!')
            setConfirmArchiveId(null)
            refreshProperties(filters.archived ? 'archived' : filters.status)
        } else {
            toast.error('Erro ao arquivar: ' + result.error)
            setConfirmArchiveId(null)
        }
    }

    const handleTogglePublish = async (id: string, isPublished: boolean) => {
        const result = await togglePublishProperty(tenantId, id, isPublished)
        if (result.success) {
            setProperties(prev => prev.map(p => p.id === id ? { ...p, is_published: isPublished } : p))
            toast.success(isPublished ? 'Publicado no site!' : 'Removido do site')
        } else {
            toast.error('Erro ao alterar publicação: ' + result.error)
        }
    }

    const handleExportCSV = () => {
        if (filteredProperties.length === 0) {
            toast.error('Nenhum imóvel para exportar')
            return
        }

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

        const csvRows = filteredProperties.map(prop => {
            const d = prop.details || {}
            const e = d.endereco || {}
            return [
                prop.id,
                `"${(prop.title || '').replace(/"/g, '""')}"`,
                prop.type,
                prop.price || 0,
                prop.status || 'Available',
                `"${(e.bairro || '').replace(/"/g, '""')}"`,
                `"${(e.cidade || '').replace(/"/g, '""')}"`,
                `"${(e.rua || '').replace(/"/g, '""')}"`,
                `"${(e.numero || '').replace(/"/g, '""')}"`,
                `"${(e.cep || '').replace(/"/g, '""')}"`,
                d.area_privativa || '',
                d.area_total || '',
                d.area_terreno || '',
                d.area_construida || '',
                d.quartos || d.dormitorios || 0,
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
                d.brinquedoteca ? 'Sim' : 'Não',
            ]
        })

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n')

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

    // Quando o filtro de status muda, recarrega do servidor
    const handleSetFilters = (newFilters: typeof filters) => {
        const statusChanged = newFilters.status !== filters.status || newFilters.archived !== filters.archived
        setFilters(newFilters)
        if (statusChanged) {
            refreshProperties(newFilters.archived ? 'archived' : newFilters.status)
        }
    }

    const handleColumnSort = (column: 'title' | 'type' | 'price') => {
        setColumnSort(prev => {
            if (prev.column === column) {
                if (prev.direction === 'desc') return { column: null, direction: 'asc' }
                return { column, direction: 'desc' }
            }
            return { column, direction: 'asc' }
        })
    }

    const filteredProperties = properties.filter(prop => {
        const matchesSearch = (prop.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (prop.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (prop.details?.endereco?.bairro || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (prop.details?.endereco?.cidade || '').toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCity = !filters.city ||
            (prop.details?.endereco?.cidade || '').toLowerCase().includes(filters.city.toLowerCase())

        const matchesNeighborhood = !filters.neighborhood ||
            (prop.details?.endereco?.bairro || '').toLowerCase().includes(filters.neighborhood.toLowerCase())

        const matchesType = filters.type === 'all' || prop.type === filters.type

        const price = prop.price || 0
        const matchesMinPrice = !filters.minPrice || price >= parseCurrencyBRL(filters.minPrice)
        const matchesMaxPrice = !filters.maxPrice || price <= parseCurrencyBRL(filters.maxPrice)

        const bedrooms = prop.details?.dormitorios || prop.details?.quartos || 0
        const matchesBedrooms = filters.bedrooms === 'all' || bedrooms >= parseInt(filters.bedrooms)

        const bathrooms = prop.details?.banheiros || 0
        const matchesBathrooms = filters.bathrooms === 'all' || bathrooms >= parseInt(filters.bathrooms)

        const parking = prop.details?.vagas || 0
        const matchesGarages = filters.garages === 'all' || parking >= parseInt(filters.garages)

        const matchesStatus = filters.status === 'all' || prop.status === filters.status
        const matchesOrigin = filters.origin === 'all' || prop.origin === filters.origin

        const matchesSituacao = filters.situacao === 'all' || prop.details?.situacao === filters.situacao
        
        const propertySuites = parseInt(String(prop.details?.suites || '0'))
        const matchesSuites = filters.suites === 'all' || propertySuites >= parseInt(filters.suites)
        
        const areaPrivativa = parseFloat(String(prop.details?.area_privativa || prop.details?.area_total || '0').replace(/\./g, '').replace(',', '.')) || 0
        const minAreaNum = parseFloat(filters.minArea.replace(/\./g, '').replace(',', '.')) || 0
        const maxAreaNum = parseFloat(filters.maxArea.replace(/\./g, '').replace(',', '.')) || 0
        
        const matchesMinArea = !filters.minArea || areaPrivativa >= minAreaNum
        const matchesMaxArea = !filters.maxArea || areaPrivativa <= maxAreaNum
        
        const matchesPublished = filters.published === 'all' || 
            (filters.published === 'yes' && prop.is_published) || 
            (filters.published === 'no' && !prop.is_published)
            
        const matchesEmpreendimento = filters.empreendimento === 'all' || 
            (filters.empreendimento === 'sim' && prop.details?.is_empreendimento) || 
            (filters.empreendimento === 'nao' && !prop.details?.is_empreendimento)

        const matchesAdvFilters = 
            (!filters.has_dependencia_empregada || prop.details?.has_dependencia_empregada) &&
            (!filters.has_despensa || prop.details?.has_despensa) &&
            (!filters.has_escritorio || prop.details?.has_escritorio) &&
            (!filters.has_lavabo || prop.details?.has_lavabo) &&
            (!filters.has_sacada_sem_churrasqueira || prop.details?.has_sacada_sem_churrasqueira) &&
            (!filters.has_sacada_com_churrasqueira || prop.details?.has_sacada_com_churrasqueira) &&
            (!filters.has_vista_livre || prop.details?.has_vista_livre)

        return matchesSearch && matchesCity && matchesNeighborhood && matchesType &&
            matchesBedrooms && matchesBathrooms && matchesGarages &&
            matchesMinPrice && matchesMaxPrice && matchesStatus && matchesOrigin &&
            matchesSituacao && matchesSuites && matchesMinArea && matchesMaxArea &&
            matchesPublished && matchesEmpreendimento && matchesAdvFilters
    }).sort((a, b) => {
        // Ordenação por coluna tem prioridade
        if (columnSort.column) {
            const dir = columnSort.direction === 'asc' ? 1 : -1
            switch (columnSort.column) {
                case 'title': return dir * (a.title || '').localeCompare(b.title || '')
                case 'type': return dir * (translatePropertyType(a.type) || '').localeCompare(translatePropertyType(b.type) || '')
                case 'price': return dir * ((a.price || 0) - (b.price || 0))
            }
        }
        // Fallback para ordenação do filtro
        switch (filters.sortBy) {
            case 'price_high': return (b.price || 0) - (a.price || 0)
            case 'price_low': return (a.price || 0) - (b.price || 0)
            case 'az': return (a.title || '').localeCompare(b.title || '')
            case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            case 'newest':
            default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
    })

    const availableCities = Array.from(new Set(
        properties
            .map(p => p.details?.endereco?.cidade?.trim())
            .filter(Boolean)
    )).sort() as string[]

    const availableNeighborhoods = Array.from(new Set(
        properties
            .filter(p => !filters.city || p.details?.endereco?.cidade?.trim().toLowerCase() === filters.city.toLowerCase())
            .map(p => p.details?.endereco?.bairro?.trim())
            .filter(Boolean)
    )).sort() as string[]

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                title={filters.archived ? 'Imóveis Arquivados' : 'Imóveis'}
                subtitle={`${filteredProperties.length} imóveis encontrados`}
            >
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto">
                    {/* Linha 1 mobile: Busca + Toggle */}
                    <div className="flex items-center gap-2 w-full md:w-auto order-1 md:order-first">
                        <div className="flex-1 md:w-[320px] md:flex-none">
                            <FormInput
                                placeholder="Buscar imóveis..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClear={() => setSearchTerm('')}
                                icon={Search}
                                className="w-full md:w-[320px] h-[34px]"
                            />
                        </div>

                        <div className="h-[34px] flex items-center bg-card border border-muted-foreground/30 rounded-lg p-1 shadow-sm shrink-0">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`h-full px-3 flex items-center justify-center rounded-md transition-all ${viewMode === 'list' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}`}
                                title="Visualização em Lista"
                            >
                                <List size={14} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => setViewMode('gallery')}
                                className={`h-full px-3 flex items-center justify-center rounded-md transition-all ${viewMode === 'gallery' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}`}
                                title="Visualização em Galeria"
                            >
                                <LayoutGrid size={14} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`h-full px-3 flex items-center justify-center rounded-md transition-all ${viewMode === 'map' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}`}
                                title="Visualização em Mapa"
                            >
                                <Map size={14} strokeWidth={1} />
                            </button>
                        </div>
                    </div>

                    {/* Linha 2 mobile: Filtrar + Novo Imóvel */}
                    <div className="grid grid-flow-col auto-cols-max gap-2 md:gap-3 w-full md:w-max order-2">
                        <button
                            onClick={() => setIsFiltersOpen(true)}
                            className={`min-w-[130px] h-[34px] flex items-center justify-center gap-2 px-4 rounded-lg border transition-all text-sm font-bold uppercase tracking-wide whitespace-nowrap outline-none focus:ring-2 shadow-sm ${isFiltersOpen || Object.values(filters).some(v => v !== 'all' && v !== '' && v !== 'newest' && v !== false)
                                ? 'bg-secondary/10 text-secondary-foreground border-secondary hover:bg-secondary/20 focus:ring-secondary/50'
                                : 'bg-card border-muted-foreground/30 text-foreground hover:bg-muted/50 focus:ring-ring/50'
                                }`}
                        >
                            <Filter size={14} strokeWidth={1} />
                            Filtrar
                        </button>

                        <button
                            onClick={() => { setEditingProperty(null); setIsModalOpen(true); }}
                            className="min-w-[130px] h-[34px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 transition-all text-sm font-bold uppercase tracking-wide shadow-sm active:scale-[0.99] whitespace-nowrap"
                        >
                            <Plus size={14} strokeWidth={1} />
                            Novo Imóvel
                        </button>
                    </div>
                </div>
            </PageHeader>

            <hr className="hidden md:block border-border -mt-2" />

            {isRefreshing ? (
                <div className="flex h-[30vh] items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : viewMode === 'map' ? (
                <PropertiesMapView
                    properties={filteredProperties}
                    onPropertyClick={handleView}
                    className="animate-in fade-in duration-300"
                />
            ) : viewMode === 'gallery' ? (
                <PropertyGallery
                    properties={filteredProperties}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                    onSend={handleSend}
                    onApprove={handleApprove}
                    onReject={(prop) => setRejectingProperty(prop)}
                    onArchive={(id) => setConfirmArchiveId(id)}
                    onTogglePublish={handleTogglePublish}
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
                    onApprove={handleApprove}
                    onReject={(prop) => setRejectingProperty(prop)}
                    onArchive={(id) => setConfirmArchiveId(id)}
                    onTogglePublish={handleTogglePublish}
                    userRole={userRole}
                    userId={userId}
                    sortColumn={columnSort.column}
                    sortDirection={columnSort.direction}
                    onSort={handleColumnSort}
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
                onSelectCreationMethod={(method) => {
                    if (method === 'url' || method === 'text') {
                        setIsModalOpen(false)
                        setScrapingInitialMode(method === 'text' ? 'text' : 'url')
                        setIsScrapingOpen(true)
                    } else if (method === 'pdf') {
                        setIsModalOpen(false)
                        setIsImportPDFOpen(true)
                    }
                }}
            />

            <PropertyDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => {
                    setIsDetailsOpen(false)
                    setViewingProperty(null)
                }}
                prop={viewingProperty}
                onSend={handleSend}
                onEdit={handleEdit}
                userRole={userRole}
                userId={userId}
                hasAIAccess={hasAIAccess}
                hasMarketingAccess={hasMarketingAccess}
                tenantId={tenantId}
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
                setFilters={handleSetFilters}
                onExport={handleExportCSV}
                tenantId={tenantId}
                onImportSuccess={() => refreshProperties(filters.status)}
                userRole={userRole}
                availableCities={availableCities}
                availableNeighborhoods={availableNeighborhoods}
            />

            <PropertyImportPDFModal
                isOpen={isImportPDFOpen}
                onClose={() => setIsImportPDFOpen(false)}
                tenantId={tenantId}
                onImportSuccess={() => refreshProperties(filters.status)}
                properties={properties.map(p => ({ id: p.id, title: p.title }))}
            />

            <PropertyScrapingModal
                isOpen={isScrapingOpen}
                onClose={() => setIsScrapingOpen(false)}
                tenantId={tenantId}
                initialInputMode={scrapingInitialMode}
                onScrapingSuccess={(data) => {
                    setIsScrapingOpen(false)
                    setEditingProperty({
                        title: data.title || '',
                        description: data.description || '',
                        price: data.price || '',
                        type: data.type || 'apartment',
                        status: 'Disponível',
                        images: [],
                        videos: [],
                        documents: [],
                        is_published: false,
                        details: {
                            ...data.details,
                            description: data.description || '',
                            _source_images: data.source_images || [],
                        }
                    })
                    setIsModalOpen(true)
                    toast.success('Dados importados! Revise e salve o imóvel.')
                }}
            />
            {/* Modal de reprovação */}
            <PropertyRejectModal
                isOpen={!!rejectingProperty}
                propertyTitle={rejectingProperty?.title || ''}
                onConfirm={handleReject}
                onClose={() => setRejectingProperty(null)}
            />

            {/* Modal de confirmação de arquivamento */}
            {confirmArchiveId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-amber-500/10 rounded-xl">
                                <Archive size={22} className="text-amber-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Arquivar imóvel?</h3>
                                <p className="text-xs text-muted-foreground">O imóvel será removido da lista ativa.</p>
                            </div>
                        </div>
                        <p className="text-sm text-foreground mb-6">
                            Você pode visualizá-lo depois em <strong>Filtrar → Arquivados</strong>.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmArchiveId(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground font-bold text-sm hover:bg-muted/50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleArchive(confirmArchiveId)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors"
                            >
                                Arquivar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmação de exclusão */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-red-500/10 rounded-xl">
                                <Trash2 size={22} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Excluir imóvel?</h3>
                                <p className="text-xs text-muted-foreground">O imóvel será excluído permanentemente.</p>
                            </div>
                        </div>
                        <p className="text-sm text-foreground mb-6">
                            Esta ação não pode ser desfeita e removerá o imóvel definitivamente do sistema.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground font-bold text-sm hover:bg-muted/50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleConfirmDelete(confirmDeleteId)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
