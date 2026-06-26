'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { FormRichTextarea } from '@/components/shared/forms/FormRichTextarea'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { Send, Users, FileText, FileSpreadsheet, CheckCircle2, Loader2, Info, Filter, X, Trash2, Home, Search, Image as ImageIcon, Video, MapPin, ChevronDown, ChevronUp, Building2, Check, Globe } from 'lucide-react'
import { EmailBulkHistory } from './EmailBulkHistory'
import { toast } from 'sonner'
import { createEmailBulkCampaign, sendBulkEmailsBatch, getLeadsForEmailBulk, generatePropertyEmailHtml } from '@/app/_actions/email-bulk'
import { getEmailDomains } from '@/app/_actions/email-domains'
import { getProperties } from '@/app/_actions/properties'
import { fetchGoogleSheetAsXlsx } from '@/app/_actions/whatsapp-bulk'
import { getBulkFilterSuggestions } from '@/app/_actions/bulk-filter-suggestions'
import { AutocompleteInput } from '@/components/shared/forms/AutocompleteInput'
import * as XLSX from 'xlsx'
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency'
import { createClient } from '@/lib/supabase/client'

interface Recipient {
    name: string
    email: string
    lead_id?: string
}

interface PropertyDocument {
    name?: string
    url: string
}

interface PropertyItem {
    id: string
    title: string
    type: string | null
    price: number | null
    description: string | null
    images: string[] | null
    videos: string[] | null
    documents: PropertyDocument[] | null
    details: any
    slug: string | null
}

interface PropertyConfig {
    title: boolean
    price: boolean
    showCondo: boolean
    showIptu: boolean
    description: 'full' | 'none'
    location: 'exact' | 'approximate' | 'none'
    showBedrooms: boolean
    showSuites: boolean
    showArea: boolean
    showType: boolean
    showAmenities: boolean
    showSacada: boolean
    showEscritorio: boolean
    showDependencia: boolean
    showObservations: boolean
    selectedImages: string[]
    selectedVideos: string[]
    selectedDocs: PropertyDocument[]
}

interface EmailBulkSenderFormProps {
    tenantId: string
    profileId: string
    isAdmin: boolean
}

export function EmailBulkSenderForm({ tenantId, profileId, isAdmin }: EmailBulkSenderFormProps) {
    const [title, setTitle] = useState('')
    const [subject, setSubject] = useState('')
    const [contentHtml, setContentHtml] = useState('')
    const [senderName, setSenderName] = useState('')
    const [senderEmail, setSenderEmail] = useState('')
    
    const [recipients, setRecipients] = useState<Recipient[]>([])
    const [isSending, setIsSending] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [results, setResults] = useState<{ total: number, success: number, error: number, unsubscribed: number } | null>(null)

    // Domínios verificados para o remetente
    const [verifiedDomains, setVerifiedDomains] = useState<{domain: string}[]>([])
    const [loadingDomains, setLoadingDomains] = useState(true)

    // Filtros Avançados
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState({
        clientName: '',
        nameQuery: '',
        propertyName: '',
        propertyType: '',
        minPrice: '',
        maxPrice: '',
        bedrooms: 'any',
        location: ''
    })
    const [isFetchingLeads, setIsFetchingLeads] = useState(false)
    const [filterSuggestions, setFilterSuggestions] = useState<{
        clientNames: string[], leadNames: string[], propertyNames: string[], locations: string[], bedroomOptions: string[]
    }>({ clientNames: [], leadNames: [], propertyNames: [], locations: [], bedroomOptions: [] })

    const [showGoogleSheet, setShowGoogleSheet] = useState(false)
    const [googleSheetUrl, setGoogleSheetUrl] = useState('')
    const [isLoadingSheet, setIsLoadingSheet] = useState(false)
    const [showSheetPicker, setShowSheetPicker] = useState(false)
    const [availableSheetNames, setAvailableSheetNames] = useState<string[]>([])
    const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null)

    // === SELETOR DE IMÓVEL ===
    const [showPropertySelector, setShowPropertySelector] = useState(false)
    const [propertySearchTerm, setPropertySearchTerm] = useState('')
    const [allProperties, setAllProperties] = useState<PropertyItem[]>([])
    const [loadingProperties, setLoadingProperties] = useState(false)
    const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null)
    const [propertyConfig, setPropertyConfig] = useState<PropertyConfig>({
        title: true,
        price: true,
        showCondo: true,
        showIptu: true,
        description: 'full',
        location: 'approximate',
        showBedrooms: true,
        showSuites: true,
        showArea: true,
        showType: true,
        showAmenities: true,
        showSacada: true,
        showEscritorio: true,
        showDependencia: true,
        showObservations: true,
        selectedImages: [],
        selectedVideos: [],
        selectedDocs: []
    })
    const [expandedSections, setExpandedSections] = useState({
        basic: false,
        details: false,
        location: false,
        images: false,
        videos: false,
        docs: false
    })

    // Mídia anexa
    const [emailMedia, setEmailMedia] = useState<{ url: string; type: 'image' | 'video' | 'document'; name: string } | null>(null)
    const [isMediaUploading, setIsMediaUploading] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaInputRef = useRef<HTMLInputElement>(null)
    const propertyDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        async function loadDomains() {
            let domainsList: { domain: string }[] = []
            
            // 1. Carregar domínios da tabela email_domains (Histórico / Múltiplos)
            const res = await getEmailDomains(tenantId)
            if (res.success && res.data) {
                domainsList = res.data.filter((d: any) => d.status === 'verified').map((d: any) => ({ domain: d.domain }))
            }
            
            // 2. Carregar o domínio primário do próprio tenant
            try {
                const supabase = createClient()
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('custom_domain, email_domain_verified')
                    .eq('id', tenantId)
                    .single()
                
                if (tenant?.custom_domain && tenant?.email_domain_verified) {
                    if (!domainsList.some(d => d.domain === tenant.custom_domain)) {
                        domainsList.push({ domain: tenant.custom_domain })
                    }
                }
            } catch (err) {
                console.error('Erro ao obter o domínio do tenant:', err)
            }
            
            setVerifiedDomains(domainsList)
            setLoadingDomains(false)
        }
        loadDomains()
    }, [tenantId])

    // Carregar sugestões de autocomplete
    useEffect(() => {
        async function loadSuggestions() {
            const res = await getBulkFilterSuggestions(tenantId)
            if (res.success && res.data) {
                setFilterSuggestions(res.data)
            }
        }
        loadSuggestions()
    }, [tenantId])

    // Fechar dropdown de imóveis ao clicar fora
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(e.target as Node)) {
                setShowPropertySelector(false)
            }
        }
        if (showPropertySelector) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showPropertySelector])

    // Carregar imóveis quando abre o seletor
    const handleOpenPropertySelector = async () => {
        setShowPropertySelector(true)
        if (allProperties.length === 0) {
            setLoadingProperties(true)
            const res = await getProperties(tenantId)
            if (res.success && res.data) {
                setAllProperties(res.data as PropertyItem[])
            }
            setLoadingProperties(false)
        }
    }

    // Selecionar imóvel
    const handleSelectProperty = (property: PropertyItem) => {
        setSelectedProperty(property)
        setShowPropertySelector(false)
        setPropertySearchTerm('')
        // Pré-preencher assunto
        if (!subject) {
            setSubject(`Confira este imóvel: ${property.title}`)
        }
        // Reset config com todas as mídias selecionadas por padrão
        setPropertyConfig(prev => ({
            ...prev,
            selectedImages: property.images || [],
            selectedVideos: property.videos || [],
            selectedDocs: (property.documents || []) as PropertyDocument[]
        }))
        // Resetar seções
        setExpandedSections({
            basic: false,
            details: false,
            location: false,
            images: false,
            videos: false,
            docs: false
        })
    }

    // Desvincular imóvel
    const handleClearProperty = () => {
        setSelectedProperty(null)
        setPropertyConfig({
            title: true,
            price: true,
            showCondo: true,
            showIptu: true,
            description: 'full',
            location: 'approximate',
            showBedrooms: true,
            showSuites: true,
            showArea: true,
            showType: true,
            showAmenities: true,
            showSacada: true,
            showEscritorio: true,
            showDependencia: true,
            showObservations: true,
            selectedImages: [],
            selectedVideos: [],
            selectedDocs: []
        })
    }

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    // Filtrar imóveis pela busca
    const filteredProperties = useMemo(() => {
        if (!propertySearchTerm) return allProperties
        const q = propertySearchTerm.toLowerCase()
        return allProperties.filter(p =>
            p.title.toLowerCase().includes(q) ||
            (p.details?.endereco?.bairro || '').toLowerCase().includes(q) ||
            (p.details?.endereco?.cidade || '').toLowerCase().includes(q)
        )
    }, [allProperties, propertySearchTerm])

    // Memos para seleção de mídias
    const selectedImagesSet = useMemo(() => new Set(propertyConfig.selectedImages), [propertyConfig.selectedImages])
    const selectedVideosSet = useMemo(() => new Set(propertyConfig.selectedVideos), [propertyConfig.selectedVideos])
    const selectedDocsSet = useMemo(() => new Set(propertyConfig.selectedDocs.map(d => d.url)), [propertyConfig.selectedDocs])

    // Tipo legível do imóvel
    const getPropertyTypeLabel = (type: string | null) => {
        const map: Record<string, string> = {
            apartment: 'Apartamento',
            house: 'Casa',
            land: 'Terreno',
            commercial: 'Comercial',
        }
        return map[type || ''] || type || 'Imóvel'
    }

    const processImportedData = (data: any[]) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        
        const mapped = data.map(row => {
            const keys = Object.keys(row)
            const emailKey = keys.find(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('e-mail'))
            const nameKey = keys.find(k => k.toLowerCase().includes('nome') || k.toLowerCase().includes('name'))
            
            // Sanitizar email: limpar separadores, duplicatas, caracteres invisíveis
            let rawEmail = emailKey ? String(row[emailKey]).trim() : ''
            
            // Se contém ; ou , (separadores comuns em planilhas), pegar apenas o primeiro email válido
            if (rawEmail.includes(';') || rawEmail.includes(',')) {
                const parts = rawEmail.split(/[;,]/).map(p => p.trim()).filter(Boolean)
                rawEmail = parts.find(p => emailRegex.test(p.toLowerCase())) || ''
            }
            
            // Remover caracteres invisíveis e normalizar
            const cleanEmail = rawEmail.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim().toLowerCase()
            
            return {
                name: nameKey ? String(row[nameKey]).trim() : 'Cliente',
                email: cleanEmail
            }
        }).filter(r => r.email && emailRegex.test(r.email))

        setRecipients(prev => {
            const newRecipients = [...prev]
            mapped.forEach(m => {
                if (!newRecipients.some(nr => nr.email === m.email)) {
                    newRecipients.push(m)
                }
            })
            return newRecipients
        })
        toast.success(`${mapped.length} e-mails válidos importados da planilha.`)
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (evt) => {
            const bstr = evt.target?.result
            const wb = XLSX.read(bstr, { type: 'binary' })
            const ws = wb.Sheets[wb.SheetNames[0]] // Pega a primeira aba por padrão no local
            const data = XLSX.utils.sheet_to_json(ws) as any[]
            processImportedData(data)
        }
        reader.readAsBinaryString(file)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleGoogleSheetImport = async (selectedSheetName?: string) => {
        // Se veio de uma seleção do modal de abas
        if (selectedSheetName && pendingWorkbook) {
            const ws = pendingWorkbook.Sheets[selectedSheetName]
            const data = XLSX.utils.sheet_to_json(ws) as any[]
            processImportedData(data)
            setShowSheetPicker(false)
            setPendingWorkbook(null)
            setAvailableSheetNames([])
            setShowGoogleSheet(false)
            setGoogleSheetUrl('')
            return
        }

        if (!googleSheetUrl.trim()) {
            toast.error('Cole o link da planilha do Google Sheets.')
            return
        }

        setIsLoadingSheet(true)
        try {
            const result = await fetchGoogleSheetAsXlsx(googleSheetUrl.trim())
            if (!result.success || !result.xlsxBase64) {
                toast.error(result.error || 'Erro ao acessar a planilha.')
                return
            }

            const wb = XLSX.read(result.xlsxBase64, { type: 'base64' })

            if (wb.SheetNames.length > 1) {
                setAvailableSheetNames(wb.SheetNames)
                setPendingWorkbook(wb)
                setShowSheetPicker(true)
            } else {
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = XLSX.utils.sheet_to_json(ws) as any[]
                processImportedData(data)
                setShowGoogleSheet(false)
                setGoogleSheetUrl('')
            }
        } catch (error: any) {
            toast.error('Erro ao processar planilha: ' + error.message)
        } finally {
            setIsLoadingSheet(false)
        }
    }

    const handleEmailMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsMediaUploading(true)
        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `bulk-media/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('crm-attachments')
                .upload(filePath, file, {
                    contentType: file.type,
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('crm-attachments')
                .getPublicUrl(filePath)

            let type: 'image' | 'video' | 'document' = 'document'
            if (file.type.startsWith('image/')) type = 'image'
            else if (file.type.startsWith('video/')) type = 'video'

            setEmailMedia({ url: publicUrl, type, name: file.name })
            toast.success('Arquivo anexado com sucesso!')
        } catch (error: any) {
            toast.error('Erro no upload: ' + error.message)
        } finally {
            setIsMediaUploading(false)
        }
    }

    const handleFetchLeads = async () => {
        setIsFetchingLeads(true)
        
        const apiFilters: any = {}
        if (filters.clientName) apiFilters.clientName = filters.clientName
        if (filters.nameQuery) apiFilters.nameQuery = filters.nameQuery
        if (filters.propertyName) apiFilters.propertyName = filters.propertyName
        if (filters.propertyType) apiFilters.propertyType = filters.propertyType
        if (filters.minPrice) apiFilters.minPrice = parseCurrencyBRL(filters.minPrice)
        if (filters.maxPrice) apiFilters.maxPrice = parseCurrencyBRL(filters.maxPrice)
        if (filters.bedrooms && filters.bedrooms !== 'any') apiFilters.bedrooms = filters.bedrooms
        if (filters.location) apiFilters.location = filters.location

        const result = await getLeadsForEmailBulk(tenantId, apiFilters)
        
        if (result.success && result.data) {
            setRecipients(result.data)
            setShowFilters(false)
            if (result.data.length > 0) {
                toast.success(`${result.data.length} leads encontrados com e-mail válido.`)
            } else {
                toast.info('Nenhum lead encontrado com esses filtros e e-mail válido.')
            }
        } else {
            toast.error('Erro ao buscar leads.')
        }
        setIsFetchingLeads(false)
    }

    const removeRecipient = (emailToRemove: string) => {
        setRecipients(prev => prev.filter(r => r.email !== emailToRemove))
    }

    const clearRecipients = () => {
        setRecipients([])
    }

    const handleSend = async () => {
        if (!title || !subject || !senderName || !senderEmail) {
            toast.error('Preencha todos os campos da campanha.')
            return
        }
        if (!selectedProperty && !contentHtml) {
            toast.error('Escreva o corpo do e-mail ou vincule um imóvel.')
            return
        }
        if (recipients.length === 0) {
            toast.error('Selecione os destinatários (importe planilha ou busque leads).')
            return
        }

        setIsSending(true)
        setIsFinished(false)

        try {
            // Se um imóvel está vinculado, gerar HTML via server action
            let finalContentHtml = contentHtml

            if (selectedProperty) {
                const genResult = await generatePropertyEmailHtml({
                    tenantId,
                    propertyId: selectedProperty.id,
                    config: {
                        title: propertyConfig.title,
                        price: propertyConfig.price,
                        showCondo: propertyConfig.showCondo,
                        showIptu: propertyConfig.showIptu,
                        description: propertyConfig.description,
                        location: propertyConfig.location,
                        showBedrooms: propertyConfig.showBedrooms,
                        showSuites: propertyConfig.showSuites,
                        showArea: propertyConfig.showArea,
                        showType: propertyConfig.showType,
                        showAmenities: propertyConfig.showAmenities,
                        showSacada: propertyConfig.showSacada,
                        showEscritorio: propertyConfig.showEscritorio,
                        showDependencia: propertyConfig.showDependencia,
                        showObservations: propertyConfig.showObservations,
                        selectedImages: propertyConfig.selectedImages,
                        selectedVideos: propertyConfig.selectedVideos,
                        selectedDocs: propertyConfig.selectedDocs,
                    }
                })

                if (!genResult.success || !genResult.html) {
                    throw new Error(genResult.error || 'Erro ao gerar e-mail do imóvel')
                }

                finalContentHtml = genResult.html
            }

            const campaignRes = await createEmailBulkCampaign({
                tenantId, profileId, title, subject, contentHtml: finalContentHtml, senderName, senderEmail, totalRecipients: recipients.length
            })

            if (!campaignRes.success || !campaignRes.data) throw new Error(campaignRes.error || 'Erro ao criar campanha')
            
            const campaignId = campaignRes.data.id

            const batchRes = await sendBulkEmailsBatch({
                campaignId, tenantId, subject, contentHtml: finalContentHtml, senderName, senderEmail, recipients,
                attachment: emailMedia ? { url: emailMedia.url, name: emailMedia.name, type: emailMedia.type } : null
            })

            if (batchRes.success && batchRes.data) {
                setResults({
                    total: batchRes.data.totalAttempted,
                    success: batchRes.data.totalSuccess,
                    error: batchRes.data.totalErrors,
                    unsubscribed: batchRes.data.unsubscribedRemoved
                })
                setIsFinished(true)
                toast.success('Lote de e-mails processado com sucesso!')
            } else {
                throw new Error(batchRes.error)
            }

        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="bg-card p-6 rounded-lg border border-muted-foreground/30 shadow-sm space-y-6 animate-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
                {/* Lado Esquerdo: Composição */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="min-h-[32px] flex items-center">
                            <label className="text-sm font-bold text-foreground ml-1">Título Campanha</label>
                        </div>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Newsletter Janeiro" className="w-full h-10 px-3 text-sm font-medium bg-background border border-muted-foreground/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-foreground placeholder:text-muted-foreground/50" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="min-h-[32px] flex items-center">
                                <label className="text-sm font-bold text-foreground ml-1">Nome Remetente</label>
                            </div>
                            <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Ex: João - CRM LAX" className="w-full h-10 px-3 text-sm font-medium bg-background border border-muted-foreground/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-foreground placeholder:text-muted-foreground/50" />
                        </div>
                        <div className="space-y-2">
                            <div className="min-h-[32px] flex items-center">
                                <label className="text-sm font-bold text-foreground ml-1">E-mail Remetente</label>
                            </div>
                            <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="contato@seusite.com.br" className="w-full h-10 px-3 text-sm font-medium bg-background border border-muted-foreground/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-foreground placeholder:text-muted-foreground/50" />
                            {!loadingDomains && verifiedDomains.length > 0 && (
                                <p className="text-[10px] text-green-600 mt-1">Domínios validados: {verifiedDomains.map(d => d.domain).join(', ')}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="min-h-[32px] flex items-center">
                            <label className="text-sm font-bold text-foreground ml-1">Assunto E-mail</label>
                        </div>
                        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Nova oportunidade no litoral!" className="w-full h-10 px-3 text-sm font-medium bg-background border border-muted-foreground/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-foreground placeholder:text-muted-foreground/50" />
                    </div>

                    {/* === SELETOR DE IMÓVEL === */}
                    <div className="space-y-3">
                        {!selectedProperty ? (
                            <div className="relative" ref={propertyDropdownRef}>
                                <button
                                    onClick={handleOpenPropertySelector}
                                    className="w-full h-10 bg-foreground/5 border border-border/40 hover:border-foreground/30 rounded-lg text-sm font-bold text-foreground flex items-center justify-center gap-2 transition-all"
                                >
                                    <Building2 size={16} />
                                    Vincular Imóvel à Campanha
                                </button>

                                {showPropertySelector && (
                                    <div className="absolute z-30 top-full mt-1 left-0 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                                        <div className="p-3 border-b border-border">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={propertySearchTerm}
                                                    onChange={e => setPropertySearchTerm(e.target.value)}
                                                    placeholder="Buscar imóvel por nome, bairro ou cidade..."
                                                    className="w-full h-9 pl-8 pr-8 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs"
                                                    autoFocus
                                                />
                                                {propertySearchTerm && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPropertySearchTerm('')}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground outline-none"
                                                    >
                                                        <X size={14} strokeWidth={1.5} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="max-h-[280px] overflow-y-auto">
                                            {loadingProperties ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                                                </div>
                                            ) : filteredProperties.length > 0 ? (
                                                filteredProperties.map(prop => (
                                                    <button
                                                        key={prop.id}
                                                        onClick={() => handleSelectProperty(prop)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors text-left border-b border-border/30 last:border-0"
                                                    >
                                                        {prop.images && prop.images[0] ? (
                                                            <img src={prop.images[0]} className="w-12 h-12 rounded-lg object-cover shrink-0" alt="" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                                                                <Home size={18} className="text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-foreground truncate">{prop.title}</p>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {getPropertyTypeLabel(prop.type)}
                                                                {prop.price ? ` · R$ ${new Intl.NumberFormat('pt-BR').format(prop.price)}` : ''}
                                                            </p>
                                                            {prop.details?.endereco?.bairro && (
                                                                <p className="text-[10px] text-muted-foreground truncate">
                                                                    {prop.details.endereco.bairro}{prop.details.endereco.cidade ? `, ${prop.details.endereco.cidade}` : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center py-8">
                                                    <p className="text-xs text-muted-foreground">Nenhum imóvel encontrado.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* === IMÓVEL VINCULADO — PREVIEW + CONFIG === */
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Card de Preview */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-secondary/20">
                                    {selectedProperty.images && selectedProperty.images[0] ? (
                                        <img src={selectedProperty.images[0]} className="w-14 h-14 rounded-lg object-cover shrink-0" alt="" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                                            <Home size={20} className="text-secondary-foreground" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-secondary-foreground uppercase tracking-wider">Imóvel Vinculado</p>
                                        <p className="text-sm font-bold text-foreground truncate">{selectedProperty.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {getPropertyTypeLabel(selectedProperty.type)}
                                            {selectedProperty.price ? ` · R$ ${new Intl.NumberFormat('pt-BR').format(selectedProperty.price)}` : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleClearProperty}
                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                                        title="Desvincular imóvel"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Nota informativa */}
                                <p className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                    O corpo do e-mail será gerado automaticamente com os dados do imóvel. Use {'{nome}'} no assunto para personalizar.
                                </p>

                                {/* Configurações colapsáveis */}
                                <div className="space-y-0 rounded-xl overflow-hidden border border-border/40 bg-foreground/5">
                                    {/* Identificação e Valor */}
                                    <div>
                                        <button
                                            onClick={() => toggleSection('basic')}
                                            className="w-full flex items-center justify-between p-3 hover:bg-foreground/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Info size={16} className="text-foreground" />
                                                <span className="font-bold text-foreground text-sm">Identificação e valor</span>
                                            </div>
                                            {expandedSections.basic ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {expandedSections.basic && (
                                            <div className="px-3 pb-3 space-y-2">
                                                <FormCheckbox label="Nome do imóvel" checked={propertyConfig.title} onChange={e => setPropertyConfig({ ...propertyConfig, title: e.target.checked })} />
                                                <FormCheckbox label="Preço" checked={propertyConfig.price} onChange={e => setPropertyConfig({ ...propertyConfig, price: e.target.checked })} />
                                                <FormCheckbox label="Condomínio" checked={propertyConfig.showCondo} onChange={e => setPropertyConfig({ ...propertyConfig, showCondo: e.target.checked })} />
                                                <FormCheckbox label="IPTU" checked={propertyConfig.showIptu} onChange={e => setPropertyConfig({ ...propertyConfig, showIptu: e.target.checked })} />
                                                <FormCheckbox label="Descrição" checked={propertyConfig.description === 'full'} onChange={e => setPropertyConfig({ ...propertyConfig, description: e.target.checked ? 'full' : 'none' })} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Detalhes */}
                                    <div>
                                        <button
                                            onClick={() => toggleSection('details')}
                                            className="w-full flex items-center justify-between p-3 hover:bg-foreground/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Home size={16} className="text-foreground" />
                                                <span className="font-bold text-foreground text-sm">Informações</span>
                                            </div>
                                            {expandedSections.details ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {expandedSections.details && (
                                            <div className="px-3 pb-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <FormCheckbox label="Dormitórios" checked={propertyConfig.showBedrooms} onChange={e => setPropertyConfig({ ...propertyConfig, showBedrooms: e.target.checked })} />
                                                    <FormCheckbox label="Suítes" checked={propertyConfig.showSuites} onChange={e => setPropertyConfig({ ...propertyConfig, showSuites: e.target.checked })} />
                                                    <FormCheckbox label="Áreas" checked={propertyConfig.showArea} onChange={e => setPropertyConfig({ ...propertyConfig, showArea: e.target.checked })} />
                                                    <FormCheckbox label="Sacada" checked={propertyConfig.showSacada} onChange={e => setPropertyConfig({ ...propertyConfig, showSacada: e.target.checked })} />
                                                    <FormCheckbox label="Escritório" checked={propertyConfig.showEscritorio} onChange={e => setPropertyConfig({ ...propertyConfig, showEscritorio: e.target.checked })} />
                                                    <FormCheckbox label="Dependência" checked={propertyConfig.showDependencia} onChange={e => setPropertyConfig({ ...propertyConfig, showDependencia: e.target.checked })} />
                                                    <FormCheckbox label="Observações" checked={propertyConfig.showObservations} onChange={e => setPropertyConfig({ ...propertyConfig, showObservations: e.target.checked })} />
                                                    <FormCheckbox label="Área de Lazer" checked={propertyConfig.showAmenities} onChange={e => setPropertyConfig({ ...propertyConfig, showAmenities: e.target.checked })} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Localização */}
                                    <div>
                                        <button
                                            onClick={() => toggleSection('location')}
                                            className="w-full flex items-center justify-between p-3 hover:bg-foreground/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <MapPin size={16} className="text-foreground" />
                                                <span className="font-bold text-foreground text-sm">Localização</span>
                                            </div>
                                            {expandedSections.location ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {expandedSections.location && (
                                            <div className="px-3 pb-3 space-y-2">
                                                <FormCheckbox label="Endereço Exato" checked={propertyConfig.location === 'exact'} onChange={() => setPropertyConfig({ ...propertyConfig, location: 'exact' })} />
                                                <FormCheckbox label="Aproximada (Bairro)" checked={propertyConfig.location === 'approximate'} onChange={() => setPropertyConfig({ ...propertyConfig, location: 'approximate' })} />
                                                <FormCheckbox label="Não enviar" checked={propertyConfig.location === 'none'} onChange={() => setPropertyConfig({ ...propertyConfig, location: 'none' })} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Imagens */}
                                    <div>
                                        <button
                                            onClick={() => toggleSection('images')}
                                            className="w-full flex items-center justify-between p-3 hover:bg-foreground/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <ImageIcon size={16} className="text-foreground" />
                                                <span className="font-bold text-foreground text-sm">Imagens ({propertyConfig.selectedImages.length})</span>
                                            </div>
                                            {expandedSections.images ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {expandedSections.images && (
                                            <div className="px-3 pb-3 space-y-2">
                                                {(selectedProperty.images?.length ?? 0) > 0 ? (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                const allSelected = propertyConfig.selectedImages.length === (selectedProperty.images?.length ?? 0)
                                                                setPropertyConfig({ ...propertyConfig, selectedImages: allSelected ? [] : [...(selectedProperty.images || [])] })
                                                            }}
                                                            className="text-[10px] font-bold text-secondary-foreground hover:underline transition-colors"
                                                        >
                                                            {propertyConfig.selectedImages.length === (selectedProperty.images?.length ?? 0) ? 'Desmarcar todas' : 'Selecionar todas'}
                                                        </button>
                                                        <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto pr-1">
                                                            {(selectedProperty.images ?? []).map((img: string, idx: number) => (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        const newImages = selectedImagesSet.has(img)
                                                                            ? propertyConfig.selectedImages.filter(i => i !== img)
                                                                            : [...propertyConfig.selectedImages, img]
                                                                        setPropertyConfig({ ...propertyConfig, selectedImages: newImages })
                                                                    }}
                                                                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-opacity ${selectedImagesSet.has(img) ? 'ring-2 ring-[#FFE600] ring-inset' : 'opacity-60 hover:opacity-100'}`}
                                                                >
                                                                    <img src={img} className="w-full h-full object-cover" loading="lazy" alt={`Foto ${idx + 1}`} />
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
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">Nenhuma imagem disponível.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Vídeos */}
                                    <div>
                                        <button
                                            onClick={() => toggleSection('videos')}
                                            className="w-full flex items-center justify-between p-3 hover:bg-foreground/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Video size={16} className="text-foreground" />
                                                <span className="font-bold text-foreground text-sm">Vídeos ({propertyConfig.selectedVideos.length})</span>
                                            </div>
                                            {expandedSections.videos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {expandedSections.videos && (
                                            <div className="px-3 pb-3 space-y-2">
                                                {(selectedProperty.videos?.length ?? 0) > 0 ? (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                const allSelected = propertyConfig.selectedVideos.length === (selectedProperty.videos?.length ?? 0)
                                                                setPropertyConfig({ ...propertyConfig, selectedVideos: allSelected ? [] : [...(selectedProperty.videos || [])] })
                                                            }}
                                                            className="text-[10px] font-bold text-secondary-foreground hover:underline transition-colors"
                                                        >
                                                            {propertyConfig.selectedVideos.length === (selectedProperty.videos?.length ?? 0) ? 'Desmarcar todos' : 'Selecionar todos'}
                                                        </button>
                                                        {(selectedProperty.videos ?? []).map((video: string, idx: number) => (
                                                            <FormCheckbox
                                                                key={idx}
                                                                label={`Vídeo ${idx + 1}`}
                                                                checked={selectedVideosSet.has(video)}
                                                                onChange={e => {
                                                                    const newVideos = e.target.checked
                                                                        ? [...propertyConfig.selectedVideos, video]
                                                                        : propertyConfig.selectedVideos.filter(v => v !== video)
                                                                    setPropertyConfig({ ...propertyConfig, selectedVideos: newVideos })
                                                                }}
                                                            />
                                                        ))}
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">Nenhum vídeo disponível.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Documentos */}
                                    <div>
                                        <button
                                            onClick={() => toggleSection('docs')}
                                            className="w-full flex items-center justify-between p-3 hover:bg-foreground/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText size={16} className="text-foreground" />
                                                <span className="font-bold text-foreground text-sm">Documentos ({propertyConfig.selectedDocs.length})</span>
                                            </div>
                                            {expandedSections.docs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {expandedSections.docs && (
                                            <div className="px-3 pb-3 space-y-2">
                                                {(selectedProperty.documents?.length ?? 0) > 0 ? (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                const allSelected = propertyConfig.selectedDocs.length === (selectedProperty.documents?.length ?? 0)
                                                                setPropertyConfig({ ...propertyConfig, selectedDocs: allSelected ? [] : [...(selectedProperty.documents || [])] as PropertyDocument[] })
                                                            }}
                                                            className="text-[10px] font-bold text-secondary-foreground hover:underline transition-colors"
                                                        >
                                                            {propertyConfig.selectedDocs.length === (selectedProperty.documents?.length ?? 0) ? 'Desmarcar todos' : 'Selecionar todos'}
                                                        </button>
                                                        {(selectedProperty.documents ?? []).map((doc: PropertyDocument, idx: number) => (
                                                            <FormCheckbox
                                                                key={idx}
                                                                label={doc.name || `Documento ${idx + 1}`}
                                                                checked={selectedDocsSet.has(doc.url)}
                                                                onChange={e => {
                                                                    const newDocs = e.target.checked
                                                                        ? [...propertyConfig.selectedDocs, doc]
                                                                        : propertyConfig.selectedDocs.filter(d => d.url !== doc.url)
                                                                    setPropertyConfig({ ...propertyConfig, selectedDocs: newDocs })
                                                                }}
                                                            />
                                                        ))}
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">Nenhum documento disponível.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Resumo das configurações escolhidas */}
                                <div className="bg-card p-3 rounded-xl border border-border/40 space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Resumo do E-mail</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                        {propertyConfig.title && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Título</span>
                                        )}
                                        {propertyConfig.price && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Preço</span>
                                        )}
                                        {propertyConfig.showCondo && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Condomínio</span>
                                        )}
                                        {propertyConfig.showIptu && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> IPTU</span>
                                        )}
                                        {propertyConfig.description === 'full' && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Descrição</span>
                                        )}
                                        {propertyConfig.location !== 'none' && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Localização {propertyConfig.location === 'exact' ? '(exata)' : '(bairro)'}</span>
                                        )}
                                        {propertyConfig.showBedrooms && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Dormitórios</span>
                                        )}
                                        {propertyConfig.showSuites && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Suítes</span>
                                        )}
                                        {propertyConfig.showArea && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Área</span>
                                        )}
                                        {propertyConfig.selectedImages.length > 0 && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> {propertyConfig.selectedImages.length} foto{propertyConfig.selectedImages.length > 1 ? 's' : ''}</span>
                                        )}
                                        {propertyConfig.selectedVideos.length > 0 && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> {propertyConfig.selectedVideos.length} vídeo{propertyConfig.selectedVideos.length > 1 ? 's' : ''}</span>
                                        )}
                                        {propertyConfig.selectedDocs.length > 0 && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> {propertyConfig.selectedDocs.length} doc{propertyConfig.selectedDocs.length > 1 ? 's' : ''}</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">Estas informações serão incluídas automaticamente no corpo do e-mail.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Editor de HTML (oculto quando imóvel vinculado) */}
                    {!selectedProperty && (
                        <div className="space-y-2">
                            <div className="min-h-[32px] flex items-center">
                                <label className="text-sm font-bold text-foreground ml-1">Mensagem</label>
                            </div>
                            <FormRichTextarea 
                                value={contentHtml} 
                                onChange={setContentHtml} 
                                placeholder="Olá {nome}, tudo bem? Confira esta oportunidade..." 
                            />
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 italic"><Info className="inline w-3 h-3"/>Use {'{nome}'} ou {'{primeiro_nome}'} para personalizar.</p>
                        </div>
                    )}
                </div>

                {/* Lado Direito: Destinatários e Envio */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="min-h-[32px] flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground ml-1">
                                Destinatários ({recipients.length})
                            </h3>
                            {recipients.length > 0 && (
                                <button onClick={clearRecipients} className="text-xs text-red-500 hover:text-red-600 font-bold">
                                    Limpar Lista
                                </button>
                            )}
                        </div>
                        
                        {!showFilters && recipients.length === 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
                                <button 
                                    onClick={() => setShowFilters(true)}
                                    className="flex flex-row md:flex-col items-center justify-center gap-3 p-3 md:p-5 bg-background rounded-lg border border-muted-foreground/30 hover:border-muted-foreground/50 transition-all text-muted-foreground group text-center"
                                >
                                    <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-card flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Filter className="text-foreground" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-foreground">Leads</p>
                                        <p className="text-[10px]">Filtrar e puxar</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-row md:flex-col items-center justify-center gap-3 p-3 md:p-5 bg-background rounded-lg border border-muted-foreground/30 hover:border-muted-foreground/50 transition-all text-muted-foreground group text-center"
                                >
                                    <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-card flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet className="text-foreground" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-foreground">Planilha</p>
                                        <p className="text-[10px]">Excel ou CSV</p>
                                    </div>
                                    <input type="file" accept=".csv,.xlsx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                </button>

                                <button 
                                    onClick={() => setShowGoogleSheet(!showGoogleSheet)}
                                    className={`flex flex-row md:flex-col items-center justify-center gap-3 p-3 md:p-5 rounded-lg border transition-all text-muted-foreground group text-center ${
                                        showGoogleSheet 
                                            ? 'bg-background border-muted-foreground/50' 
                                            : 'bg-background border-muted-foreground/30 hover:border-muted-foreground/50'
                                    }`}
                                >
                                    <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-card flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Globe className="text-[#0F9D58]" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-foreground">Google Sheets</p>
                                        <p className="text-[10px]">Colar link</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {showGoogleSheet && (
                            <div className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-4 mb-4 shrink-0 relative animate-in zoom-in-95 duration-200">
                                <button onClick={() => setShowGoogleSheet(false)} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground">
                                    <X size={16} />
                                </button>
                                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Importar Google Sheets</h4>
                                
                                <div className="space-y-3">
                                    <input type="text" placeholder="Cole o link da planilha aqui..." value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                    <button onClick={() => handleGoogleSheetImport()} disabled={isLoadingSheet} className="w-full h-9 bg-foreground text-background font-bold text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors">
                                        {isLoadingSheet ? <Loader2 size={14} className="animate-spin" /> : 'Importar Dados'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Modal de seleção de aba */}
                        {showSheetPicker && availableSheetNames.length > 0 && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
                                <div className="bg-card w-[400px] max-h-[500px] rounded-xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                                                <FileSpreadsheet size={20} className="text-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-foreground">Selecionar Aba</h3>
                                                <p className="text-[10px] text-muted-foreground">Planilha com {availableSheetNames.length} abas detectadas</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setShowSheetPicker(false); setPendingWorkbook(null); setAvailableSheetNames([]); }}
                                            className="w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Escolha a aba para importar</p>
                                        {availableSheetNames.map((name, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleGoogleSheetImport(name)}
                                                className="w-full flex items-center gap-3 p-3 bg-foreground/5 border border-border/40 rounded-lg hover:bg-foreground/10 transition-colors group text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{name}</p>
                                                    <p className="text-[10px] text-muted-foreground">Aba {i + 1} de {availableSheetNames.length}</p>
                                                </div>
                                                <ChevronDown size={14} className="text-muted-foreground -rotate-90" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-3 border-t border-border">
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Info size={10} />
                                            Clique na aba desejada para importar os contatos
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showFilters && (
                            <div className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-4 mb-4 shrink-0 relative animate-in zoom-in-95 duration-200">
                                <button onClick={() => setShowFilters(false)} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground">
                                    <X size={16} />
                                </button>
                                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Filtros de Leads</h4>
                                
                                <div className="space-y-3">
                                    <AutocompleteInput placeholder="Nome do Cliente" value={filters.clientName} onChange={v => setFilters({...filters, clientName: v})} suggestions={filterSuggestions.clientNames} />
                                    <AutocompleteInput placeholder="Nome do Lead" value={filters.nameQuery} onChange={v => setFilters({...filters, nameQuery: v})} suggestions={filterSuggestions.leadNames} />
                                    <AutocompleteInput placeholder="Nome do Imóvel" value={filters.propertyName} onChange={v => setFilters({...filters, propertyName: v})} suggestions={filterSuggestions.propertyNames} />
                                    <select value={filters.bedrooms} onChange={e => setFilters({...filters, bedrooms: e.target.value})} className="appearance-none w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs">
                                        <option value="any">Qualquer dormitório</option>
                                        {filterSuggestions.bedroomOptions.length > 0 ? (
                                            filterSuggestions.bedroomOptions.map(b => (
                                                <option key={b} value={b}>{b} {parseInt(b) === 1 ? 'Dormitório' : 'Dormitórios'}</option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="1">1 Dormitório</option>
                                                <option value="2">2 Dormitórios</option>
                                                <option value="3">3 Dormitórios</option>
                                                <option value="4+">4+ Dormitórios</option>
                                            </>
                                        )}
                                    </select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="text" placeholder="Valor Mínimo" value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: formatCurrencyBRL(e.target.value)})} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                        <input type="text" placeholder="Valor Máximo" value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: formatCurrencyBRL(e.target.value)})} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                    </div>
                                    <AutocompleteInput placeholder="Localização" value={filters.location} onChange={v => setFilters({...filters, location: v})} suggestions={filterSuggestions.locations} />
                                </div>

                                <button onClick={handleFetchLeads} disabled={isFetchingLeads} className="w-full h-9 bg-secondary text-secondary-foreground font-bold text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-secondary/90 transition-colors">
                                    {isFetchingLeads ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar e Buscar'}
                                </button>
                            </div>
                        )}

                        {recipients.length > 0 && !showFilters && (
                            <div className="max-h-[400px] overflow-hidden flex flex-col min-h-0 bg-card rounded-lg border border-border">
                                <div className="p-2 border-b border-border bg-foreground/5 flex justify-between items-center shrink-0">
                                    <span className="text-xs font-bold text-muted-foreground px-2">Lista Selecionada</span>
                                    <button onClick={() => setShowFilters(true)} className="text-xs font-bold text-foreground hover:text-secondary-foreground transition-colors px-2">
                                        + Adicionar mais
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    {recipients.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 hover:bg-foreground/5 rounded-md group">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-foreground truncate">{r.name}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{r.email}</p>
                                            </div>
                                            <button onClick={() => removeRecipient(r.email)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all shrink-0">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Anexar Mídia ou Documento */}
                    <div className="space-y-2">
                        <div className="min-h-[32px] flex items-center">
                            <label className="text-sm font-bold text-foreground ml-1">Anexar Mídia ou Documento</label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <input 
                                type="file" 
                                ref={mediaInputRef} 
                                className="hidden" 
                                onChange={handleEmailMediaUpload}
                                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                            />
                            {emailMedia ? (
                                <div className="relative group w-full">
                                    {emailMedia.type === 'image' ? (
                                        <div className="relative max-h-[180px] rounded-lg overflow-hidden border border-border/40 shadow-sm bg-foreground/5 flex items-center justify-center">
                                            <img src={emailMedia.url} alt="Preview" className="max-h-[180px] w-auto object-contain" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white text-xs font-bold">{emailMedia.name}</p>
                                            </div>
                                        </div>
                                    ) : emailMedia.type === 'video' ? (
                                        <div className="relative max-h-[180px] rounded-lg overflow-hidden border border-border/40 shadow-sm bg-black flex items-center justify-center">
                                            <video 
                                                src={emailMedia.url} 
                                                className="max-h-[180px] w-auto object-contain opacity-80"
                                                controls={false}
                                                muted
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                                                    <Video size={24} />
                                                </div>
                                            </div>
                                            <div className="absolute bottom-3 left-3">
                                                <p className="text-white text-[10px] font-bold bg-black/40 px-2 py-1 rounded backdrop-blur-sm truncate max-w-[200px]">{emailMedia.name}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 p-5 bg-foreground/5 rounded-lg border-2 border-dashed border-border/40 w-full group-hover:bg-foreground/10 transition-colors">
                                            <div className="w-14 h-14 rounded-lg bg-card shadow-sm flex items-center justify-center text-foreground border border-border/40">
                                                <FileText size={32} strokeWidth={1.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">{emailMedia.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">Documento • PDF/Excel</p>
                                            </div>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setEmailMedia(null)}
                                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all hover:scale-110 z-10"
                                        title="Remover anexo"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => mediaInputRef.current?.click()}
                                    disabled={isMediaUploading}
                                    className="flex-1 flex flex-col items-center justify-center gap-2 p-6 bg-background border border-muted-foreground/30 rounded-lg hover:border-accent-icon hover:bg-accent-icon/5 transition-all text-muted-foreground hover:text-foreground group"
                                >
                                    {isMediaUploading ? (
                                        <Loader2 className="animate-spin text-foreground" size={24} />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-accent-icon/20 transition-colors">
                                                <ImageIcon size={20} />
                                            </div>
                                            <span className="text-xs font-bold">Adicionar Foto, Vídeo ou PDF</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações e Resultados — fora do grid, largura total */}
            <div className="pt-6 border-t border-border/40 flex flex-col gap-4">
                {isFinished && results && (
                    <div className="p-4 bg-foreground/5 rounded-lg border border-border/40 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground">Envio Finalizado</p>
                                <p className="text-[10px] text-muted-foreground">{results.success} enviados, {results.error} falhas, {results.unsubscribed} opt-out.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsFinished(false)}
                            className="text-[10px] font-bold text-foreground hover:underline"
                        >
                            Fechar Resumo
                        </button>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={handleSend}
                        disabled={isSending || recipients.length === 0}
                        className={`w-full h-12 text-sm font-bold bg-secondary border-none text-secondary-foreground hover:bg-secondary/90 transition-all transform active:scale-[0.99] rounded-lg shadow-sm flex items-center justify-center gap-2 ${recipients.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSending ? (
                            <><Loader2 className="animate-spin" size={20} /> Processando Lote...</>
                        ) : (
                            <>Disparar Campanha para {recipients.length} Contatos</>
                        )}
                    </button>
                </div>
            </div>

            {/* Histórico de Campanhas — dentro do card, igual ao WhatsApp */}
            <div className="pt-4 border-t border-border/40">
                <EmailBulkHistory tenantId={tenantId} />
            </div>
        </div>
    )
}
