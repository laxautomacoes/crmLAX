'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from '@/components/shared/Modal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { getBrokers, getProfile } from '@/app/_actions/profile'
import { getTenantCustomAmenities, getTenantCustomFeatures, getTenantCustomCondo } from '@/app/_actions/tenant'
import type { CustomAmenity, CustomFeature, CustomCondo } from '@/app/_actions/tenant'
import { BasicInfoFields } from './PropertyModal/BasicInfoFields'
import { AreaFields } from './PropertyModal/AreaFields'
import { DormitoriosVagasFields } from './PropertyModal/RoomsFields'
import { TowersFields } from './PropertyModal/TowersFields'
import { PriceTableUploadField } from './PropertyModal/PriceTableUploadField'
import { AmenitiesFields } from './PropertyModal/AmenitiesFields'
import { FeaturesFields } from './PropertyModal/FeaturesFields'
import { CondominioFields } from './PropertyModal/CondominioFields'
import { DescriptionField } from './PropertyModal/DescriptionField'
import { MediaFields } from './PropertyModal/MediaFields'
import { AddressFields } from './PropertyModal/AddressFields'
import { OwnerFields } from './PropertyModal/OwnerFields'
import { Switch } from '@/components/ui/Switch'
import { Eraser, Globe, FileText, ClipboardPaste, PenLine, ChevronRight, RefreshCw, Plus } from 'lucide-react'
import { PropertyImportPDFModal } from './PropertyImportPDFModal'
import { PriceTableTab } from './PriceTableTab'
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency'
import { getPartners } from '@/app/_actions/partners'
import { PartnerQuickModal } from '@/components/dashboard/shared/PartnerQuickModal'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormInput } from '@/components/shared/forms/FormInput'
import { normalizePropertyAddress } from '@/lib/utils/normalize'

const DRAFT_KEY = 'crm_new_property_draft'

function getEmptyFormData() {
    return {
        title: '',
        description: '',
        price: '',
        commission_rate: '',
        type: 'apartment',
        status: 'Pending',
        created_by: null as string | null,
        owner_contact_id: null as string | null,
        images: [] as string[],
        main_image_url: '',
        videos: [] as string[],
        documents: [] as { name: string, url: string }[],
        is_published: false,
        partner_id: null as string | null,
        partner_commission_split: '',
        is_featured: false,
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
            nome_torre_bloco: '',
            has_elevadores: false,
            numero_elevadores: '',
            valor_condominio: '',
            valor_iptu: '',
            valor_proprietario: '',
            valor_comissao: '',
            obs_dormitorios: '',
            has_sacada_com_churrasqueira: false,
            has_sacada_sem_churrasqueira: false,
            has_lavabo: false,
            has_escritorio: false,
            has_dependencia_empregada: false,
            has_despensa: false,
            has_vista_livre: false,
            face_solar: '',
            zeladoria: false,
            vagas_visitantes: false,
            smart_locker: false,
            numero_torres: '',
            aptos_por_torre: '',
            idade_imovel: '',
            is_empreendimento: false,
            empreendimento: {
                construtora: '',
                previsao_entrega: '',
                torres: [] as { nome: string, tipologias: { tipo: string, dormitorios: string, suites: string, area_privativa: string, vagas: string, preco_a_partir: string, unidades_por_andar: string }[] }[],
                column_mapping: {
                    apto: '',
                    torre: '',
                    tipo: '',
                    vaga: '',
                    hb: '',
                    area_privativa: '',
                    valor_total: '',
                    ato: '',
                    mensais: '',
                    mensais_meses: '',
                    reforcos: '',
                    reforcos_periodo: '',
                    chaves: '',
                    saldo: '',
                    financiamento: '',
                    financiamento_meses: ''
                },
                tabela_modelo_url: '',
                tabela_modelo_nome: ''
            },
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
                instagram: '',
                linkedin: '',
                site: '',
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
                apto: '',
                bairro: '',
                cidade: '',
                estado: '',
                cep: '',
                latitude: null as number | null,
                longitude: null as number | null
            }
        }
    }
}

function isFormEmpty(data: ReturnType<typeof getEmptyFormData>): boolean {
    const empty = getEmptyFormData()
    return data.title === empty.title &&
        data.description === empty.description &&
        data.price === empty.price &&
        data.commission_rate === empty.commission_rate &&
        data.type === empty.type &&
        data.images.length === 0 &&
        data.videos.length === 0 &&
        data.documents.length === 0
}

interface Broker {
    id: string
    full_name: string
}

interface CurrentProfile {
    id: string
    full_name?: string | null
    role: string
    tenant_id: string
}

interface PropertyDocument {
    name: string
    url: string
}

export interface EmpreendimentoTipologia {
    tipo: string
    dormitorios: string
    suites: string
    area_privativa: string
    vagas: string
    preco_a_partir: string
    unidades_por_andar: string
}

export interface EmpreendimentoTorre {
    nome: string
    tipologias: EmpreendimentoTipologia[]
}

export interface ColumnMapping {
    apto: string
    torre: string
    tipo: string
    vaga: string
    hb: string
    area_privativa: string
    valor_total: string
    ato?: string
    mensais?: string
    mensais_meses?: string
    reforcos?: string
    reforcos_periodo?: string
    chaves?: string
    saldo?: string
    financiamento?: string
    financiamento_meses?: string
}

export interface EmpreendimentoData {
    construtora: string
    previsao_entrega: string
    torres: EmpreendimentoTorre[]
    column_mapping?: ColumnMapping
    tabela_modelo_url?: string
    tabela_modelo_nome?: string
}

interface EditingPropertyDetails {
    description?: string
    situacao?: string
    area_privativa?: string
    area_total?: string
    area_terreno?: string
    area_construida?: string
    area_util?: string
    dormitorios?: string
    quartos?: string
    suites?: string
    banheiros?: string
    vagas?: string
    vagas_numeracao?: string
    torre_bloco?: string
    nome_torre_bloco?: string
    has_elevadores?: boolean
    numero_elevadores?: string
    valor_condominio?: string
    valor_iptu?: string
    valor_proprietario?: string
    valor_comissao?: string
    obs_dormitorios?: string
    has_sacada_com_churrasqueira?: boolean
    has_sacada_sem_churrasqueira?: boolean
    has_lavabo?: boolean
    has_escritorio?: boolean
    has_dependencia_empregada?: boolean
    has_despensa?: boolean
    has_vista_livre?: boolean
    face_solar?: string
    zeladoria?: boolean
    vagas_visitantes?: boolean
    smart_locker?: boolean
    numero_torres?: string
    aptos_por_torre?: string
    idade_imovel?: string
    is_empreendimento?: boolean
    empreendimento?: EmpreendimentoData
    portaria_24h?: boolean
    portaria_virtual?: boolean
    piscina?: boolean
    piscina_aquecida?: boolean
    espaco_gourmet?: boolean
    salao_festas?: boolean
    academia?: boolean
    sala_jogos?: boolean
    sala_estudos_coworking?: boolean
    sala_cinema?: boolean
    playground?: boolean
    brinquedoteca?: boolean
    home_market?: boolean
    proprietario?: {
        nome: string
        responsavel: string
        telefone: string
        email: string
        cpf: string
        instagram?: string
        linkedin?: string
        site?: string
        estado_civil: string
        data_nascimento: string
        endereco_rua: string
        endereco_numero: string
        endereco_complemento: string
        endereco_bairro: string
        endereco_cidade: string
        endereco_estado: string
        endereco_cep: string
        is_construtora?: boolean
        regime_comunhao?: string
    }
    endereco?: {
        rua?: string
        numero?: string
        complemento?: string
        apto?: string
        bairro?: string
        cidade?: string
        estado?: string
        cep?: string
        latitude?: number | null
        longitude?: number | null
    }
    _source_images?: string[]
}

interface EditingProperty {
    id?: string
    title?: string
    description?: string
    price?: number | string
    commission_rate?: number | string | null
    type?: string
    status?: string
    created_by?: string | null
    owner_contact_id?: string | null
    images?: string[]
    videos?: string[]
    documents?: PropertyDocument[]
    is_published?: boolean
    is_featured?: boolean
    partner_id?: string | null
    partner_commission_split?: number | string | null
    main_image_url?: string | null
    details?: EditingPropertyDetails
}

export type CreationMethod = 'url' | 'pdf' | 'text' | 'manual' | null

function normalizeStatusValue(status: string | undefined | null): string {
    if (!status) return 'Pending'
    const s = status.toLowerCase()
    if (s === 'disponível' || s === 'disponivel') return 'Available'
    if (s === 'pendente') return 'Pending'
    // Outros valores como 'Vendido', 'Reservado', 'Suspenso', 'Em Proposta' permanecem iguais
    // se o banco de dados contiver os valores literais em português.
    return status
}

interface PropertyModalProps {
    isOpen: boolean
    onClose: () => void
    editingProperty: EditingProperty | null
    onSave: (propertyData: Record<string, unknown>) => Promise<void>
    userRole?: string
    onSelectCreationMethod?: (method: CreationMethod) => void
    initialCreationMethod?: CreationMethod
}

export function PropertyModal({ isOpen, onClose, editingProperty, onSave, userRole, onSelectCreationMethod, initialCreationMethod }: PropertyModalProps) {
    const isAdmin = userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'superadmin'
    const [brokers, setBrokers] = useState<Broker[]>([])
    const [tenantId, setTenantId] = useState<string>('')
    const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null)
    const [hasDraft, setHasDraft] = useState(false)
    const [partners, setPartners] = useState<any[]>([])
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    
    const handlePartnerCreated = (newPartner: any) => {
        setPartners(prev => [...prev, newPartner].sort((a, b) => a.name.localeCompare(b.name)))
        setFormData(prev => ({
            ...prev,
            partner_id: newPartner.id
        }))
    }

    const [formData, setFormData] = useState(getEmptyFormData())
    const draftTimerRef = useRef<NodeJS.Timeout | null>(null)
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const isSavingRef = useRef(false)
    const lastSavedDataRef = useRef<string | null>(null)
    const [creationMethod, setCreationMethod] = useState<CreationMethod>(initialCreationMethod ?? null)
    const isDraggingRef = useRef(false)
    const [isDragging, setIsDragging] = useState(false)
    const [importKey, setImportKey] = useState(0)
    const [hasPriceTables, setHasPriceTables] = useState(false)

    // Gera um snapshot dos dados relevantes para comparação
    const getFormSnapshot = useCallback((data: typeof formData) => {
        const { created_by, ...rest } = data
        return JSON.stringify(rest)
    }, [])

    // Quando o modal abre para novo imóvel, reseta o método de criação
    useEffect(() => {
        if (isOpen && !editingProperty) {
            setCreationMethod(initialCreationMethod ?? null)
        }
    }, [isOpen, editingProperty, initialCreationMethod])

    const handleSelectMethod = (method: CreationMethod) => {
        if (method === 'url' || method === 'pdf' || method === 'text') {
            // Delega para o PropertiesClient abrir o modal correto
            onSelectCreationMethod?.(method)
        } else {
            setCreationMethod('manual')
        }
    }

    // Salva rascunho no localStorage (debounced, apenas para novo imóvel)
    const saveDraft = useCallback((data: typeof formData) => {
        if (editingProperty) return
        if (isFormEmpty(data)) {
            localStorage.removeItem(DRAFT_KEY)
            setHasDraft(false)
            return
        }
        try {
            const draftData = { ...data, created_by: null, owner_contact_id: null }
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
            setHasDraft(true)
        } catch { /* quota exceeded - ignore */ }
    }, [editingProperty])

    // Auto-save rascunho com debounce de 1.5s
    useEffect(() => {
        if (!isOpen || editingProperty) return
        if (isDraggingRef.current) return
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
        draftTimerRef.current = setTimeout(() => saveDraft(formData), 1500)
        return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
    }, [formData, isOpen, editingProperty, saveDraft])

    const clearDraft = useCallback(() => {
        localStorage.removeItem(DRAFT_KEY)
        setHasDraft(false)
        const empty = getEmptyFormData()
        if (currentProfile && currentProfile.role !== 'admin' && currentProfile.role !== 'superadmin') {
            empty.created_by = currentProfile.id
        }
        setFormData(empty)
    }, [currentProfile])

    const [isUploading, setIsUploading] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [sourceImages, setSourceImages] = useState<string[]>([])
    const [isImportingImages, setIsImportingImages] = useState(false)
    const [customAmenities, setCustomAmenities] = useState<CustomAmenity[]>([])
    const [customFeatures, setCustomFeatures] = useState<CustomFeature[]>([])
    const [customCondo, setCustomCondo] = useState<CustomCondo[]>([])

    useEffect(() => {
        async function loadData() {
            const { profile } = await getProfile()
            if (profile) {
                setCurrentProfile(profile)
                setTenantId(profile.tenant_id)
                
                // Carregar parceiros
                const partnersRes = await getPartners(profile.tenant_id)
                if (partnersRes.success && partnersRes.data) {
                    setPartners(partnersRes.data)
                }

                // Carregar áreas customizadas do tenant
                const amenitiesRes = await getTenantCustomAmenities(profile.tenant_id)
                if (amenitiesRes.success) {
                    setCustomAmenities(amenitiesRes.data || [])
                }

                const featuresRes = await getTenantCustomFeatures(profile.tenant_id)
                if (featuresRes.success) {
                    setCustomFeatures(featuresRes.data || [])
                }

                const condoRes = await getTenantCustomCondo(profile.tenant_id)
                if (condoRes.success) {
                    setCustomCondo(condoRes.data || [])
                }

                const roleLower = profile.role?.toLowerCase();
                if (roleLower === 'admin' || roleLower === 'superadmin') {
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
                price: editingProperty.price ? formatCurrencyBRL(Math.round(Number(editingProperty.price) * 100).toString()) : '',
                commission_rate: editingProperty.commission_rate ? editingProperty.commission_rate.toString().replace('.', ',') : '',
                type: editingProperty.type || 'apartment',
                status: normalizeStatusValue(editingProperty.status),
                created_by: editingProperty.created_by || null,
                owner_contact_id: editingProperty.owner_contact_id || null,
                images: editingProperty.images || [],
                main_image_url: editingProperty.main_image_url || '',
                videos: editingProperty.videos || [],
                documents: editingProperty.documents || [],
                is_published: editingProperty.is_published || false,
                is_featured: editingProperty.is_featured || false,
                partner_id: editingProperty.partner_id || null,
                partner_commission_split: editingProperty.partner_commission_split ? editingProperty.partner_commission_split.toString() : '',
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
                    nome_torre_bloco: editingProperty.details?.nome_torre_bloco || '',
                    has_elevadores: editingProperty.details?.has_elevadores || false,
                    numero_elevadores: editingProperty.details?.numero_elevadores || '',
                    valor_condominio: editingProperty.details?.valor_condominio ? formatCurrencyBRL(Math.round(Number(editingProperty.details.valor_condominio) * 100).toString()) : '',
                    valor_iptu: editingProperty.details?.valor_iptu ? formatCurrencyBRL(Math.round(Number(editingProperty.details.valor_iptu) * 100).toString()) : '',
                    valor_proprietario: editingProperty.details?.valor_proprietario ? formatCurrencyBRL(Math.round(Number(editingProperty.details.valor_proprietario) * 100).toString()) : '',
                    valor_comissao: editingProperty.details?.valor_comissao ? formatCurrencyBRL(Math.round(Number(editingProperty.details.valor_comissao) * 100).toString()) : '',
                    obs_dormitorios: editingProperty.details?.obs_dormitorios || '',
                    has_sacada_com_churrasqueira: editingProperty.details?.has_sacada_com_churrasqueira || false,
                    has_sacada_sem_churrasqueira: editingProperty.details?.has_sacada_sem_churrasqueira || false,
                    has_lavabo: editingProperty.details?.has_lavabo || false,
                    has_escritorio: editingProperty.details?.has_escritorio || false,
                    has_dependencia_empregada: editingProperty.details?.has_dependencia_empregada || false,
                    has_despensa: editingProperty.details?.has_despensa || false,
                    has_vista_livre: editingProperty.details?.has_vista_livre || false,
                    face_solar: editingProperty.details?.face_solar || '',
                    zeladoria: editingProperty.details?.zeladoria || false,
                    vagas_visitantes: editingProperty.details?.vagas_visitantes || false,
                    smart_locker: editingProperty.details?.smart_locker || false,
                    numero_torres: editingProperty.details?.numero_torres || '',
                    aptos_por_torre: editingProperty.details?.aptos_por_torre || '',
                    is_empreendimento: editingProperty.details?.is_empreendimento || false,
                    idade_imovel: editingProperty.details?.idade_imovel || '',
                    empreendimento: {
                        construtora: editingProperty.details?.empreendimento?.construtora || '',
                        previsao_entrega: editingProperty.details?.empreendimento?.previsao_entrega || '',
                        torres: editingProperty.details?.empreendimento?.torres || [],
                        column_mapping: {
                            apto: '',
                            torre: '',
                            tipo: '',
                            vaga: '',
                            hb: '',
                            area_privativa: '',
                            valor_total: '',
                            ato: '',
                            mensais: '',
                            mensais_meses: '',
                            reforcos: '',
                            reforcos_periodo: '',
                            chaves: '',
                            saldo: '',
                            financiamento: '',
                            financiamento_meses: '',
                            ...(editingProperty.details?.empreendimento?.column_mapping || {})
                        },
                        tabela_modelo_url: editingProperty.details?.empreendimento?.tabela_modelo_url || '',
                        tabela_modelo_nome: editingProperty.details?.empreendimento?.tabela_modelo_nome || ''
                    },
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
                    proprietario: {
                        nome: editingProperty.details?.proprietario?.nome || '',
                        responsavel: editingProperty.details?.proprietario?.responsavel || '',
                        telefone: editingProperty.details?.proprietario?.telefone || '',
                        email: editingProperty.details?.proprietario?.email || '',
                        cpf: editingProperty.details?.proprietario?.cpf || '',
                        instagram: editingProperty.details?.proprietario?.instagram || '',
                        linkedin: editingProperty.details?.proprietario?.linkedin || '',
                        site: editingProperty.details?.proprietario?.site || '',
                        estado_civil: editingProperty.details?.proprietario?.estado_civil || '',
                        data_nascimento: editingProperty.details?.proprietario?.data_nascimento || '',
                        endereco_rua: editingProperty.details?.proprietario?.endereco_rua || '',
                        endereco_numero: editingProperty.details?.proprietario?.endereco_numero || '',
                        endereco_complemento: editingProperty.details?.proprietario?.endereco_complemento || '',
                        endereco_bairro: editingProperty.details?.proprietario?.endereco_bairro || '',
                        endereco_cidade: editingProperty.details?.proprietario?.endereco_cidade || '',
                        endereco_estado: editingProperty.details?.proprietario?.endereco_estado || '',
                        endereco_cep: editingProperty.details?.proprietario?.endereco_cep || '',
                        is_construtora: editingProperty.details?.proprietario?.is_construtora || false,
                        regime_comunhao: editingProperty.details?.proprietario?.regime_comunhao || ''
                    },
                    endereco: {
                        rua: editingProperty.details?.endereco?.rua || '',
                        numero: editingProperty.details?.endereco?.numero || '',
                        complemento: editingProperty.details?.endereco?.complemento || '',
                        apto: editingProperty.details?.endereco?.apto || '',
                        bairro: editingProperty.details?.endereco?.bairro || '',
                        cidade: editingProperty.details?.endereco?.cidade || '',
                        estado: editingProperty.details?.endereco?.estado || '',
                        cep: editingProperty.details?.endereco?.cep || '',
                        latitude: editingProperty.details?.endereco?.latitude || null,
                        longitude: editingProperty.details?.endereco?.longitude || null
                    }
                }
            })
            // Marca como snapshot salvo para evitar autosave desnecessário
            setFormData((newData: any) => {
                lastSavedDataRef.current = getFormSnapshot(newData)
                return newData
            })
            // Load source images from scraping
            setSourceImages((editingProperty.details as any)?._source_images || [])
        } else {
            // Novo imóvel: tenta restaurar rascunho salvo
            setSourceImages([])
            try {
                const saved = localStorage.getItem(DRAFT_KEY)
                if (saved) {
                    const parsed = JSON.parse(saved)
                    setFormData(parsed)
                    setHasDraft(true)
                } else {
                    setFormData(getEmptyFormData())
                    setHasDraft(false)
                }
            } catch {
                setFormData(getEmptyFormData())
                setHasDraft(false)
            }
        }
    }, [editingProperty, isOpen])

    const handleFilesUpload = async (files: FileList, type: 'images' | 'videos' | 'documents') => {
        if (files.length === 0) return

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
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Por favor, tente novamente.'
            console.error(`Error uploading ${type}:`, error)
            alert(`Erro ao carregar ${type}: ${errorMessage}`)
        } finally {
            setIsUploading(null)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos' | 'documents') => {
        const files = e.target.files
        if (!files || files.length === 0) return
        await handleFilesUpload(files, type)
        e.target.value = ''
    }

    const removeFile = (index: number, type: 'images' | 'videos' | 'documents') => {
        if (type === 'documents') {
            const newFiles = [...formData.documents]
            newFiles.splice(index, 1)
            setFormData({ ...formData, documents: newFiles })
            return
        }

        if (type === 'images') {
            const removedUrl = formData.images[index]
            const newFiles = [...formData.images]
            newFiles.splice(index, 1)
            setFormData(prev => ({ 
                ...prev, 
                images: newFiles,
                main_image_url: prev.main_image_url === removedUrl ? '' : prev.main_image_url
            }))
            return
        }

        const newFiles = [...formData.videos]
        newFiles.splice(index, 1)
        setFormData({ ...formData, videos: newFiles })
    }

    const handleImportImages = async (selectedUrls: string[]) => {
        if (selectedUrls.length === 0) return
        setIsImportingImages(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-images`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ urls: selectedUrls, tenant_id: tenantId })
            })
            const result = await response.json()
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erro ao importar imagens.')
            }
            if (result.uploaded.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, ...result.uploaded]
                }))
                // Remove imported URLs from sourceImages
                setSourceImages(prev => prev.filter(url => !selectedUrls.includes(url)))
                toast.success(`${result.uploaded.length} imagem(ns) importada(s)!`)
            }
            if (result.failed_count > 0) {
                toast.warning(`${result.failed_count} imagem(ns) não puderam ser baixadas.`)
            }
        } catch (error: any) {
            console.error('Error importing images:', error)
            toast.error(error.message || 'Erro ao importar imagens.')
        } finally {
            setIsImportingImages(false)
        }
    }

    // Prepara os dados do formulário para salvar
    const preparePropertyData = useCallback(() => {
        const parsedPrice = parseCurrencyBRL(formData.price || '0')
        let finalTitle = formData.title?.trim() || ''
        const { created_by: _omit, ...restData } = formData
        // Normaliza details: garante que dormitorios → quartos (fonte única)
        const { dormitorios: _dorm, ...cleanDetails } = formData.details as any
        
        return {
            ...restData,
            title: finalTitle,
            price: isNaN(parsedPrice) ? 0 : parsedPrice,
            description: formData.description || '',
            commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate.replace(',', '.')) : null,
            partner_id: formData.partner_id || null,
            partner_commission_split: formData.partner_commission_split ? Number(formData.partner_commission_split) : null,
            details: {
                ...cleanDetails,
                endereco: cleanDetails.endereco ? normalizePropertyAddress(cleanDetails.endereco) : {},
                quartos: formData.details.quartos || _dorm || '',
                valor_condominio: parseCurrencyBRL(formData.details.valor_condominio || '0'),
                valor_iptu: parseCurrencyBRL(formData.details.valor_iptu || '0'),
                valor_proprietario: formData.details.valor_proprietario || '',
                valor_comissao: formData.details.valor_comissao || '',
                description: formData.description || ''
            }
        }
    }, [formData])

    const handleSaveLocal = async () => {
        if (isSaving) return
        
        // Cancela autosave pendente ao salvar manualmente
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
            autoSaveTimerRef.current = null
        }
        
        try {
            setIsSaving(true)
            isSavingRef.current = true

            // Validação: tipo unidade exige campo Apartamento preenchido
            const tiposComApto = ['apartment', 'penthouse', 'studio']
            const tipo = (formData.type || '').toLowerCase()
            const apto = formData.details?.endereco?.apto?.trim()
            if (tiposComApto.includes(tipo) && !apto && !formData.details.is_empreendimento) {
                toast.error('Informe o número do Apartamento antes de salvar.', {
                    description: 'Imóveis do tipo Apartamento, Cobertura ou Studio precisam do número do apto para evitar títulos duplicados.',
                })
                setIsSaving(false)
                isSavingRef.current = false
                return
            }

            const propertyData = preparePropertyData()
            await onSave(propertyData)
            // Atualiza snapshot após salvar com sucesso
            lastSavedDataRef.current = getFormSnapshot(formData)
            // Limpa rascunho após salvar com sucesso
            localStorage.removeItem(DRAFT_KEY)
            setHasDraft(false)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
            console.error('Error in handleSaveLocal:', error)
            alert('Erro ao processar dados: ' + errorMessage)
        } finally {
            setIsSaving(false)
            isSavingRef.current = false
        }
    }



    // Determinar se deve mostrar a tela de seleção de método
    const showMethodSelection = !editingProperty && creationMethod === null

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { setCreationMethod(null); onClose() }}
            title={
                <div className="flex items-center gap-4">
                    <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                        {editingProperty ? "Editar Imóvel" : "Novo Imóvel"}
                    </h3>
                </div>
            }
            extraHeaderContent={
                showMethodSelection ? undefined : (
                <div className="flex items-center gap-3">

                    {!editingProperty && hasDraft && (
                        <button
                            onClick={clearDraft}
                            title="Limpar formulário"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all text-sm font-medium"
                        >
                            <Eraser size={15} />
                            <span className="hidden sm:inline">Limpar</span>
                        </button>
                    )}
                    <button
                        onClick={handleSaveLocal}
                        disabled={isSaving || !!isUploading}
                        className={`px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold shadow-sm active:scale-[0.99] transition-all text-sm whitespace-nowrap min-w-[160px] text-center
                            ${(isSaving || isUploading) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                    >
                        {isSaving ? "Salvando..." : (editingProperty ? "Salvar Alterações" : "Cadastrar Imóvel")}
                    </button>
                </div>
                )
            }
            size={showMethodSelection ? "lg" : "2xl"}
        >
            {showMethodSelection ? (
                <div className="py-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 ml-1">
                        Como deseja cadastrar?
                    </p>
                    <div className="flex flex-col gap-2">
                        {/* Preenchimento Manual */}
                        <button
                            onClick={() => handleSelectMethod('manual')}
                            className="group flex items-center gap-4 bg-foreground/5 hover:bg-foreground/10 border border-border/40 hover:border-emerald-500/30 rounded-xl px-4 py-4 transition-all text-left"
                        >
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors shrink-0">
                                <PenLine size={20} className="text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground">Preenchimento Manual</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                    Preencha todos os campos do imóvel
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0" />
                        </button>

                        {/* Importar URL */}
                        <button
                            onClick={() => handleSelectMethod('url')}
                            className="group flex items-center gap-4 bg-foreground/5 hover:bg-foreground/10 border border-border/40 hover:border-blue-500/30 rounded-xl px-4 py-4 transition-all text-left"
                        >
                            <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors shrink-0">
                                <Globe size={20} className="text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-foreground">Importar URL</p>
                                    <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-wider rounded-md">IA</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                    Cole o link de qualquer site de imóvel
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0" />
                        </button>

                        {/* Importar PDF */}
                        <button
                            onClick={() => handleSelectMethod('pdf')}
                            className="group flex items-center gap-4 bg-foreground/5 hover:bg-foreground/10 border border-border/40 hover:border-red-500/30 rounded-xl px-4 py-4 transition-all text-left"
                        >
                            <div className="p-2.5 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors shrink-0">
                                <FileText size={20} className="text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-foreground">Importar PDF</p>
                                    <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-wider rounded-md">IA</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                    Tabela de preços, book digital ou ficha técnica
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0" />
                        </button>

                        {/* Colar Texto */}
                        <button
                            onClick={() => handleSelectMethod('text')}
                            className="group flex items-center gap-4 bg-foreground/5 hover:bg-foreground/10 border border-border/40 hover:border-amber-500/30 rounded-xl px-4 py-4 transition-all text-left"
                        >
                            <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors shrink-0">
                                <ClipboardPaste size={20} className="text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-foreground">Colar Texto</p>
                                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-wider rounded-md">IA</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                    Cole texto copiado e a IA estrutura os dados
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0" />
                        </button>
                    </div>
                </div>
            ) : (
            <div className="space-y-6 px-1">
                <div className="flex flex-col gap-8">
                    <BasicInfoFields 
                        formData={formData} 
                        setFormData={setFormData} 
                        userRole={userRole}
                        brokers={brokers}
                        currentProfile={currentProfile}
                        detailsChildren={
                            formData.details.is_empreendimento && (
                                <div className="space-y-8 mt-8 border-t border-border/60 pt-6">
                                    <TowersFields formData={formData} setFormData={setFormData} />
                                    <div className="border-t border-border/60" />
                                    <PriceTableUploadField 
                                        formData={formData} 
                                        setFormData={setFormData}
                                        tenantId={tenantId}
                                        propertyId={(editingProperty as any)?.id}
                                    />

                                    {/* ── Atualizar Tabela de Preços ── */}
                                    {(editingProperty as any)?.id && (
                                        <div className="space-y-4 pt-6 border-t border-border/60">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                                                        Atualizar Tabela
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground leading-snug mt-1">
                                                        <span className="block">Importe uma nova tabela de preços mensal para este empreendimento.</span>
                                                        <span className="block">A IA usará o mapeamento e a tabela-modelo acima como referência.</span>
                                                    </p>
                                                </div>

                                                {hasPriceTables && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsImportOpen(true)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-secondary text-secondary-foreground hover:opacity-90 transition-all active:scale-[0.98] shadow-sm shrink-0"
                                                    >
                                                        <Plus size={14} />
                                                        Atualizar
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-6">
                                                <PriceTableTab 
                                                    key={importKey}
                                                    propertyId={(editingProperty as any).id} 
                                                    propertyTitle={(editingProperty as any).title} 
                                                    tenantId={tenantId} 
                                                    userRole={userRole} 
                                                    onHasTablesChange={setHasPriceTables}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    />
                    {!formData.details.is_empreendimento && (
                        <>
                            <div className="border-t border-border/60" />
                            <DormitoriosVagasFields formData={formData} setFormData={setFormData} isEmpreendimento={formData.details.is_empreendimento} />
                            <div className="border-t border-border/60" />
                            <FeaturesFields 
                                formData={formData} 
                                setFormData={setFormData}
                                tenantId={tenantId}
                                isAdmin={isAdmin}
                                customFeatures={customFeatures}
                                onCustomFeaturesChange={setCustomFeatures}
                            />
                            <div className="border-t border-border/60" />
                            <AreaFields formData={formData} setFormData={setFormData} />
                        </>
                    )}

                    <div className="border-t border-border/60" />
                    <CondominioFields
                        formData={formData} 
                        setFormData={setFormData}
                        tenantId={tenantId}
                        isAdmin={isAdmin}
                        customCondo={customCondo}
                        onCustomCondoChange={setCustomCondo}
                    />

                    <div className="border-t border-border/60" />
                    <AmenitiesFields 
                        formData={formData} 
                        setFormData={setFormData}
                        tenantId={tenantId}
                        isAdmin={isAdmin}
                        customAmenities={customAmenities}
                        onCustomAmenitiesChange={setCustomAmenities}
                    />
                    <div className="border-t border-border/60" />
                    <DescriptionField formData={formData} setFormData={setFormData} />
                    <div className="border-t border-border/60" />
                    <MediaFields 
                        formData={formData} 
                        isUploading={isUploading} 
                        handleFileUpload={handleFileUpload} 
                        handleFilesUpload={handleFilesUpload}
                        removeFile={removeFile}
                        sourceImages={sourceImages}
                        isImportingImages={isImportingImages}
                        onImportImages={handleImportImages}
                        onRemoveSourceImage={(index) => setSourceImages(prev => prev.filter((_, i) => i !== index))}
                        onReorderImages={(newImages) => setFormData(prev => ({ ...prev, images: newImages }))}
                        onReorderVideos={(newVideos) => setFormData(prev => ({ ...prev, videos: newVideos }))}
                        onReorderDocuments={(newDocuments) => setFormData(prev => ({ ...prev, documents: newDocuments }))}
                        onDragStart={() => { isDraggingRef.current = true; setIsDragging(true) }}
                        onDragEnd={() => { isDraggingRef.current = false; setIsDragging(false) }}
                        propertyTitle={formData.title}
                        onRemoveMultipleImages={(urls) => setFormData(prev => ({ 
                            ...prev, 
                            images: prev.images.filter((img: string) => !urls.includes(img)),
                            main_image_url: urls.includes(prev.main_image_url) ? '' : prev.main_image_url
                        }))}
                        mainImageUrl={formData.main_image_url}
                        onSetMainImage={(url) => setFormData(prev => ({ 
                            ...prev, 
                            main_image_url: url === prev.main_image_url ? '' : url 
                        }))}
                    />
                    <div className="border-t border-border/60" />
                    <AddressFields formData={formData} setFormData={setFormData} />
                    <div className="border-t border-border/60" />
                    <OwnerFields formData={formData} setFormData={setFormData} tenantId={tenantId} />
                    
                    {/* Seção: Captação Externa / Parceria */}
                    <div className="border-t border-border/60" />
                    <div className="space-y-4 pt-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Captação Externa / Parceria</h3>
                            <button
                                type="button"
                                onClick={() => setIsPartnerModalOpen(true)}
                                className="text-xs font-bold text-accent-icon hover:underline cursor-pointer"
                            >
                                + Novo Parceiro
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FormSelect
                                    label="Parceiro Comercial (Corretor/Imobiliária detentora)"
                                    value={formData.partner_id || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, partner_id: e.target.value || null }))}
                                    options={[
                                        { value: '', label: 'Imóvel Próprio / Exclusivo' },
                                        ...partners.map(p => ({
                                            value: p.id,
                                            label: p.company ? `${p.name} (${p.company})` : p.name
                                        }))
                                    ]}
                                />
                            </div>
                            <div>
                                <FormInput
                                    label="Comissão do Parceiro (Split %)"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.partner_commission_split}
                                    onChange={(e) => setFormData(prev => ({ ...prev, partner_commission_split: e.target.value }))}
                                    placeholder="Ex: 50"
                                    disabled={!formData.partner_id}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {isPartnerModalOpen && (
                <PartnerQuickModal
                    isOpen={isPartnerModalOpen}
                    onClose={() => setIsPartnerModalOpen(false)}
                    onSuccess={handlePartnerCreated}
                    tenantId={tenantId}
                />
            )}

            {isImportOpen && (editingProperty as any)?.id && (
                <PropertyImportPDFModal
                    isOpen={isImportOpen}
                    onClose={() => setIsImportOpen(false)}
                    tenantId={tenantId}
                    onImportSuccess={() => {
                        setIsImportOpen(false)
                        setImportKey(prev => prev + 1)
                    }}
                    properties={[{ id: (editingProperty as any).id, title: (editingProperty as any).title || '' }]}
                    initialPropertyId={(editingProperty as any).id}
                />
            )}
        </Modal>
    )
}
