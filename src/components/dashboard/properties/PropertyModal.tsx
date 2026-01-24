'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Upload, X, FileText, Image as ImageIcon, Film, Loader2 } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { createClient } from '@/lib/supabase/client'

interface PropertyModalProps {
    isOpen: boolean
    onClose: () => void
    editingProperty: any | null
    onSave: (propertyData: any) => Promise<void>
}

export function PropertyModal({ isOpen, onClose, editingProperty, onSave }: PropertyModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        type: 'house',
        status: 'Disponível',
        images: [] as string[],
        videos: [] as string[],
        documents: [] as { name: string, url: string }[],
        details: {
            situacao: 'revenda',
            area_privativa: '',
            area_total: '',
            area_terreno: '',
            area_construida: '',
            quartos: '',
            suites: '',
            banheiros: '',
            vagas: '',
            vagas_numeracao: '',
            torre_bloco: '',
            valor_condominio: '',
            valor_iptu: '',
            portaria_24h: false,
            portaria_virtual: false,
            piscina: false,
            piscina_aquecida: false,
            espaco_gourmet: false,
            salao_festas: false,
            academia: false,
            sala_jogos: false,
            sala_estudos_coworking: false,
            sala_cinema: false,
            playground: false,
            brinquedoteca: false,
            proprietario: {
                nome: '',
                telefone: '',
                email: '',
                cpf: '',
                estado_civil: '',
                data_nascimento: ''
            },
            endereco: {
                rua: '',
                numero: '',
                bairro: '',
                cidade: '',
                cep: ''
            }
        }
    })

    useEffect(() => {
        if (editingProperty) {
            setFormData({
                title: editingProperty.title || '',
                price: editingProperty.price?.toString() || '',
                type: editingProperty.type || 'house',
                status: editingProperty.status || 'Disponível',
                images: editingProperty.images || [],
                videos: editingProperty.videos || [],
                documents: editingProperty.documents || [],
                details: {
                    situacao: editingProperty.details?.situacao || 'revenda',
                    area_privativa: editingProperty.details?.area_privativa || '',
                    area_total: editingProperty.details?.area_total || '',
                    area_terreno: editingProperty.details?.area_terreno || '',
                    area_construida: editingProperty.details?.area_construida || editingProperty.details?.area_util || '',
                    quartos: editingProperty.details?.quartos || '',
                    suites: editingProperty.details?.suites || '',
                    banheiros: editingProperty.details?.banheiros || '',
                    vagas: editingProperty.details?.vagas || '',
                    vagas_numeracao: editingProperty.details?.vagas_numeracao || '',
                    torre_bloco: editingProperty.details?.torre_bloco || '',
                    valor_condominio: editingProperty.details?.valor_condominio || '',
                    valor_iptu: editingProperty.details?.valor_iptu || '',
                    portaria_24h: editingProperty.details?.portaria_24h || false,
                    portaria_virtual: editingProperty.details?.portaria_virtual || false,
                    piscina: editingProperty.details?.piscina || false,
                    piscina_aquecida: editingProperty.details?.piscina_aquecida || false,
                    espaco_gourmet: editingProperty.details?.espaco_gourmet || false,
                    salao_festas: editingProperty.details?.salao_festas || false,
                    academia: editingProperty.details?.academia || false,
                    sala_jogos: editingProperty.details?.sala_jogos || false,
                    sala_estudos_coworking: editingProperty.details?.sala_estudos_coworking || false,
                    sala_cinema: editingProperty.details?.sala_cinema || false,
                    playground: editingProperty.details?.playground || false,
                    brinquedoteca: editingProperty.details?.brinquedoteca || false,
                    proprietario: editingProperty.details?.proprietario || {
                        nome: '',
                        telefone: '',
                        email: '',
                        cpf: '',
                        estado_civil: '',
                        data_nascimento: ''
                    },
                    endereco: editingProperty.details?.endereco || { rua: '', numero: '', bairro: '', cidade: '', cep: '' }
                }
            })
        } else {
            setFormData({
                title: '',
                price: '',
                type: 'house',
                status: 'Disponível',
                images: [],
                videos: [],
                documents: [],
                details: {
                    situacao: 'revenda',
                    area_privativa: '',
                    area_total: '',
                    area_terreno: '',
                    area_construida: '',
                    quartos: '',
                    suites: '',
                    banheiros: '',
                    vagas: '',
                    vagas_numeracao: '',
                    torre_bloco: '',
                    valor_condominio: '',
                    valor_iptu: '',
                    portaria_24h: false,
                    portaria_virtual: false,
                    piscina: false,
                    piscina_aquecida: false,
                    espaco_gourmet: false,
                    salao_festas: false,
                    academia: false,
                    sala_jogos: false,
                    sala_estudos_coworking: false,
                    sala_cinema: false,
                    playground: false,
                    brinquedoteca: false,
                    proprietario: {
                        nome: '',
                        telefone: '',
                        email: '',
                        cpf: '',
                        estado_civil: '',
                        data_nascimento: ''
                    },
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
    }, [editingProperty, isOpen])

    const [isUploading, setIsUploading] = useState<string | null>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos' | 'documents') => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsUploading(type)
        const supabase = createClient()
        
        try {
            const currentFiles = [...(formData[type] as any)]
            const uploadedFiles: (string | { name: string; url: string })[] = []

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                
                // Validação de tamanho (exemplo: 10MB para imagens, 50MB para vídeos/docs)
                const maxSize = type === 'images' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
                if (file.size > maxSize) {
                    alert(`O arquivo ${file.name} é muito grande. O limite para ${type} é ${maxSize / (1024 * 1024)}MB.`)
                    continue
                }

                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
                const filePath = `${type}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('property-assets')
                    .upload(filePath, file, {
                        cacheControl: '3600'
                    })

                if (uploadError) {
                    console.error('Erro no upload do Supabase:', uploadError)
                    throw uploadError
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('property-assets')
                    .getPublicUrl(filePath)

                if (type === 'documents') {
                    uploadedFiles.push({ name: file.name, url: publicUrl })
                } else {
                    uploadedFiles.push(publicUrl)
                }
            }

            setFormData(prev => ({ 
                ...prev, 
                [type]: [...prev[type], ...uploadedFiles] 
            }))
        } catch (error: any) {
            console.error(`Error uploading ${type}:`, error)
            alert(`Erro ao carregar ${type}: ${error.message || 'Por favor, tente novamente.'}`)
        } finally {
            setIsUploading(null)
            // Limpar o input para permitir selecionar o mesmo arquivo novamente
            e.target.value = ''
        }
    }

    const removeFile = (index: number, type: 'images' | 'videos' | 'documents') => {
        const newFiles = [...(formData[type] as any)]
        newFiles.splice(index, 1)
        setFormData({ ...formData, [type]: newFiles })
    }

    const handleSaveLocal = async () => {
        const propertyData = {
            ...formData,
            price: formData.price ? parseFloat(formData.price.toString()) : 0
        }
        await onSave(propertyData)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingProperty ? "Editar Imóvel" : "Novo Imóvel"}
            size="lg"
        >
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-muted-foreground ml-1 mb-1">Imóvel | Empreendimento *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                            placeholder="Ex: Apartamento 3 suítes Beira Mar"
                        />
                    </div>

                    <div className="grid grid-cols-4 col-span-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-muted-foreground ml-1 mb-1">Preço (R$)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground ml-1 mb-1">Tipo</label>
                            <div className="relative">
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-secondary/50 outline-none transition-all appearance-none pr-10"
                                >
                                    <option value="house">Casa</option>
                                    <option value="apartment">Apartamento</option>
                                    <option value="land">Terreno</option>
                                    <option value="commercial">Comercial</option>
                                    <option value="penthouse">Cobertura</option>
                                    <option value="studio">Studio</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground ml-1 mb-1">Situação</label>
                            <div className="relative">
                                <select
                                    value={formData.details.situacao}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, situacao: e.target.value } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-secondary/50 outline-none transition-all appearance-none pr-10"
                                >
                                    <option value="lançamento">Lançamento</option>
                                    <option value="em construção">Em construção</option>
                                    <option value="novo">Novo</option>
                                    <option value="revenda">Revenda</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground ml-1 mb-1">Status</label>
                            <div className="relative">
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-secondary/50 outline-none transition-all appearance-none pr-10"
                                >
                                    <option value="Disponível">Disponível</option>
                                    <option value="Vendido">Vendido</option>
                                    <option value="Reservado">Reservado</option>
                                    <option value="Suspenso">Suspenso</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 col-span-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Área Privativa (m²)</label>
                            <input
                                type="number"
                                value={formData.details.area_privativa}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_privativa: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Área Total (m²)</label>
                            <input
                                type="number"
                                value={formData.details.area_total}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_total: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Área Terreno (m²)</label>
                            <input
                                type="number"
                                value={formData.details.area_terreno}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_terreno: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Área Construída (m²)</label>
                            <input
                                type="number"
                                value={formData.details.area_construida}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_construida: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Quartos</label>
                            <input
                                type="number"
                                value={formData.details.quartos}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, quartos: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Banheiros</label>
                            <input
                                type="number"
                                value={formData.details.banheiros}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, banheiros: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Vagas</label>
                            <input
                                type="number"
                                value={formData.details.vagas}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Numeração Vagas</label>
                            <input
                                type="text"
                                value={formData.details.vagas_numeracao}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas_numeracao: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                placeholder="Ex: 12A, 12B"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Torre/Bloco</label>
                            <input
                                type="text"
                                value={formData.details.torre_bloco}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, torre_bloco: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Condomínio (R$)</label>
                            <input
                                type="number"
                                value={formData.details.valor_condominio}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, valor_condominio: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">IPTU (R$)</label>
                            <input
                                type="number"
                                value={formData.details.valor_iptu}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, valor_iptu: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="col-span-2 pt-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Área comum | lazer</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                                { id: 'portaria_24h', label: 'Portaria 24h' },
                                { id: 'portaria_virtual', label: 'Portaria Virtual' },
                                { id: 'piscina', label: 'Piscina' },
                                { id: 'piscina_aquecida', label: 'Piscina Aquecida' },
                                { id: 'espaco_gourmet', label: 'Espaço Gourmet' },
                                { id: 'salao_festas', label: 'Salão de Festas' },
                                { id: 'academia', label: 'Academia' },
                                { id: 'sala_jogos', label: 'Sala de Jogos' },
                                { id: 'sala_estudos_coworking', label: 'Estudos/Coworking' },
                                { id: 'sala_cinema', label: 'Sala de Cinema' },
                                { id: 'playground', label: 'Playground' },
                                { id: 'brinquedoteca', label: 'Brinquedoteca' }
                            ].map((amenity) => (
                                <label key={amenity.id} className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={(formData.details as any)[amenity.id]}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            details: { ...formData.details, [amenity.id]: e.target.checked }
                                        })}
                                        className="w-4 h-4 rounded border-border bg-card text-secondary focus:ring-secondary/50 transition-all"
                                    />
                                    <span className="text-xs font-medium text-foreground group-hover:text-secondary transition-colors">
                                        {amenity.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-2 pt-4 border-t border-border">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            Mídia e Arquivos
                        </h4>
                        
                        <div className="space-y-6">
                            {/* Imagens */}
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                    <ImageIcon size={16} className="text-secondary" /> Imagens
                                </label>
                                <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-3">
                                    {formData.images.map((url, index) => (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                                            <img src={url} alt={`Property ${index}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index, 'images')}
                                                className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-secondary/50 hover:bg-secondary/5 flex flex-col items-center justify-center cursor-pointer transition-all">
                                        {isUploading === 'images' ? (
                                            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                                        ) : (
                                            <>
                                                <Upload size={20} className="text-muted-foreground mb-1" />
                                                <span className="text-[10px] font-bold text-muted-foreground">Upload</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, 'images')}
                                            disabled={!!isUploading}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Vídeos */}
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                    <Film size={16} className="text-secondary" /> Vídeos
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                                    {formData.videos.map((url, index) => (
                                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-border group bg-black/5 flex items-center justify-center">
                                            <Film size={24} className="text-muted-foreground" />
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index, 'videos')}
                                                className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-secondary/50 hover:bg-secondary/5 flex flex-col items-center justify-center cursor-pointer transition-all">
                                        {isUploading === 'videos' ? (
                                            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                                        ) : (
                                            <>
                                                <Upload size={20} className="text-muted-foreground mb-1" />
                                                <span className="text-[10px] font-bold text-muted-foreground">Upload Vídeo</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            multiple
                                            accept="video/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, 'videos')}
                                            disabled={!!isUploading}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Documentos */}
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                    <FileText size={16} className="text-secondary" /> Documentos
                                </label>
                                <div className="space-y-2">
                                    {formData.documents.map((doc, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors group">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText size={16} className="text-muted-foreground shrink-0" />
                                                <span className="text-xs font-medium truncate">{doc.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index, 'documents')}
                                                className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-border hover:border-secondary/50 hover:bg-secondary/5 cursor-pointer transition-all">
                                        {isUploading === 'documents' ? (
                                            <Loader2 className="w-5 h-5 text-secondary animate-spin" />
                                        ) : (
                                            <>
                                                <Upload size={18} className="text-muted-foreground" />
                                                <span className="text-xs font-bold text-muted-foreground">Upload Documentos (PDF, etc)</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, 'documents')}
                                            disabled={!!isUploading}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 pt-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Endereço</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Rua</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.rua}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, rua: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Nº</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.numero}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, numero: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Bairro</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.bairro}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, bairro: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Cidade</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.cidade}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, cidade: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">CEP</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.cep}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, cep: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 pt-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Proprietário</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={formData.details.proprietario.nome}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, nome: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Telefone/WhatsApp</label>
                                <input
                                    type="text"
                                    value={formData.details.proprietario.telefone}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, telefone: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.details.proprietario.email}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, email: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">CPF</label>
                                <input
                                    type="text"
                                    value={formData.details.proprietario.cpf}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, cpf: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Estado Civil</label>
                                <div className="relative">
                                    <select
                                        value={formData.details.proprietario.estado_civil}
                                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, estado_civil: e.target.value } } })}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all appearance-none pr-10"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="solteiro">Solteiro(a)</option>
                                        <option value="casado">Casado(a)</option>
                                        <option value="divorciado">Divorciado(a)</option>
                                        <option value="viuvo">Viúvo(a)</option>
                                        <option value="uniao_estavel">União Estável</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={formData.details.proprietario.data_nascimento}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, data_nascimento: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-card text-foreground border border-border rounded-lg font-bold hover:bg-muted transition-all active:scale-[0.99]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveLocal}
                        className="flex-1 py-3 bg-yellow-400 text-black rounded-lg font-bold hover:bg-yellow-500 shadow-sm active:scale-[0.99] transition-all"
                    >
                        {editingProperty ? "Salvar Alterações" : "Cadastrar Imóvel"}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
