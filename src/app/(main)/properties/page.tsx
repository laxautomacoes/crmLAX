'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, LayoutGrid, List } from 'lucide-react'
import { getProfile } from '@/app/_actions/profile'
import { getAssets, createAsset, updateAsset, deleteAsset } from '@/app/_actions/assets'
import { initStorageBuckets } from '@/app/_actions/storage'
import { getTenantByUserId } from '@/app/_actions/tenant'
import { toast } from 'sonner'
import { PropertyGallery } from '@/components/dashboard/properties/PropertyGallery'
import { PropertyList } from '@/components/dashboard/properties/PropertyList'
import { PropertyModal } from '@/components/dashboard/properties/PropertyModal'
import { PropertyDetailsModal } from '@/components/dashboard/properties/PropertyDetailsModal'
import { SendToLeadModal } from '@/components/dashboard/properties/SendToLeadModal'

export default function PropertiesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [isSendModalOpen, setIsSendModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery')
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [tenantSlug, setTenantSlug] = useState<string>('')
    const [properties, setProperties] = useState<any[]>([])
    const [editingProperty, setEditingProperty] = useState<any | null>(null)
    const [viewingProperty, setViewingProperty] = useState<any | null>(null)
    const [sendingProperty, setSendingProperty] = useState<any | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const fetchData = async () => {
        try {
            // Tentar inicializar buckets se necessário
            await initStorageBuckets()
            
            const { profile } = await getProfile()
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id)
                
                // Buscar slug do tenant
                const tenant = await getTenantByUserId(profile.id)
                if (tenant) {
                    setTenantSlug(tenant.slug)
                }

                const result = await getAssets(profile.tenant_id)
                if (result.success) {
                    setProperties(result.data || [])
                }
            }
        } catch (error) {
            console.error('Erro ao carregar imóveis:', error)
            toast.error('Erro ao carregar lista de imóveis')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

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
        if (!confirm('Excluir este imóvel?')) return
        const result = await deleteAsset(id)
        if (result.success) {
            toast.success('Imóvel excluído')
            fetchData()
        } else {
            toast.error('Erro ao excluir')
        }
    }

    const filteredProperties = properties.filter(prop =>
        prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prop.details?.endereco?.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prop.details?.endereco?.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Imóveis</h1>
                    <p className="text-sm text-muted-foreground">{filteredProperties.length} imóveis encontrados</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('gallery')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'gallery' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            title="Visualização em Galeria"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            title="Visualização em Lista"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar imóveis..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none w-full md:w-64"
                        />
                    </div>
                    <button
                        onClick={() => { setEditingProperty(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-all text-sm font-bold shadow-sm active:scale-[0.99]"
                    >
                        <Plus size={18} />
                        Novo Imóvel
                    </button>
                </div>
            </div>

            {viewMode === 'gallery' ? (
                <PropertyGallery
                    properties={filteredProperties}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                    onSend={handleSend}
                />
            ) : (
                <PropertyList
                    properties={filteredProperties}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                    onSend={handleSend}
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
            />

            <PropertyDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => {
                    setIsDetailsOpen(false)
                    setViewingProperty(null)
                }}
                prop={viewingProperty}
                onSend={handleSend}
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
        </div>
    )
}
