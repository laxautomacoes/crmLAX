'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { createClient } from '@/lib/supabase/client'
import { BasicInfoFields } from './PropertyModal/BasicInfoFields'
import { AreaFields } from './PropertyModal/AreaFields'
import { RoomsFields } from './PropertyModal/RoomsFields'
import { AmenitiesFields } from './PropertyModal/AmenitiesFields'
import { MediaFields } from './PropertyModal/MediaFields'
import { AddressFields } from './PropertyModal/AddressFields'
import { OwnerFields } from './PropertyModal/OwnerFields'

interface PropertyModalProps {
    isOpen: boolean
    onClose: () => void
    editingProperty: any | null
    onSave: (propertyData: any) => Promise<void>
    userRole?: string
}

export function PropertyModal({ isOpen, onClose, editingProperty, onSave, userRole }: PropertyModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        type: 'house',
        status: 'Disponível',
        approval_status: 'pending',
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
                endereco_cep: ''
            },
            endereco: {
                rua: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                estado: '',
                cep: ''
            }
        }
    })

    const [isUploading, setIsUploading] = useState<string | null>(null)

    useEffect(() => {
        if (editingProperty) {
            setFormData({
                title: editingProperty.title || '',
                price: editingProperty.price?.toString() || '',
                type: editingProperty.type || 'house',
                status: editingProperty.status || 'Disponível',
                approval_status: editingProperty.approval_status || 'pending',
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
                    endereco: editingProperty.details?.endereco || { rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' }
                }
            })
        } else {
            setFormData({
                title: '',
                price: '',
                type: 'house',
                status: 'Disponível',
                approval_status: 'pending',
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
                        endereco_cep: ''
                    },
                    endereco: {
                        rua: '',
                        numero: '',
                        complemento: '',
                        bairro: '',
                        cidade: '',
                        estado: '',
                        cep: ''
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
                    .from('property-assets')
                    .upload(filePath, file, { cacheControl: '3600' })

                if (uploadError) throw uploadError

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
                <div className="flex flex-col gap-6">
                    <BasicInfoFields formData={formData} setFormData={setFormData} userRole={userRole} />
                    <AreaFields formData={formData} setFormData={setFormData} />
                    <RoomsFields formData={formData} setFormData={setFormData} />
                    <AmenitiesFields formData={formData} setFormData={setFormData} />
                    <AddressFields formData={formData} setFormData={setFormData} />
                    <MediaFields 
                        formData={formData} 
                        isUploading={isUploading} 
                        handleFileUpload={handleFileUpload} 
                        removeFile={removeFile} 
                    />
                    <div className="border-t border-border" />
                    <OwnerFields formData={formData} setFormData={setFormData} />
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
