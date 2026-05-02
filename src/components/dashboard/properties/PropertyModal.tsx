'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { createClient } from '@/lib/supabase/client'
import { getBrokers, getProfile } from '@/app/_actions/profile'
import { BasicInfoFields } from './PropertyModal/BasicInfoFields'
import { AreaFields } from './PropertyModal/AreaFields'
import { RoomsFields } from './PropertyModal/RoomsFields'
import { AmenitiesFields } from './PropertyModal/AmenitiesFields'
import { DescriptionField } from './PropertyModal/DescriptionField'
import { MediaFields } from './PropertyModal/MediaFields'
import { AddressFields } from './PropertyModal/AddressFields'
import { OwnerFields } from './PropertyModal/OwnerFields'
import { Switch } from '@/components/ui/Switch'

interface PropertyModalProps {
    isOpen: boolean
    onClose: () => void
    editingProperty: any | null
    onSave: (propertyData: any) => Promise<void>
    userRole?: string
}

export function PropertyModal({ isOpen, onClose, editingProperty, onSave, userRole }: PropertyModalProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'
    const [brokers, setBrokers] = useState<any[]>([])
    const [tenantId, setTenantId] = useState<string>('')
    const [currentProfile, setCurrentProfile] = useState<any>(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        type: 'apartment',
        status: 'Pending',
        created_by: null as string | null,
        owner_contact_id: null as string | null,
        images: [] as string[],
        videos: [] as string[],
        documents: [] as { name: string, url: string }[],
        is_published: false,
        details: {
            situacao: 'lançamento',
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
            home_market: false,
            proprietario: {
                nome: '',
                responsavel: '',
                telefone: '',
                email: '',
                cpf: '',
                estado_civil: '',
                data_nascimento: '',
                endereco_rua: '',
                endereco_numero: '',
                endereco_complemento: '',
                endereco_bairro: '',
                endereco_cidade: '',
                endereco_estado: '',
                endereco_cep: '',
                is_construtora: false,
                regime_comunhao: ''
            },
            endereco: {
                rua: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                estado: '',
                cep: '',
                latitude: null as number | null,
                longitude: null as number | null
            }
        }
    })

    const [isUploading, setIsUploading] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        async function loadData() {
            const { profile } = await getProfile()
            if (profile) {
                setCurrentProfile(profile)
                setTenantId(profile.tenant_id)
                if (profile.role === 'admin' || profile.role === 'superadmin') {
                    const res = await getBrokers(profile.tenant_id)
                    if (res.success) {
                        setBrokers(res.data || [])
                    }
                } else if (!editingProperty) {
                    // Se for corretor criando novo imóvel, já define o created_by
                    setFormData(prev => ({ ...prev, created_by: profile.id }))
                }
            }
        }
        if (isOpen) {
            loadData()
        }
    }, [isOpen])

    useEffect(() => {
        if (editingProperty && isOpen) {
            console.log('Loading editingProperty:', editingProperty)
            setFormData({
                title: editingProperty.title || '',
                description: editingProperty.description || editingProperty.details?.description || '',
                price: editingProperty.price?.toString() || '',
                type: editingProperty.type || 'apartment',
                status: editingProperty.status || 'Pending',
                created_by: editingProperty.created_by || null,
                owner_contact_id: editingProperty.owner_contact_id || null,
                images: editingProperty.images || [],
                videos: editingProperty.videos || [],
                documents: editingProperty.documents || [],
                is_published: editingProperty.is_published || false,
                details: {
                    situacao: editingProperty.details?.situacao || 'lançamento',
                    area_privativa: editingProperty.details?.area_privativa || '',
                    area_total: editingProperty.details?.area_total || '',
                    area_terreno: editingProperty.details?.area_terreno || '',
                    area_construida: editingProperty.details?.area_construida || editingProperty.details?.area_util || '',
                    quartos: editingProperty.details?.dormitorios || editingProperty.details?.quartos || '',
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
                    home_market: editingProperty.details?.home_market || false,
                    proprietario: editingProperty.details?.proprietario || {
                        nome: '',
                        responsavel: '',
                        telefone: '',
                        email: '',
                        cpf: '',
                        estado_civil: '',
                        data_nascimento: '',
                        endereco_rua: '',
                        endereco_numero: '',
                        endereco_complemento: '',
                        endereco_bairro: '',
                        endereco_cidade: '',
                        endereco_estado: '',
                        endereco_cep: ''
                    },
                    endereco: {
                        rua: editingProperty.details?.endereco?.rua || '',
                        numero: editingProperty.details?.endereco?.numero || '',
                        complemento: editingProperty.details?.endereco?.complemento || '',
                        bairro: editingProperty.details?.endereco?.bairro || '',
                        cidade: editingProperty.details?.endereco?.cidade || '',
                        estado: editingProperty.details?.endereco?.estado || '',
                        cep: editingProperty.details?.endereco?.cep || '',
                        latitude: editingProperty.details?.endereco?.latitude || null,
                        longitude: editingProperty.details?.endereco?.longitude || null
                    }
                }
            })
        } else {
            setFormData({
                title: '',
                description: '',
                price: '',
                type: 'apartment',
                status: 'Pending',
                created_by: null,
                owner_contact_id: null,
                images: [],
                videos: [],
                documents: [],
                is_published: false,
                details: {
                    situacao: 'lançamento',
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
                    home_market: false,
                    proprietario: {
                        nome: '',
                        responsavel: '',
                        telefone: '',
                        email: '',
                        cpf: '',
                        estado_civil: '',
                        data_nascimento: '',
                        endereco_rua: '',
                        endereco_numero: '',
                        endereco_complemento: '',
                        endereco_bairro: '',
                        endereco_cidade: '',
                        endereco_estado: '',
                        endereco_cep: '',
                        is_construtora: false,
                        regime_comunhao: ''
                    },
                    endereco: {
                        rua: '',
                        numero: '',
                        complemento: '',
                        bairro: '',
                        cidade: '',
                        estado: '',
                        cep: '',
                        latitude: null,
                        longitude: null
                    }
                }
            })
        }
    }, [editingProperty, isOpen])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos' | 'documents') => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsUploading(type)
        const supabase = createClient()
        
        try {
            const uploadedFiles: (string | { name: string; url: string })[] = []

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const maxSize = type === 'images' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
                if (file.size > maxSize) {
                    alert(`O arquivo ${file.name} é muito grande. O limite para ${type} é ${maxSize / (1024 * 1024)}MB.`)
                    continue
                }

                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
                const filePath = `${type}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('property-properties')
                    .upload(filePath, file, { cacheControl: '3600' })

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('property-properties')
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
            e.target.value = ''
        }
    }

    const removeFile = (index: number, type: 'images' | 'videos' | 'documents') => {
        const newFiles = [...(formData[type] as any)]
        newFiles.splice(index, 1)
        setFormData({ ...formData, [type]: newFiles })
    }

    const handleSaveLocal = async () => {
        if (isSaving) return
        
        try {
            setIsSaving(true)
            const cleanPriceStr = (formData.price || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.')
            const parsedPrice = parseFloat(cleanPriceStr)
            
            // Filtrar campos para evitar enviar dados sujos
            const { created_by, ...restData } = formData

            const propertyData = {
                ...restData,
                price: isNaN(parsedPrice) ? 0 : parsedPrice,
                description: formData.description || '',
                details: {
                    ...formData.details,
                    description: formData.description || ''
                }
            }
            await onSave(propertyData)
        } catch (error: any) {
            console.error('Error in handleSaveLocal:', error)
            alert('Erro ao processar dados: ' + (error.message || 'Erro desconhecido'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingProperty ? "Editar Imóvel" : "Novo Imóvel"}
            extraHeaderContent={
                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <Switch 
                            checked={formData.is_published}
                            onChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                            label="SITE"
                        />
                    )}
                    <button
                        onClick={handleSaveLocal}
                        disabled={isSaving || !!isUploading}
                        className={`px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold shadow-sm active:scale-[0.99] transition-all text-sm whitespace-nowrap
                            ${(isSaving || isUploading) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                    >
                        {isSaving ? "Salvando..." : (editingProperty ? "Salvar Alterações" : "Cadastrar Imóvel")}
                    </button>
                </div>
            }
            size="xl"
        >
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1 no-scrollbar">
                <div className="flex flex-col gap-8">
                    <BasicInfoFields 
                        formData={formData} 
                        setFormData={setFormData} 
                        userRole={userRole}
                        brokers={brokers}
                        currentProfile={currentProfile}
                    />
                    <div className="border-t border-border/60" />
                    <AreaFields formData={formData} setFormData={setFormData} />
                    <div className="border-t border-border/60" />
                    <RoomsFields formData={formData} setFormData={setFormData} />
                    <div className="border-t border-border/60" />
                    <AmenitiesFields formData={formData} setFormData={setFormData} />
                    <div className="border-t border-border/60" />
                    <DescriptionField formData={formData} setFormData={setFormData} />
                    <div className="border-t border-border/60" />
                    <AddressFields formData={formData} setFormData={setFormData} />
                    <div className="border-t border-border/60" />
                    <MediaFields 
                        formData={formData} 
                        isUploading={isUploading} 
                        handleFileUpload={handleFileUpload} 
                        removeFile={removeFile} 
                    />
                    <div className="border-t border-border/60" />
                    <OwnerFields formData={formData} setFormData={setFormData} tenantId={tenantId} />
                </div>
            </div>
        </Modal>
    )
}
