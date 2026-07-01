'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { Search, Mail, MessageCircle, Loader2, User, CheckCircle2, ChevronDown, ChevronUp, Image as ImageIcon, Video, FileText, MapPin, Info, Home, Download, Building2, UserCheck, DollarSign, Waves } from 'lucide-react'
import { getSimpleLeads, createLead, syncContactAvatar } from '@/app/_actions/leads'
import { sendPropertyEmail, logInteraction } from '@/app/_actions/messaging'
import { getProfile } from '@/app/_actions/profile'
import { toast } from 'sonner'
import { formatPhone } from '@/lib/utils/phone'
import { getPropertyUrl } from '@/lib/utils/url'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, ArrowLeft, Check, FileDown, ArrowUpDown } from 'lucide-react'
import type { Lead } from '@/components/dashboard/leads/PipelineBoard'
import { getPropertyUnits, type PropertyUnit } from '@/app/_actions/property-units'

interface PropertyDocument {
    name?: string
    url: string
}

interface PropertyDetailsAddress {
    bairro?: string
    cidade?: string
    rua?: string
    numero?: string
    estado?: string
}

interface PropertyDetails {
    dormitorios?: number
    quartos?: number
    suites?: number
    area_privativa?: number
    endereco?: PropertyDetailsAddress
    [key: string]: any
}

interface PropertyData {
    id: string
    slug: string
    type: string
    title: string
    price: number
    description?: string
    images?: string[]
    videos?: string[]
    documents?: PropertyDocument[]
    details?: PropertyDetails
    created_by_profile?: {
        id: string
        full_name: string
        whatsapp_number?: string
        avatar_url?: string | null
    }
}

interface BrokerProfile {
    id: string
    full_name: string
    whatsapp_number?: string
    avatar_url?: string | null
}

interface TenantRecord {
    name?: string
    slug?: string
    custom_domain?: string | null
    custom_domain_verified?: boolean
    branding?: {
        logo_full?: string
        logo_icon?: string
        logo_height?: number
    }
}

interface SendToLeadModalProps {
    isOpen: boolean
    onClose: () => void
    property: PropertyData
    tenantId: string
    tenantSlug: string
}

function getPropertyTypeName(type: string): string {
    switch (type?.toLowerCase()) {
        case 'apartment':
            return 'Apto';
        case 'house':
            return 'Casa';
        case 'land':
            return 'Terreno';
        case 'commercial':
            return 'Loja';
        default:
            return 'Unidade';
    }
}

export function SendToLeadModal({ isOpen, onClose, property, tenantId, tenantSlug }: SendToLeadModalProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [leads, setLeads] = useState<Lead[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [sending, setSending] = useState(false)
    const [currentBroker, setCurrentBroker] = useState<BrokerProfile | null>(null)
    const [tenant, setTenant] = useState<TenantRecord | null>(null)
    const [isManualMode, setIsManualMode] = useState(false)
    const [manualLead, setManualLead] = useState({ name: '', email: '', phone: '' })
    const [isDownloading, setIsDownloading] = useState(false)
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

    // States para Unidades do Empreendimento
    const [units, setUnits] = useState<PropertyUnit[]>([])
    const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(null)
    const [isLoadingUnits, setIsLoadingUnits] = useState(false)
    const [unitFilter, setUnitFilter] = useState('')
    const [sortColumn, setSortColumn] = useState<'apto' | 'tipo' | 'valor' | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    const handleSort = (column: 'apto' | 'tipo' | 'valor') => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const handleDownloadImages = async () => {
        setIsDownloading(true)
        try {
            for (let i = 0; i < config.selectedImages.length; i++) {
                const url = config.selectedImages[i]
                const response = await fetch(url)
                const blob = await response.blob()

                const contentType = response.headers.get('content-type')
                let ext = 'jpg'
                if (contentType?.includes('image/png')) ext = 'png'
                else if (contentType?.includes('image/webp')) ext = 'webp'

                const blobUrl = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = blobUrl

                const cleanTitle = property.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                link.download = `${cleanTitle}-foto-${i + 1}.${ext}`

                document.body.appendChild(link)
                link.click()

                document.body.removeChild(link)
                URL.revokeObjectURL(blobUrl)

                await new Promise(resolve => setTimeout(resolve, 150))
            }
            toast.success("Download das fotos iniciado!")
        } catch (error) {
            console.error("Erro ao baixar imagens:", error)
            toast.error("Erro ao realizar o download das fotos.")
        } finally {
            setIsDownloading(false)
        }
    }

    // Configuration State
    const [config, setConfig] = useState<{
        title: boolean;
        price: boolean;
        showCondo: boolean;
        showIptu: boolean;
        description: 'full' | 'none';
        location: 'exact' | 'approximate' | 'none';
        showBedrooms: boolean;
        showSuites: boolean;
        showAreaPrivativa: boolean;
        showAreaTotal: boolean;
        showVagas: boolean;
        showHobbyBox: boolean;
        showType: boolean;
        showAmenities: boolean;
        showSacada: boolean;
        showEscritorio: boolean;
        showDependencia: boolean;
        showObservations: boolean;
        showResponsavel: boolean;
        showConstrutora: boolean;
        selectedImages: string[];
        selectedVideos: string[];
        selectedDocs: PropertyDocument[];
    }>({
        title: false,
        price: false,
        showCondo: false,
        showIptu: false,
        description: 'none',
        location: 'none',
        showBedrooms: false,
        showSuites: false,
        showAreaPrivativa: false,
        showAreaTotal: false,
        showVagas: false,
        showHobbyBox: false,
        showType: false,
        showAmenities: false,
        showSacada: false,
        showEscritorio: false,
        showDependencia: false,
        showObservations: false,
        showResponsavel: false,
        showConstrutora: false,
        selectedImages: [],
        selectedVideos: [],
        selectedDocs: []
    })

    // Reset config when modal opens or property changes
    useEffect(() => {
        if (isOpen && property) {
            setConfig(prev => ({
                ...prev,
                selectedImages: [],
                selectedVideos: [],
                selectedDocs: []
            }))
            setSelectedUnit(null)
            setUnitFilter('')
            setSortColumn(null)
            setSortDirection('asc')
        }
    }, [isOpen, property])

    const [expandedSections, setExpandedSections] = useState({
        basic: false,
        units: false,
        location: false,
        valores: false,
        images: false,
        videos: false,
        docs: false,
        details: false,
        amenities: false,
        descricao: false,
        responsavel: false,
        construtora: false
    })

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const fetchTenant = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('tenants')
            .select('name, slug, custom_domain, custom_domain_verified, branding')
            .eq('id', tenantId)
            .single()

        if (data) setTenant(data as any)
    }

    const fetchCurrentBroker = async () => {
        const { profile } = await getProfile()
        if (profile) {
            setCurrentBroker(profile)
        }
    }

    const fetchLeads = async () => {
        setIsLoading(true)
        const result = await getSimpleLeads(tenantId)
        if (result.success && result.data) {
            setLeads(result.data as any)
        }
        setIsLoading(false)
    }

    const handleSelectLead = async (lead: any) => {
        setSelectedLead(lead)

        // Sincroniza o avatar apenas para o lead selecionado se ele não tiver foto salva
        if (!lead.avatar_url && lead.contact_id) {
            try {
                const res = await syncContactAvatar(lead.contact_id, tenantId)
                if (res.success && res.avatar_url) {
                    setLeads(prev => prev.map(l =>
                        l.id === lead.id ? { ...l, avatar_url: res.avatar_url } : l
                    ))
                    setSelectedLead(prev =>
                        prev && prev.id === lead.id
                            ? { ...prev, avatar_url: res.avatar_url }
                            : prev
                    )
                }
            } catch {
                // silencioso
            }
        }
    }

    const fetchUnits = async () => {
        if (!property?.id) return
        setIsLoadingUnits(true)
        try {
            const result = await getPropertyUnits(property.id)
            if (result.success && result.data) {
                setUnits(result.data)
            }
        } catch (error) {
            console.error("Erro ao buscar unidades:", error)
        } finally {
            setIsLoadingUnits(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            void fetchLeads()
            void fetchCurrentBroker()
            void fetchTenant()
            void fetchUnits()
        }
    }, [isOpen])

    const filteredUnits = useMemo(() => {
        let result = [...units]
        if (unitFilter) {
            result = result.filter(unit =>
                unit.unit_number.toLowerCase().includes(unitFilter.toLowerCase()) ||
                (unit.block_tower && unit.block_tower.toLowerCase().includes(unitFilter.toLowerCase()))
            )
        }

        if (sortColumn) {
            result.sort((a, b) => {
                let valA: any = ''
                let valB: any = ''

                if (sortColumn === 'apto') {
                    const numA = parseInt(a.unit_number.replace(/\D/g, ''), 10)
                    const numB = parseInt(b.unit_number.replace(/\D/g, ''), 10)
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return sortDirection === 'asc' ? numA - numB : numB - numA
                    }
                    valA = a.unit_number.toLowerCase()
                    valB = b.unit_number.toLowerCase()
                } else if (sortColumn === 'tipo') {
                    valA = (a.extra_data?.secao || '').toLowerCase()
                    valB = (b.extra_data?.secao || '').toLowerCase()
                } else if (sortColumn === 'valor') {
                    valA = Number(a.valor_total || 0)
                    valB = Number(b.valor_total || 0)
                    return sortDirection === 'asc' ? valA - valB : valB - valA
                }

                if (valA < valB) return sortDirection === 'asc' ? -1 : 1
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1
                return 0
            })
        }

        return result
    }, [units, unitFilter, sortColumn, sortDirection])

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm)
    )

    const handleSendEmail = async (lead: Lead | null) => {
        let currentLead = lead

        if (isManualMode && !selectedLead) {
            if (!manualLead.name || !manualLead.phone) {
                toast.error('Nome e Telefone são obrigatórios para novos leads')
                return
            }
            setSending(true)
            const result = await createLead(tenantId, { ...manualLead, property_id: property.id })
            if (result.success && result.data) {
                currentLead = result.data
                setSelectedLead(result.data)
                setIsManualMode(false)
            } else {
                toast.error('Erro ao criar lead: ' + result.error)
                setSending(false)
                return
            }
        }

        if (!currentLead || !currentLead.email) {
            toast.error('Este lead não possui um e-mail válido')
            setSending(false)
            return
        }

        setSending(true)
        const result = await sendPropertyEmail(currentLead.id, currentLead.email, property, {
            ...config,
            images: config.selectedImages,
            videos: config.selectedVideos,
            documents: config.selectedDocs,
            selectedUnit: selectedUnit
        })

        if (result.success) {
            toast.success('E-mail enviado com sucesso!')
            onClose()
        } else {
            toast.error('Erro ao enviar e-mail: ' + result.error)
        }
        setSending(false)
    }

    const handleSendWhatsApp = async (lead: Lead | null) => {
        let currentLead = lead

        if (isManualMode && !selectedLead) {
            if (!manualLead.name || !manualLead.phone) {
                toast.error('Nome e Telefone são obrigatórios para novos leads')
                return
            }
            setSending(true)
            const result = await createLead(tenantId, manualLead)
            if (result.success && result.data) {
                currentLead = result.data
                setSelectedLead(result.data)
                setIsManualMode(false)
            } else {
                toast.error('Erro ao criar lead: ' + result.error)
                setSending(false)
                return
            }
        }

        if (!currentLead || !currentLead.phone) {
            toast.error('Este lead não possui um WhatsApp válido')
            setSending(false)
            return
        }

        setSending(true)
        const cleanPhone = currentLead.phone.replace(/\D/g, '')

        // Build config query params
        const queryParams = new URLSearchParams()
        if (currentBroker) queryParams.set('b', currentBroker.id)
        if (selectedUnit) queryParams.set('u', selectedUnit.id)

        // Add display toggles (only if false, to keep URL short, but let's be explicit for now)
        if (!config.title) queryParams.set('ct', '0')
        if (!config.price) queryParams.set('cp', '0')
        if (!config.showCondo) queryParams.set('cco', '0')
        if (!config.showIptu) queryParams.set('cip', '0')
        if (config.description === 'none') queryParams.set('cd', 'n')
        if (config.location !== 'approximate') queryParams.set('cl', config.location === 'exact' ? 'e' : 'n')
        if (!config.showBedrooms) queryParams.set('cbr', '0')
        if (!config.showSuites) queryParams.set('cst', '0')
        if (!config.showAreaPrivativa) queryParams.set('carp', '0')
        if (!config.showAreaTotal) queryParams.set('cart', '0')
        if (!config.showVagas) queryParams.set('cvag', '0')
        if (!config.showHobbyBox) queryParams.set('chob', '0')
        if (!config.showType) queryParams.set('cty', '0')
        if (!config.showAmenities) queryParams.set('cam', '0')
        if (!config.showSacada) queryParams.set('csa', '0')
        if (!config.showEscritorio) queryParams.set('ces', '0')
        if (!config.showDependencia) queryParams.set('cde', '0')
        if (!config.showObservations) queryParams.set('cob', '0')

        // Add media selections as indices
        const imageIndices = config.selectedImages
            .map(url => (property.images || []).indexOf(url))
            .filter(idx => idx !== -1)
        if (imageIndices.length < (property.images || []).length) {
            queryParams.set('ci', imageIndices.join(','))
        }

        const videoIndices = config.selectedVideos
            .map(url => (property.videos || []).indexOf(url))
            .filter(idx => idx !== -1)
        if (videoIndices.length < (property.videos || []).length) {
            queryParams.set('cv', videoIndices.join(','))
        }

        const docIndices = config.selectedDocs
            .map((doc) => (property.documents || []).findIndex((d) => d.url === doc.url))
            .filter(idx => idx !== -1)
        if (docIndices.length < (property.documents || []).length) {
            queryParams.set('cdoc', docIndices.join(','))
        }

        const queryString = queryParams.toString()
        const propertyUrl = getPropertyUrl(tenant ? { slug: tenant.slug || tenantSlug, custom_domain: tenant.custom_domain, custom_domain_verified: tenant.custom_domain_verified } : { slug: tenantSlug }, property.id, property.slug, property.type) + (queryString ? `?${queryString}` : '')

        // Build dynamic message
        const firstName = currentLead.name.split(' ')[0]
        let message = `Olá ${firstName}! Tudo bem?\n\nEstou enviando os detalhes deste imóvel que pode te interessar:\n\n`

        // 0. Unidade Selecionada integrada ao bloco IMÓVEL
        if (config.title || config.location !== 'none' || selectedUnit) {
            message += `*IMÓVEL*\n`
            if (config.title) {
                message += `• ${property.title}\n`
            }
            if (selectedUnit) {
                const typeLabel = getPropertyTypeName(property.type)
                let unitLine = `• ${typeLabel}: ${selectedUnit.unit_number}`
                if (selectedUnit.block_tower) unitLine += ` - Bloco/Torre: ${selectedUnit.block_tower}`
                if (selectedUnit.floor) unitLine += ` - ${selectedUnit.floor}º Andar`
                message += `${unitLine}\n`
            }
            if (config.location !== 'none') {
                const bairro = property.details?.endereco?.bairro || ''
                const cidade = property.details?.endereco?.cidade || ''
                const rua = property.details?.endereco?.rua || ''
                const numero = property.details?.endereco?.numero || ''
                const estado = property.details?.endereco?.estado || ''

                let addressText = ''
                if (config.location === 'exact' && rua) {
                    const ruaE_numero = numero?.trim() ? `${rua}, ${numero}` : rua
                    const parts = [ruaE_numero, bairro, cidade].filter(Boolean)
                    addressText = parts.join(' - ') + (estado ? `/${estado}` : '')
                } else if (bairro && cidade) {
                    addressText = `${bairro} - ${cidade}${estado ? `/${estado}` : ''}`
                } else {
                    const parts = [bairro, cidade].filter(Boolean)
                    addressText = parts.join(' - ') + (estado ? `/${estado}` : '')
                }
                if (addressText) {
                    message += `• Local: ${addressText}\n`
                }
            }
            message += `\n`
        }

        // 3. Informações
        let dorms = parseInt(String(property.details?.dormitorios || property.details?.quartos || '0'))
        let suites = parseInt(String(property.details?.suites || '0'))
        let banheiros = parseInt(String(property.details?.banheiros || '0'))
        let vegasVal = parseInt(String(property.details?.vagas || '0'))
        const posicaoSolar = property.details?.posicao_solar || property.details?.posicao || property.details?.solar || ''

        let hasSacadaChurras = property.details?.has_sacada_com_churrasqueira
        let hasSacadaSem = property.details?.has_sacada_sem_churrasqueira
        let hasLavabo = property.details?.has_lavabo
        let hasEscritorio = property.details?.has_escritorio
        let hasDependencia = property.details?.has_dependencia_empregada
        let hobbyBox = property.details?.hobby_box
        let hobbyBoxNum = property.details?.hobby_box_numeracao
        let areaPrivativa = property.details?.area_privativa
        let areaTotal = property.details?.area_total
        let tipologiaUnidade = ''

        if (selectedUnit) {
            if (selectedUnit.area_privativa) {
                areaPrivativa = Number(selectedUnit.area_privativa)
            }
            if (selectedUnit.area_total) {
                areaTotal = Number(selectedUnit.area_total)
            }
            if (selectedUnit.garage_number) {
                vegasVal = property.details?.vagas ? parseInt(String(property.details.vagas)) : 1
            }
            if (selectedUnit.hobby_box) {
                hobbyBox = 'Sim'
                hobbyBoxNum = selectedUnit.hobby_box
            }

            const secao = selectedUnit.extra_data?.secao || selectedUnit.extra_data?.tipologia
            if (secao) {
                tipologiaUnidade = String(secao)
                const textUpper = tipologiaUnidade.toUpperCase()

                if (textUpper.includes('SUÍTE') || textUpper.includes('SUITES')) {
                    const matchSuites = textUpper.match(/(\d+)\s*SUÍTE/i) || textUpper.match(/(\d+)\s*SUITES/i)
                    if (matchSuites) {
                        suites = parseInt(matchSuites[1])
                    } else if (textUpper.includes('UMA SUÍTE') || textUpper.includes('1 SUÍTE')) {
                        suites = 1
                    }
                }

                if (textUpper.includes('DORMITÓRIO') || textUpper.includes('DORMITORIOS') || textUpper.includes('QUARTO')) {
                    const matchDorms = textUpper.match(/(\d+)\s*DORMITÓRIO/i) || textUpper.match(/(\d+)\s*DORMITORIOS/i) || textUpper.match(/(\d+)\s*QUARTO/i)
                    if (matchDorms) {
                        dorms = parseInt(matchDorms[1])
                    } else if (textUpper.includes('UM DORMITÓRIO') || textUpper.includes('1 DORMITÓRIO')) {
                        dorms = 1
                    }
                } else if (suites > 0) {
                    dorms = Math.max(dorms, suites)
                }

                if (textUpper.includes('LAVABO')) {
                    hasLavabo = true
                }
            }
        }

        const showBedrooms = config.showBedrooms && dorms > 0
        const showSuites = config.showSuites && suites > 0
        const showAreaPrivativa = config.showAreaPrivativa
        const showAreaTotal = config.showAreaTotal
        const showVagas = config.showVagas
        const showHobbyBox = config.showHobbyBox
        const showSacada = config.showSacada
        const showEscritorio = config.showEscritorio
        const showDependencia = config.showDependencia
        const showObservations = config.showObservations && property.details?.obs_dormitorios

        const hasAnyInfo = showBedrooms || showSuites || banheiros > 0 || posicaoSolar ||
            (showSacada && (hasSacadaChurras || hasSacadaSem)) ||
            hasLavabo || (showEscritorio && hasEscritorio) || (showDependencia && hasDependencia) ||
            showObservations || (showVagas && vegasVal > 0) || (showHobbyBox && (hobbyBox || hobbyBoxNum)) ||
            (showAreaPrivativa && areaPrivativa) || (showAreaTotal && areaTotal) || !!tipologiaUnidade

        if (hasAnyInfo) {
            message += `*INFORMAÇÕES*\n`
            if (tipologiaUnidade) {
                message += `• Tipologia: ${tipologiaUnidade}\n`
            }
            if (showBedrooms) {
                message += `• Dormitórios: ${dorms}\n`
            }
            if (showSuites) {
                message += `• Suítes: ${suites}\n`
            }
            if (banheiros > 0) {
                message += `• Banheiros: ${banheiros}\n`
            }
            if (showVagas) {
                const vagaIdentificacao = (selectedUnit && selectedUnit.garage_number)
                    ? selectedUnit.garage_number
                    : (property.details?.vagas_numeracao || (vegasVal > 0 ? String(vegasVal) : ''))
                if (vagaIdentificacao) {
                    message += `• Vaga: ${vagaIdentificacao}\n`
                }
            }
            if (posicaoSolar) {
                message += `• Posição solar: ${posicaoSolar}\n`
            }
            if (showSacada) {
                if (hasSacadaChurras) {
                    message += '• Sacada com churrasqueira: Sim\n'
                } else if (hasSacadaSem) {
                    message += '• Sacada: Sim\n'
                }
            }
            if (hasLavabo) {
                message += '• Lavabo: Sim\n'
            }
            if (showEscritorio && hasEscritorio) {
                message += '• Escritório: Sim\n'
            }
            if (showDependencia && hasDependencia) {
                message += '• Dependência de empregada: Sim\n'
            }
            if (showObservations) {
                message += `• Observações: ${property.details?.obs_dormitorios}\n`
            }
            if (showHobbyBox) {
                const hbNum = (selectedUnit && selectedUnit.hobby_box)
                    ? selectedUnit.hobby_box
                    : (hobbyBoxNum || (hobbyBox !== 'Sim' ? hobbyBox : ''))
                if (hbNum) {
                    message += `• Hobby Box: ${hbNum}\n`
                }
            }
            if (showAreaPrivativa && areaPrivativa) {
                message += `• Área privativa: ${areaPrivativa} m²\n`
            }
            if (showAreaTotal && areaTotal && parseFloat(String(areaTotal)) > 0) {
                message += `• Área total: ${areaTotal} m²\n`
            }
            message += `\n`
        }

        // 3. Valor (Abaixo de Informações!)
        const hasPrice = config.price
        const hasCondo = config.showCondo && property.details?.valor_condominio
        const hasIptu = config.showIptu && property.details?.valor_iptu
        const hasPaymentCond = selectedUnit && (selectedUnit.valor_ato || selectedUnit.valor_mensais || selectedUnit.valor_reforcos || selectedUnit.valor_chaves || selectedUnit.soma_poupanca || selectedUnit.valor_financiamento)

        if (hasPrice || hasCondo || hasIptu || hasPaymentCond || (selectedUnit && selectedUnit.valor_total)) {
            message += `*VALOR*\n`
            if (selectedUnit) {
                if (selectedUnit.valor_total) {
                    message += `• Valor da Unidade: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_total))}\n`
                }
                if (hasPaymentCond) {
                    if (selectedUnit.valor_ato) {
                        message += `  - Ato: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_ato))}\n`
                    }
                    if (selectedUnit.valor_mensais) {
                        message += `  - Mensais: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_mensais))}\n`
                    }
                    if (selectedUnit.valor_reforcos) {
                        message += `  - Reforços: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_reforcos))}\n`
                    }
                    if (selectedUnit.valor_chaves) {
                        message += `  - Chaves: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_chaves))}\n`
                    }
                    if (selectedUnit.soma_poupanca) {
                        message += `  - Valor até a entrega: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.soma_poupanca))}\n`
                    }
                    if (selectedUnit.valor_financiamento) {
                        message += `  - Saldo pós-entrega / Financiamento construtora: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_financiamento))}\n`
                    }
                }
            } else if (hasPrice) {
                message += `• Imóvel: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(property.price)}\n`
            }

            if (hasCondo) {
                const condoNum = parseFloat(String(property.details?.valor_condominio))
                if (!isNaN(condoNum) && condoNum > 0) {
                    message += `• Condomínio: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(condoNum)}\n`
                }
            }
            if (hasIptu) {
                const iptuNum = parseFloat(String(property.details?.valor_iptu))
                if (!isNaN(iptuNum) && iptuNum > 0) {
                    message += `• IPTU: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(iptuNum)}\n`
                }
            }
            message += `\n`
        }

        // 4. Área comum | Lazer
        if (config.showAmenities) {
            const amenitiesMap = [
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
                { id: 'brinquedoteca', label: 'Brinquedoteca' },
                { id: 'home_market', label: 'Home Market' },
            ]
            const activeAmenities = amenitiesMap
                .filter(a => property.details?.[a.id])
                .map(a => a.label)

            if (activeAmenities.length > 0) {
                message += `*ÁREA COMUM | LAZER*\n`
                activeAmenities.forEach(amenity => {
                    message += `• ${amenity}\n`
                })
                message += `\n`
            }
        }

        // 5. Descrição
        if (config.description === 'full' && property.description?.trim()) {
            message += `*DESCRIÇÃO*\n`
            const cleanDesc = property.description
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/#/g, '')
                .trim()
            message += `${cleanDesc}\n\n`
        }

        // 6. Responsável
        if (config.showResponsavel) {
            const broker = property.created_by_profile
            if (broker) {
                message += `*RESPONSÁVEL*\n`
                message += `• Corretor: ${broker.full_name}\n`
                if (broker.whatsapp_number) {
                    message += `• WhatsApp: ${broker.whatsapp_number}\n`
                }
                message += `\n`
            }
        }

        // 7. Proprietário | Construtora
        if (config.showConstrutora) {
            const propNome = property.details?.proprietario?.nome || (property as any).owner_name
            const propTel = property.details?.proprietario?.telefone || (property as any).owner_phone
            const propEmail = property.details?.proprietario?.email || (property as any).owner_email
            const propResp = property.details?.proprietario?.responsavel

            if (propNome) {
                message += `*PROPRIETÁRIO | CONSTRUTORA*\n`
                message += `• Nome: ${propNome}\n`
                if (propResp) {
                    message += `• Responsável: ${propResp}\n`
                }
                if (propTel) {
                    message += `• Telefone: ${propTel}\n`
                }
                if (propEmail) {
                    message += `• E-mail: ${propEmail}\n`
                }
                message += `\n`
            }
        }

        message += `Confira imagens e mais informações em:\n\n• ${propertyUrl}\n\nQualquer dúvida, estou à disposição!`

        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`

        window.open(whatsappUrl, '_blank')

        await logInteraction(currentLead.id, 'whatsapp', `Enviado link do property via WhatsApp: ${property.title}`)

        toast.success('WhatsApp aberto!')
        setSending(false)
        onClose()
    }

    const handleGeneratePDF = async () => {
        setIsGeneratingPDF(true)
        try {
            const { generatePropertyPDF } = await import('@/lib/utils/generatePropertyPDF')

            let brokerProfile = property.created_by_profile

            if (!brokerProfile && currentBroker) {
                brokerProfile = {
                    id: currentBroker.id,
                    full_name: currentBroker.full_name,
                    whatsapp_number: currentBroker.whatsapp_number,
                    avatar_url: currentBroker.avatar_url
                }
            }

            const formattedProperty = {
                ...property,
                created_by_profile: brokerProfile
            }

            await generatePropertyPDF({
                property: formattedProperty,
                config: {
                    ...config,
                    selectedUnit: selectedUnit
                } as any,
                tenantName: tenant?.name || 'CRM LAX',
                tenantLogoUrl: tenant?.branding?.logo_full
            })

            toast.success('PDF gerado com sucesso!')
        } catch (error) {
            console.error('Erro ao gerar PDF:', error)
            toast.error('Ocorreu um erro ao gerar o PDF.')
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const handleSelectAll = (section: 'valores' | 'images' | 'videos' | 'docs' | 'details') => {
        if (section === 'valores') {
            setConfig(prev => ({
                ...prev,
                price: true,
                showCondo: true,
                showIptu: true
            }))
        } else if (section === 'images') {
            setConfig(prev => ({
                ...prev,
                selectedImages: property.images || []
            }))
        } else if (section === 'videos') {
            setConfig(prev => ({
                ...prev,
                selectedVideos: property.videos || []
            }))
        } else if (section === 'docs') {
            setConfig(prev => ({
                ...prev,
                selectedDocs: property.documents || []
            }))
        } else if (section === 'details') {
            setConfig(prev => ({
                ...prev,
                showBedrooms: true,
                showSuites: true,
                showAreaPrivativa: true,
                showAreaTotal: true,
                showVagas: true,
                showHobbyBox: true,
                showSacada: true,
                showEscritorio: true,
                showDependencia: true,
                showObservations: true
            }))
        }
    }

    const handleDeselectAll = (section: 'valores' | 'images' | 'videos' | 'docs' | 'details') => {
        if (section === 'valores') {
            setConfig(prev => ({
                ...prev,
                price: false,
                showCondo: false,
                showIptu: false
            }))
        } else if (section === 'images') {
            setConfig(prev => ({
                ...prev,
                selectedImages: []
            }))
        } else if (section === 'videos') {
            setConfig(prev => ({
                ...prev,
                selectedVideos: []
            }))
        } else if (section === 'docs') {
            setConfig(prev => ({
                ...prev,
                selectedDocs: []
            }))
        } else if (section === 'details') {
            setConfig(prev => ({
                ...prev,
                showBedrooms: false,
                showSuites: false,
                showAreaPrivativa: false,
                showAreaTotal: false,
                showVagas: false,
                showHobbyBox: false,
                showSacada: false,
                showEscritorio: false,
                showDependencia: false,
                showObservations: false
            }))
        }
    }

    const hasSelectedItems = (section: 'valores' | 'images' | 'videos' | 'docs' | 'details'): boolean => {
        if (section === 'valores') {
            return !!(config.price || config.showCondo || config.showIptu)
        }
        if (section === 'images') {
            return config.selectedImages.length > 0
        }
        if (section === 'videos') {
            return config.selectedVideos.length > 0
        }
        if (section === 'docs') {
            return config.selectedDocs.length > 0
        }
        if (section === 'details') {
            return !!(
                config.showBedrooms ||
                config.showSuites ||
                config.showAreaPrivativa ||
                config.showAreaTotal ||
                config.showVagas ||
                config.showHobbyBox ||
                config.showSacada ||
                config.showEscritorio ||
                config.showDependencia ||
                config.showObservations
            )
        }
        return false
    }

    const selectedImagesSet = useMemo(() => new Set(config.selectedImages), [config.selectedImages])
    const selectedVideosSet = useMemo(() => new Set(config.selectedVideos), [config.selectedVideos])
    const selectedDocsSet = useMemo(() => new Set(config.selectedDocs.map((d) => d.url)), [config.selectedDocs])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <h3 className="text-lg font-black text-foreground uppercase tracking-widest truncate">
                    Enviar para Lead
                </h3>
            } size="xl"
        >
            <div className="flex flex-col max-h-[calc(90vh-120px)]">
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6 min-h-0">
                    {!selectedLead ? (
                        <div className="space-y-4">
                            {isManualMode ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <button
                                            onClick={() => setIsManualMode(false)}
                                            className="p-2 hover:bg-foreground/5 rounded-full transition-colors"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <h3 className="font-bold text-foreground">Novo Lead</h3>
                                    </div>
                                    <FormInput
                                        label="Nome Completo"
                                        placeholder="Ex: João Silva"
                                        value={manualLead.name}
                                        onChange={(e) => setManualLead({ ...manualLead, name: e.target.value })}
                                    />
                                    <FormInput
                                        label="Telefone (WhatsApp)"
                                        placeholder="(00) 00000-0000"
                                        value={manualLead.phone}
                                        onChange={(e) => setManualLead({ ...manualLead, phone: e.target.value })}
                                    />
                                    <FormInput
                                        label="E-mail (Opcional)"
                                        placeholder="joao@exemplo.com"
                                        value={manualLead.email}
                                        onChange={(e) => setManualLead({ ...manualLead, email: e.target.value })}
                                    />

                                    <div className="pt-4 border-t">
                                        <p className="text-xs text-muted-foreground mb-4">O lead será cadastrado automaticamente ao enviar o imóvel.</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleSendEmail(null)}
                                                disabled={sending}
                                                className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border hover:bg-blue-500/5 hover:border-blue-500/20 transition-all group"
                                            >
                                                <Mail size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                                <p className="font-bold text-foreground text-xs">E-mail</p>
                                            </button>
                                            <button
                                                onClick={() => handleSendWhatsApp(null)}
                                                disabled={sending}
                                                className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border hover:bg-[#25D366]/5 hover:border-[#25D366]/20 transition-all group"
                                            >
                                                <MessageCircle size={16} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                                                <p className="font-bold text-foreground text-xs">WhatsApp</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <FormInput
                                                placeholder="Buscar lead por nome, email ou telefone..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onClear={() => setSearchTerm('')}
                                                icon={Search}
                                                className="h-11"
                                                roundedClassName="rounded-md"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsManualMode(true)
                                                setManualLead({ name: searchTerm, email: '', phone: '' })
                                            }}
                                            className="h-11 px-4 flex-shrink-0 flex items-center justify-center bg-[#FFE600] hover:bg-[#FFE600]/90 text-[#404F4F] font-bold text-xs uppercase tracking-widest rounded-md transition-all"
                                            title="Novo Lead"
                                        >
                                            <span>+ NOVO LEAD</span>
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="animate-spin text-foreground" size={24} />
                                            </div>
                                        ) : filteredLeads.length > 0 ? (
                                            filteredLeads.map(lead => (
                                                <div
                                                    key={lead.id}
                                                    onClick={() => handleSelectLead(lead)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-all text-left group cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground group-hover:bg-foreground/10 transition-colors flex-shrink-0">
                                                        {lead.avatar_url ? (
                                                            <img
                                                                src={lead.avatar_url}
                                                                alt={lead.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <User size={20} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-foreground text-base truncate">{lead.name}</p>
                                                        <p className="text-xs font-medium text-foreground">{formatPhone(lead.phone)}</p>
                                                        <p className="text-sm text-foreground truncate">{lead.email || 'Sem e-mail'}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 space-y-4">
                                                <p className="text-foreground">Nenhum lead encontrado.</p>
                                                {searchTerm && (
                                                    <button
                                                        onClick={() => {
                                                            setIsManualMode(true)
                                                            setManualLead({ name: searchTerm, email: '', phone: '' })
                                                        }}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl font-bold hover:opacity-90 transition-all text-sm"
                                                    >
                                                        <UserPlus size={16} />
                                                        Criar &quot;{searchTerm}&quot; como novo lead
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Lead Header */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#404F4F] text-white border border-[#404F4F]/10">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                                    {selectedLead.avatar_url ? (
                                        <img
                                            src={selectedLead.avatar_url}
                                            alt={selectedLead.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User size={24} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white/70 uppercase tracking-wider">Lead Selecionado</p>
                                    <p className="text-xl font-bold text-white">{selectedLead.name}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedLead(null)}
                                    className="text-base font-bold text-white hover:text-white/80 hover:underline"
                                >
                                    Alterar
                                </button>
                            </div>

                            {/* Configuration Options */}
                            <div className="space-y-3">
                                {/* 1. Imóvel */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('basic')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.basic ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Home size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Imóvel</span>
                                        </div>
                                        {expandedSections.basic ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                    </button>
                                    {expandedSections.basic && (
                                        <div className="p-4 bg-white dark:bg-muted/30 space-y-3 border-t border-border/40">
                                            <div className="pl-4">
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Nome imóvel"
                                                    checked={config.title}
                                                    onChange={(e) => setConfig({ ...config, title: e.target.checked })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 1.1. Apartamento Escolhido */}
                                {units.length > 0 && (
                                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => toggleSection('units')}
                                            className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.units ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Building2 size={16} strokeWidth={1.2} className="text-foreground" />
                                                <span className="font-bold text-foreground text-lg">
                                                    {selectedUnit ? `Unidade Selecionada: ${selectedUnit.unit_number}` : 'Unidade'}
                                                </span>
                                            </div>
                                            {expandedSections.units ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                        </button>
                                        {expandedSections.units && (
                                            <div className="p-4 bg-white dark:bg-muted/30 space-y-4 border-t border-border/40">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar unidade (ex: 101, bloco A...)"
                                                        value={unitFilter}
                                                        onChange={(e) => setUnitFilter(e.target.value)}
                                                        className="w-full pl-3 pr-8 py-2 text-sm bg-white dark:bg-muted/50 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none"
                                                    />
                                                    {unitFilter && (
                                                        <button
                                                            onClick={() => setUnitFilter('')}
                                                            className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground font-bold"
                                                        >
                                                            Limpar
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-muted/10">
                                                    {/* Header */}
                                                    <div className="grid grid-cols-12 px-3 py-2 text-base font-bold text-foreground uppercase tracking-wider border-b border-border/40 bg-gray-100/50 dark:bg-muted/20 text-center select-none">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSort('apto')}
                                                            className="col-span-3 text-center flex items-center justify-center gap-1 hover:text-foreground/80 focus:outline-none w-full"
                                                        >
                                                            Apto
                                                            {sortColumn === 'apto' ? (
                                                                sortDirection === 'asc' ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />
                                                            ) : (
                                                                <ArrowUpDown size={14} strokeWidth={1.5} className="text-muted-foreground/40" />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSort('tipo')}
                                                            className="col-span-5 text-center flex items-center justify-center gap-1 hover:text-foreground/80 focus:outline-none w-full"
                                                        >
                                                            Tipo
                                                            {sortColumn === 'tipo' ? (
                                                                sortDirection === 'asc' ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />
                                                            ) : (
                                                                <ArrowUpDown size={14} strokeWidth={1.5} className="text-muted-foreground/40" />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSort('valor')}
                                                            className="col-span-4 text-center flex items-center justify-center gap-1 hover:text-foreground/80 focus:outline-none w-full"
                                                        >
                                                            Valor total (R$)
                                                            {sortColumn === 'valor' ? (
                                                                sortDirection === 'asc' ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />
                                                            ) : (
                                                                <ArrowUpDown size={14} strokeWidth={1.5} className="text-muted-foreground/40" />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Scrollable list */}
                                                    <div className="max-h-[200px] overflow-y-auto divide-y divide-border/50">
                                                        {filteredUnits.length > 0 ? (
                                                            filteredUnits.map((unit) => (
                                                                <button
                                                                    key={unit.id}
                                                                    onClick={() => {
                                                                        setSelectedUnit(selectedUnit?.id === unit.id ? null : unit)
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2.5 text-base transition-colors grid grid-cols-12 items-center relative ${selectedUnit?.id === unit.id ? 'bg-[#FFE600]/10 hover:bg-[#FFE600]/20' : 'hover:bg-muted/50'}`}
                                                                >
                                                                    <div className="col-span-3 flex items-baseline justify-center gap-1.5 text-center">
                                                                        <span className="text-foreground text-base">{unit.unit_number}</span>
                                                                        {unit.block_tower && <span className="text-[10px] text-muted-foreground">T: {unit.block_tower}</span>}
                                                                    </div>
                                                                    <div className="col-span-5 text-base text-foreground truncate px-2 text-center">
                                                                        {unit.extra_data?.secao || '-'}
                                                                    </div>
                                                                    <div className="col-span-4 text-center">
                                                                        {unit.valor_total ? (
                                                                            <span className="text-foreground text-base">{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(unit.valor_total))}</span>
                                                                        ) : (
                                                                            <span className="text-muted-foreground text-sm">-</span>
                                                                        )}
                                                                    </div>
                                                                    {selectedUnit?.id === unit.id && (
                                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                                                            <Check size={16} className="text-green-500 font-bold" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground italic p-3 text-center">Nenhuma unidade encontrada.</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {selectedUnit && (
                                                    <div className="p-3 bg-white dark:bg-muted/30 border border-border/50 rounded-lg space-y-2 text-sm">
                                                        <p className="font-bold text-foreground uppercase tracking-wider text-xs">Resumo de Condições (Unidade {selectedUnit.unit_number})</p>
                                                        <div className="grid grid-cols-2 gap-2 text-foreground">
                                                            {selectedUnit.valor_total && <p><strong>Valor total:</strong> R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_total))}</p>}
                                                            {selectedUnit.valor_ato && <p><strong>Ato:</strong> R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_ato))}</p>}
                                                            {selectedUnit.valor_mensais && <p><strong>Mensais:</strong> R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_mensais))}</p>}
                                                            {selectedUnit.valor_reforcos && <p><strong>Reforços:</strong> R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_reforcos))}</p>}
                                                            {selectedUnit.valor_chaves && <p><strong>Chaves:</strong> R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_chaves))}</p>}
                                                            {selectedUnit.soma_poupanca && <p><strong>Até a entrega:</strong> R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.soma_poupanca))}</p>}
                                                            {selectedUnit.valor_financiamento && <p><strong>Saldo pós-entrega:</strong> R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedUnit.valor_financiamento))}</p>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 2. Endereço */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('location')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.location ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapPin size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Endereço</span>
                                        </div>
                                        {expandedSections.location ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                    </button>
                                    {expandedSections.location && (
                                        <div className="p-4 bg-white dark:bg-muted/30 border-t border-border/40">
                                            <div className="flex flex-col gap-3 pl-4">
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Endereço Exato"
                                                    checked={config.location === 'exact'}
                                                    onChange={() => setConfig({ ...config, location: 'exact' })}
                                                />
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Aproximada (Bairro)"
                                                    checked={config.location === 'approximate'}
                                                    onChange={() => setConfig({ ...config, location: 'approximate' })}
                                                />
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Não enviar"
                                                    checked={config.location === 'none'}
                                                    onChange={() => setConfig({ ...config, location: 'none' })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Valores */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('valores')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.valores ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <DollarSign size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Valores</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {expandedSections.valores && (
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleSelectAll('valores')}
                                                        className="bg-[#FFE600] text-[#404F4F] border border-[#FFE600]/30 hover:bg-[#FFE600]/90 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                    >
                                                        Selecionar todas
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeselectAll('valores')}
                                                        className={hasSelectedItems('valores')
                                                            ? "bg-red-500 text-white border border-red-500 hover:bg-red-600 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                            : "bg-red-500/5 text-red-500/50 border border-red-500/10 hover:bg-red-500/10 transition-all font-bold text-xs px-2 py-0.5 rounded"
                                                        }
                                                    >
                                                        Desmarcar todas
                                                    </button>
                                                </div>
                                            )}
                                            {expandedSections.valores ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                        </div>
                                    </button>
                                    {expandedSections.valores && (
                                        <div className="p-4 bg-white dark:bg-muted/30 space-y-3 border-t border-border/40">
                                            <div className="space-y-3 pl-4">
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Preço"
                                                    checked={config.price}
                                                    onChange={(e) => setConfig({ ...config, price: e.target.checked })}
                                                />
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Condomínio"
                                                    checked={config.showCondo}
                                                    onChange={(e) => setConfig({ ...config, showCondo: e.target.checked })}
                                                />
                                                <FormCheckbox labelClassName="text-base"
                                                    label="IPTU"
                                                    checked={config.showIptu}
                                                    onChange={(e) => setConfig({ ...config, showIptu: e.target.checked })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Imagens */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('images')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.images ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ImageIcon size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Imagens ({config.selectedImages.length})</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {expandedSections.images && (property.images?.length ?? 0) > 1 && (
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleSelectAll('images')}
                                                        className="bg-[#FFE600] text-[#404F4F] border border-[#FFE600]/30 hover:bg-[#FFE600]/90 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                    >
                                                        Selecionar todas
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeselectAll('images')}
                                                        className={hasSelectedItems('images')
                                                            ? "bg-red-500 text-white border border-red-500 hover:bg-red-600 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                            : "bg-red-500/5 text-red-500/50 border border-red-500/10 hover:bg-red-500/10 transition-all font-bold text-xs px-2 py-0.5 rounded"
                                                        }
                                                    >
                                                        Desmarcar todas
                                                    </button>
                                                </div>
                                            )}
                                            {expandedSections.images ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                        </div>
                                    </button>
                                    {expandedSections.images && (
                                        <div className="p-4 bg-white dark:bg-muted/30 space-y-3 border-t border-border/40">
                                            {config.selectedImages.length > 0 && (
                                                <button
                                                    onClick={handleDownloadImages}
                                                    disabled={isDownloading}
                                                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#404F4F]/20 text-[#404F4F] hover:bg-[#404F4F]/5 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                >
                                                    {isDownloading ? (
                                                        <>
                                                            <Loader2 className="animate-spin" size={14} />
                                                            <span>Baixando fotos...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download size={14} />
                                                            <span>Baixar {config.selectedImages.length} fotos selecionadas</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                            {(property.images?.length ?? 0) > 0 ? (
                                                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                                    {(property.images ?? []).map((img: string, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => {
                                                                const newImages = selectedImagesSet.has(img)
                                                                    ? config.selectedImages.filter((i: string) => i !== img)
                                                                    : [...config.selectedImages, img]
                                                                setConfig({ ...config, selectedImages: newImages })
                                                            }}
                                                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-opacity ${selectedImagesSet.has(img) ? 'ring-2 ring-[#FFE600] ring-inset' : 'opacity-60 hover:opacity-100'}`}
                                                        >
                                                            <img
                                                                src={img}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                                alt={`Foto ${idx + 1}`}
                                                            />
                                                            {selectedImagesSet.has(img) && (
                                                                <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                                                                    <div className="w-5 h-5 rounded-full bg-[#FFE600] flex items-center justify-center">
                                                                        <Check className="text-[#404F4F]" size={14} strokeWidth={3.5} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-foreground italic">Nenhuma imagem disponível.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 5. Vídeos */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('videos')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.videos ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Video size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Vídeos ({config.selectedVideos.length})</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {expandedSections.videos && (property.videos?.length ?? 0) > 1 && (
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleSelectAll('videos')}
                                                        className="bg-[#FFE600] text-[#404F4F] border border-[#FFE600]/30 hover:bg-[#FFE600]/90 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                    >
                                                        Selecionar todas
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeselectAll('videos')}
                                                        className={hasSelectedItems('videos')
                                                            ? "bg-red-500 text-white border border-red-500 hover:bg-red-600 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                            : "bg-red-500/5 text-red-500/50 border border-red-500/10 hover:bg-red-500/10 transition-all font-bold text-xs px-2 py-0.5 rounded"
                                                        }
                                                    >
                                                        Desmarcar todas
                                                    </button>
                                                </div>
                                            )}
                                            {expandedSections.videos ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                        </div>
                                    </button>
                                    {expandedSections.videos && (
                                        <div className="p-4 bg-white dark:bg-muted/30 space-y-4 border-t border-border/40">
                                            {(property.videos?.length ?? 0) > 0 ? (
                                                <div className="space-y-1 pl-4">
                                                    {(property.videos ?? []).map((video: string, idx: number) => (
                                                        <FormCheckbox labelClassName="text-base"
                                                            key={idx}
                                                            label={`Vídeo ${idx + 1}`}
                                                            checked={selectedVideosSet.has(video)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                const newVideos = checked
                                                                    ? [...config.selectedVideos, video]
                                                                    : config.selectedVideos.filter((v: string) => v !== video)
                                                                setConfig({ ...config, selectedVideos: newVideos })
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-foreground italic">Nenhum vídeo disponível.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 6. Documentos */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('docs')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.docs ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Documentos ({config.selectedDocs.length})</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {expandedSections.docs && (property.documents?.length ?? 0) > 1 && (
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleSelectAll('docs')}
                                                        className="bg-[#FFE600] text-[#404F4F] border border-[#FFE600]/30 hover:bg-[#FFE600]/90 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                    >
                                                        Selecionar todas
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeselectAll('docs')}
                                                        className={hasSelectedItems('docs')
                                                            ? "bg-red-500 text-white border border-red-500 hover:bg-red-600 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                            : "bg-red-500/5 text-red-500/50 border border-red-500/10 hover:bg-red-500/10 transition-all font-bold text-xs px-2 py-0.5 rounded"
                                                        }
                                                    >
                                                        Desmarcar todas
                                                    </button>
                                                </div>
                                            )}
                                            {expandedSections.docs ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                        </div>
                                    </button>
                                    {expandedSections.docs && (
                                        <div className="p-4 bg-white dark:bg-muted/30 space-y-4 border-t border-border/40">
                                            {(property.documents?.length ?? 0) > 0 ? (
                                                <div className="space-y-1 pl-4">
                                                    {(property.documents ?? []).map((doc: PropertyDocument, idx: number) => (
                                                        <FormCheckbox labelClassName="text-base"
                                                            key={idx}
                                                            label={doc.name || `Documento ${idx + 1}`}
                                                            checked={selectedDocsSet.has(doc.url)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                const newDocs = checked
                                                                    ? [...config.selectedDocs, doc]
                                                                    : config.selectedDocs.filter((d) => d.url !== doc.url)
                                                                setConfig({ ...config, selectedDocs: newDocs })
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-foreground italic">Nenhum documento disponível.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 7. Informações */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('details')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.details ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Info size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Informações</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {expandedSections.details && (
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleSelectAll('details')}
                                                        className="bg-[#FFE600] text-[#404F4F] border border-[#FFE600]/30 hover:bg-[#FFE600]/90 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                    >
                                                        Selecionar todas
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeselectAll('details')}
                                                        className={hasSelectedItems('details')
                                                            ? "bg-red-500 text-white border border-red-500 hover:bg-red-600 transition-all font-bold text-xs px-2 py-0.5 rounded shadow-sm"
                                                            : "bg-red-500/5 text-red-500/50 border border-red-500/10 hover:bg-red-500/10 transition-all font-bold text-xs px-2 py-0.5 rounded"
                                                        }
                                                    >
                                                        Desmarcar todas
                                                    </button>
                                                </div>
                                            )}
                                            {expandedSections.details ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                        </div>
                                    </button>
                                    {expandedSections.details && (() => {
                                        const dorms = parseInt(String(property.details?.dormitorios || property.details?.quartos || '0'))
                                        const suites = parseInt(String(property.details?.suites || '0'))
                                        const sacada = !!(property.details?.has_sacada_com_churrasqueira || property.details?.has_sacada_sem_churrasqueira)
                                        const escritorio = !!property.details?.has_escritorio
                                        const dependencia = !!property.details?.has_dependencia_empregada
                                        const vagas = parseInt(String(property.details?.vagas || '0')) > 0
                                        const hobby = !!(property.details?.hobby_box || property.details?.hobby_box_numeracao)
                                        const areaPrivativa = parseFloat(String(property.details?.area_privativa || '0')) > 0
                                        const areaTotal = parseFloat(String(property.details?.area_total || '0')) > 0
                                        const obs = !!property.details?.obs_dormitorios

                                        return (
                                            <div className="p-4 bg-white dark:bg-muted/30 space-y-3 border-t border-border/40">
                                                <div className="grid grid-cols-2 gap-3 pl-4">
                                                    {dorms > 0 && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Dormitórios"
                                                            checked={config.showBedrooms}
                                                            onChange={(e) => setConfig({ ...config, showBedrooms: e.target.checked })}
                                                        />
                                                    )}
                                                    {suites > 0 && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Suítes"
                                                            checked={config.showSuites}
                                                            onChange={(e) => setConfig({ ...config, showSuites: e.target.checked })}
                                                        />
                                                    )}
                                                    {sacada && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Sacada"
                                                            checked={config.showSacada}
                                                            onChange={(e) => setConfig({ ...config, showSacada: e.target.checked })}
                                                        />
                                                    )}
                                                    {escritorio && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Escritório"
                                                            checked={config.showEscritorio}
                                                            onChange={(e) => setConfig({ ...config, showEscritorio: e.target.checked })}
                                                        />
                                                    )}
                                                    {dependencia && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Dependência"
                                                            checked={config.showDependencia}
                                                            onChange={(e) => setConfig({ ...config, showDependencia: e.target.checked })}
                                                        />
                                                    )}
                                                    {vagas && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Vagas"
                                                            checked={config.showVagas}
                                                            onChange={(e) => setConfig({ ...config, showVagas: e.target.checked })}
                                                        />
                                                    )}
                                                    {hobby && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Hobby Box"
                                                            checked={config.showHobbyBox}
                                                            onChange={(e) => setConfig({ ...config, showHobbyBox: e.target.checked })}
                                                        />
                                                    )}
                                                    {areaPrivativa && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Área Privativa"
                                                            checked={config.showAreaPrivativa}
                                                            onChange={(e) => setConfig({ ...config, showAreaPrivativa: e.target.checked })}
                                                        />
                                                    )}
                                                    {areaTotal && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Área Total"
                                                            checked={config.showAreaTotal}
                                                            onChange={(e) => setConfig({ ...config, showAreaTotal: e.target.checked })}
                                                        />
                                                    )}
                                                    {obs && (
                                                        <FormCheckbox labelClassName="text-base"
                                                            label="Observações"
                                                            checked={config.showObservations}
                                                            onChange={(e) => setConfig({ ...config, showObservations: e.target.checked })}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>

                                {/* 8. Área comum | Lazer */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('amenities')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.amenities ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Waves size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Área comum | Lazer</span>
                                        </div>
                                        {expandedSections.amenities ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                    </button>
                                    {expandedSections.amenities && (
                                        <div className="p-4 bg-white dark:bg-muted/30 space-y-3 border-t border-border/40">
                                            <div className="pl-4">
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Incluir área de lazer"
                                                    checked={config.showAmenities}
                                                    onChange={(e) => setConfig({ ...config, showAmenities: e.target.checked })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 9. Descrição */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('descricao')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.descricao ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Descrição</span>
                                        </div>
                                        {expandedSections.descricao ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                    </button>
                                    {expandedSections.descricao && (
                                        <div className="p-4 bg-white dark:bg-muted/30 space-y-3 border-t border-border/40">
                                            <div className="pl-4">
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Incluir descrição"
                                                    checked={config.description === 'full'}
                                                    onChange={(e) => setConfig({ ...config, description: e.target.checked ? 'full' : 'none' })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 10. Responsável */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('responsavel')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.responsavel ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <UserCheck size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Responsável</span>
                                        </div>
                                        {expandedSections.responsavel ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                    </button>
                                    {expandedSections.responsavel && (
                                        <div className="p-4 bg-white dark:bg-muted/30 space-y-3 border-t border-border/40">
                                            <div className="pl-4">
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Incluir dados do responsável"
                                                    checked={config.showResponsavel}
                                                    onChange={(e) => setConfig({ ...config, showResponsavel: e.target.checked })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 11. Proprietário | Construtora */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('construtora')}
                                        className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-muted/20 ${expandedSections.construtora ? 'bg-gray-100/50 dark:bg-muted/20' : 'bg-gray-50 dark:bg-muted/15'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Building2 size={16} strokeWidth={1.2} className="text-foreground" />
                                            <span className="font-bold text-foreground text-lg">Proprietário | Construtora</span>
                                        </div>
                                        {expandedSections.construtora ? <ChevronUp size={16} strokeWidth={1.2} /> : <ChevronDown size={16} strokeWidth={1.2} />}
                                    </button>
                                    {expandedSections.construtora && (
                                        <div className="p-4 bg-white dark:bg-muted/30 space-y-3 border-t border-border/40">
                                            <div className="pl-4">
                                                <FormCheckbox labelClassName="text-base"
                                                    label="Incluir dados do proprietário/construtora"
                                                    checked={config.showConstrutora}
                                                    onChange={(e) => setConfig({ ...config, showConstrutora: e.target.checked })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {selectedLead && (
                    <div className="pt-4 mt-auto">
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleSendEmail(selectedLead)}
                                disabled={sending || isGeneratingPDF || !selectedLead.email}
                                className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex-shrink-0 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                    <Mail size={16} />
                                </div>
                                <div className="overflow-hidden min-w-0 flex-1">
                                    <p className="font-bold text-foreground text-sm truncate">E-mail</p>
                                    <p className="text-xs text-foreground truncate">{selectedLead.email || 'Sem e-mail'}</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSendWhatsApp(selectedLead)}
                                disabled={sending || isGeneratingPDF || !selectedLead.phone}
                                className="flex items-center gap-2 p-3 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 hover:border-[#25D366]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#25D366]/20 flex-shrink-0 flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform">
                                    <MessageCircle size={16} />
                                </div>
                                <div className="overflow-hidden min-w-0 flex-1">
                                    <p className="font-bold text-foreground text-sm truncate">WhatsApp</p>
                                    <p className="text-xs text-foreground truncate">{formatPhone(selectedLead.phone) || 'Sem telefone'}</p>
                                </div>
                            </button>

                            <button
                                onClick={handleGeneratePDF}
                                disabled={sending || isGeneratingPDF}
                                className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-left cursor-pointer animate-in fade-in"
                            >
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex-shrink-0 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                    {isGeneratingPDF ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <FileDown size={16} />
                                    )}
                                </div>
                                <div className="overflow-hidden min-w-0 flex-1">
                                    <p className="font-bold text-foreground text-sm truncate">Gerar PDF</p>
                                    <p className="text-xs text-foreground truncate">Ficha do imóvel</p>
                                </div>
                            </button>
                        </div>

                        {sending && (
                            <div className="flex items-center justify-center gap-2 text-foreground font-bold mt-4">
                                <Loader2 className="animate-spin" size={20} />
                                <span>Enviando...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    )
}
