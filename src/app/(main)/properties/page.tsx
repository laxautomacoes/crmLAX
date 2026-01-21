'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Home, MapPin, BedDouble, Bath, Square, Car, Trash2, Edit } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { getProfile } from '@/app/_actions/profile'
import { getAssets, createAsset, updateAsset, deleteAsset } from '@/app/_actions/assets'
import { toast } from 'sonner'

export default function PropertiesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [properties, setProperties] = useState<any[]>([])
    const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        type: 'house',
        status: 'Disponível',
        details: {
            area_util: '',
            quartos: '',
            suites: '',
            banheiros: '',
            vagas: '',
            endereco: {
                rua: '',
                numero: '',
                bairro: '',
                cidade: '',
                cep: ''
            }
        }
    })

    const fetchData = async () => {
        try {
            const { profile } = await getProfile()
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id)
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

    const handleSave = async () => {
        if (!formData.title || !tenantId) {
            toast.error('Título é obrigatório')
            return
        }

        const propertyData = {
            title: formData.title,
            price: formData.price ? parseFloat(formData.price.toString()) : 0,
            type: formData.type,
            status: formData.status,
            details: formData.details
        }

        let result
        if (editingPropertyId) {
            result = await updateAsset(tenantId, editingPropertyId, propertyData)
        } else {
            result = await createAsset(tenantId, propertyData)
        }

        if (result.success) {
            toast.success(editingPropertyId ? 'Imóvel atualizado!' : 'Imóvel cadastrado!')
            setIsModalOpen(false)
            resetForm()
            fetchData()
        } else {
            toast.error('Erro ao salvar imóvel: ' + result.error)
        }
    }

    const resetForm = () => {
        setEditingPropertyId(null)
        setFormData({
            title: '',
            price: '',
            type: 'house',
            status: 'Disponível',
            details: {
                area_util: '',
                quartos: '',
                suites: '',
                banheiros: '',
                vagas: '',
                endereco: {
                    rua: '',
                    numero: '',
                    bairro: '',
                    cidade: '',
                    cep: ''
                }
            }
        })
    }

    const handleEdit = (prop: any) => {
        setFormData({
            title: prop.title,
            price: prop.price?.toString() || '',
            type: prop.type,
            status: prop.status || 'Disponível',
            details: {
                area_util: prop.details?.area_util || '',
                quartos: prop.details?.quartos || '',
                suites: prop.details?.suites || '',
                banheiros: prop.details?.banheiros || '',
                vagas: prop.details?.vagas || '',
                endereco: prop.details?.endereco || { rua: '', numero: '', bairro: '', cidade: '', cep: '' }
            }
        })
        setEditingPropertyId(prop.id)
        setIsModalOpen(true)
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
                    <h1 className="text-2xl font-bold text-[#404F4F]">Imóveis</h1>
                    <p className="text-sm text-muted-foreground">{properties.length} imóveis cadastrados</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar imóveis..."
                            className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none w-full md:w-64"
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-all text-sm font-bold shadow-sm active:scale-[0.99]"
                    >
                        <Plus size={18} />
                        Novo Imóvel
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((prop) => (
                    <div key={prop.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                        <div className="aspect-video bg-muted relative">
                            {prop.images?.[0] ? (
                                <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-[#F9FAFB]">
                                    <Home size={40} strokeWidth={1} />
                                </div>
                            )}
                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(prop)}
                                    className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm text-[#404F4F] hover:bg-white"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(prop.id)}
                                    className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm text-red-500 hover:bg-white"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-bold uppercase tracking-wider text-[#404F4F]">
                                {prop.type}
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <h3 className="font-bold text-[#404F4F] text-lg leading-tight line-clamp-1">{prop.title}</h3>
                                <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                                    <MapPin size={12} />
                                    <span>{prop.details?.endereco?.bairro || 'Bairro ñ inf.'}, {prop.details?.endereco?.cidade || 'Cidade ñ inf.'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-3 border-y border-gray-50">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <BedDouble size={16} />
                                    <span className="text-xs font-semibold">{prop.details?.quartos || 0}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Bath size={16} />
                                    <span className="text-xs font-semibold">{prop.details?.banheiros || 0}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Car size={16} />
                                    <span className="text-xs font-semibold">{prop.details?.vagas || 0}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Square size={16} />
                                    <span className="text-xs font-semibold">{prop.details?.area_util || 0}m²</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-[#404F4F]">
                                    {prop.price ? `R$ ${Number(prop.price).toLocaleString('pt-BR')}` : 'Sob consulta'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${prop.status === 'Disponível' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {prop.status}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPropertyId ? "Editar Imóvel" : "Novo Imóvel"}
                size="lg"
            >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Título do Imóvel *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-[#F9FAFB] text-gray-900 focus:ring-2 focus:ring-secondary/50 outline-none"
                                placeholder="Ex: Apartamento 3 suítes Beira Mar"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Preço (R$)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-[#F9FAFB] text-gray-900 focus:ring-2 focus:ring-secondary/50 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Tipo</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-[#F9FAFB] text-gray-900 focus:ring-2 focus:ring-secondary/50 outline-none"
                            >
                                <option value="house">Casa</option>
                                <option value="apartment">Apartamento</option>
                                <option value="land">Terreno</option>
                                <option value="commercial">Comercial</option>
                                <option value="penthouse">Cobertura</option>
                                <option value="studio">Studio</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-4 col-span-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Área (m²)</label>
                                <input
                                    type="number"
                                    value={formData.details.area_util}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_util: e.target.value } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Quartos</label>
                                <input
                                    type="number"
                                    value={formData.details.quartos}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, quartos: e.target.value } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Banheiros</label>
                                <input
                                    type="number"
                                    value={formData.details.banheiros}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, banheiros: e.target.value } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Vagas</label>
                                <input
                                    type="number"
                                    value={formData.details.vagas}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas: e.target.value } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="col-span-2 pt-2">
                            <h4 className="text-xs font-bold text-[#404F4F] uppercase tracking-wider mb-3">Endereço</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Rua</label>
                                    <input
                                        type="text"
                                        value={formData.details.endereco.rua}
                                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, rua: e.target.value } } })}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Nº</label>
                                    <input
                                        type="text"
                                        value={formData.details.endereco.numero}
                                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, numero: e.target.value } } })}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Bairro</label>
                                    <input
                                        type="text"
                                        value={formData.details.endereco.bairro}
                                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, bairro: e.target.value } } })}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Cidade</label>
                                    <input
                                        type="text"
                                        value={formData.details.endereco.cidade}
                                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, cidade: e.target.value } } })}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">CEP</label>
                                    <input
                                        type="text"
                                        value={formData.details.endereco.cep}
                                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, cep: e.target.value } } })}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-3 border border-border text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 bg-secondary text-primary rounded-lg font-bold hover:opacity-90 transition-all shadow-sm"
                        >
                            {editingPropertyId ? "Salvar Alterações" : "Cadastrar Imóvel"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
