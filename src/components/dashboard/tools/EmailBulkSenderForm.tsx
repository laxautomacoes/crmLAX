'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { FormRichTextarea } from '@/components/shared/forms/FormRichTextarea'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { Send, Users, FileText, CheckCircle2, Loader2, Info, Filter, X, Trash2, Home, Search, Image as ImageIcon, Video, MapPin, ChevronDown, ChevronUp, Building2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createEmailBulkCampaign, sendBulkEmailsBatch, getLeadsForEmailBulk, generatePropertyEmailHtml } from '@/app/_actions/email-bulk'
import { getEmailDomains } from '@/app/_actions/email-domains'
import { getProperties } from '@/app/_actions/properties'
import { fetchGoogleSheetData, fetchGoogleSheetTabs } from '@/app/_actions/whatsapp-bulk'
import * as XLSX from 'xlsx'
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency'

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
        nameQuery: '',
        propertyName: '',
        propertyType: '',
        minPrice: '',
        maxPrice: '',
        bedrooms: 'any'
    })
    const [isFetchingLeads, setIsFetchingLeads] = useState(false)

    // Google Sheets States
    const [showGoogleSheet, setShowGoogleSheet] = useState(false)
    const [googleSheetUrl, setGoogleSheetUrl] = useState('')
    const [isLoadingSheet, setIsLoadingSheet] = useState(false)
    const [googleSheetTabs, setGoogleSheetTabs] = useState<{name: string, gid: string}[]>([])
    const [pendingGoogleSheetId, setPendingGoogleSheetId] = useState('')

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

    const fileInputRef = useRef<HTMLInputElement>(null)
    const propertyDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        async function loadDomains() {
            const res = await getEmailDomains(tenantId)
            if (res.success && res.data) {
                setVerifiedDomains(res.data.filter((d: any) => d.status === 'verified'))
            }
            setLoadingDomains(false)
        }
        loadDomains()
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
        const mapped = data.map(row => {
            const keys = Object.keys(row)
            const emailKey = keys.find(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('e-mail'))
            const nameKey = keys.find(k => k.toLowerCase().includes('nome') || k.toLowerCase().includes('name'))
            
            return {
                name: nameKey ? row[nameKey] : 'Cliente',
                email: emailKey ? String(row[emailKey]).trim().toLowerCase() : ''
            }
        }).filter(r => r.email && r.email.includes('@'))

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

    const handleGoogleSheetImport = async (gid?: string) => {
        if (!googleSheetUrl.trim()) {
            toast.error('Cole o link da planilha do Google Sheets.')
            return
        }

        setIsLoadingSheet(true)
        try {
            const sheetIdMatch = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
            const sheetId = sheetIdMatch?.[1] || ''

            if (!gid && sheetId) {
                try {
                    const tabsResult = await fetchGoogleSheetTabs(googleSheetUrl.trim())
                    if (tabsResult.success && tabsResult.tabs && tabsResult.tabs.length > 1) {
                        setGoogleSheetTabs(tabsResult.tabs)
                        setPendingGoogleSheetId(sheetId)
                        setIsLoadingSheet(false)
                        return
                    }
                } catch {}
            }

            const fetchUrl = gid && pendingGoogleSheetId 
                ? `https://docs.google.com/spreadsheets/d/${pendingGoogleSheetId}/edit#gid=${gid}`
                : googleSheetUrl.trim();

            const result = await fetchGoogleSheetData(fetchUrl)
            if (!result.success || !result.csvData) {
                toast.error(result.error || 'Erro ao acessar a planilha.')
                return
            }

            const wb = XLSX.read(result.csvData, { type: 'string' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json(ws) as any[]

            processImportedData(data)
            setShowGoogleSheet(false)
            setGoogleSheetUrl('')
            setGoogleSheetTabs([])
            setPendingGoogleSheetId('')
        } catch (error: any) {
            toast.error('Erro ao processar planilha: ' + error.message)
        } finally {
            setIsLoadingSheet(false)
        }
    }

    const handleFetchLeads = async () => {
        setIsFetchingLeads(true)
        
        const apiFilters: any = {}
        if (filters.nameQuery) apiFilters.nameQuery = filters.nameQuery
        if (filters.propertyName) apiFilters.propertyName = filters.propertyName
        if (filters.propertyType) apiFilters.propertyType = filters.propertyType
        if (filters.minPrice) apiFilters.minPrice = parseCurrencyBRL(filters.minPrice)
        if (filters.maxPrice) apiFilters.maxPrice = parseCurrencyBRL(filters.maxPrice)
        if (filters.bedrooms && filters.bedrooms !== 'any') apiFilters.bedrooms = filters.bedrooms

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
                campaignId, tenantId, subject, contentHtml: finalContentHtml, senderName, senderEmail, recipients
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
        <div className="bg-card p-6 rounded-xl border border-muted-foreground/30 shadow-sm space-y-6 animate-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
                {/* Lado Esquerdo: Composição */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-foreground">Título Interno da Campanha</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Newsletter Janeiro" className="w-full h-10 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 text-sm" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-foreground">Nome do Remetente</label>
                            <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Ex: João - CRM LAX" className="w-full h-10 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-foreground">E-mail do Remetente</label>
                            <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="contato@seusite.com.br" className="w-full h-10 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 text-sm" />
                            {!loadingDomains && verifiedDomains.length > 0 && (
                                <p className="text-[10px] text-green-600 mt-1">Domínios validados: {verifiedDomains.map(d => d.domain).join(', ')}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-bold text-foreground">Assunto do E-mail</label>
                        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Nova oportunidade no litoral!" className="w-full h-10 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 text-sm" />
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
                                                    className="w-full h-9 pl-8 pr-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs"
                                                    autoFocus
                                                />
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
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-foreground">Corpo do E-mail (HTML permitido)</label>
                            <FormRichTextarea 
                                value={contentHtml} 
                                onChange={setContentHtml} 
                                placeholder="<p>Olá {nome}, temos novidades...</p>" 
                            />
                            <p className="text-[10px] text-muted-foreground"><Info className="inline w-3 h-3 mr-1"/>Use {'{nome}'} para personalizar. Você pode usar tags HTML básicas (&lt;b&gt;, &lt;p&gt;, &lt;a&gt;, &lt;br&gt;).</p>
                        </div>
                    )}
                </div>

                {/* Lado Direito: Destinatários e Envio */}
                <div className="space-y-6">
                    <div className="bg-foreground/5 p-4 rounded-xl border border-border/40 flex flex-col h-[500px]">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Users size={16} />
                                Destinatários ({recipients.length})
                            </h3>
                            {recipients.length > 0 && (
                                <button onClick={clearRecipients} className="text-xs text-red-500 hover:text-red-600 font-bold">
                                    Limpar Lista
                                </button>
                            )}
                        </div>
                        
                        {!showFilters && recipients.length === 0 && (
                            <div className="flex flex-col gap-2 shrink-0">
                                <button onClick={() => setShowFilters(true)} className="w-full h-10 bg-card border border-border hover:bg-muted text-sm font-bold rounded-lg transition-colors text-foreground flex items-center justify-center gap-2">
                                    <Filter size={16} /> Filtrar e Puxar Leads
                                </button>
                                <input type="file" accept=".csv,.xlsx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full h-10 bg-card border border-border hover:bg-muted text-sm font-bold rounded-lg transition-colors text-foreground flex items-center justify-center gap-2">
                                    <FileText size={16} /> Importar Planilha (Excel/CSV)
                                </button>
                                <button onClick={() => setShowGoogleSheet(true)} className="w-full h-10 bg-card border border-border hover:bg-muted text-sm font-bold rounded-lg transition-colors text-foreground flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14.77 5.88l-4.5 7.79 2.27 3.93 6.77-11.72h-4.54zm-9.54 0l-2.27 3.93 6.77 11.72 2.27-3.93-6.77-11.72zm11.81 15.65H3.5l2.27 3.93h13.54l2.27-3.93h-4.54z"/></svg> Importar Google Drive
                                </button>
                            </div>
                        )}

                        {showGoogleSheet && (
                            <div className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-4 mb-4 shrink-0 relative animate-in zoom-in-95 duration-200">
                                <button onClick={() => setShowGoogleSheet(false)} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground">
                                    <X size={16} />
                                </button>
                                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Importar Google Sheets</h4>
                                
                                {googleSheetTabs.length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-xs text-muted-foreground">Encontramos várias abas na planilha. Selecione uma para importar:</p>
                                        <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto">
                                            {googleSheetTabs.map((tab, i) => (
                                                <button key={i} onClick={() => handleGoogleSheetImport(tab.gid)} disabled={isLoadingSheet} className="w-full h-9 bg-foreground/5 border border-border/40 hover:bg-muted text-xs font-bold rounded-lg transition-colors text-left px-3">
                                                    {isLoadingSheet ? <Loader2 size={14} className="animate-spin inline mr-2" /> : <FileText size={14} className="inline mr-2" />}
                                                    {tab.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <input type="text" placeholder="Cole o link da planilha aqui..." value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                        <button onClick={() => handleGoogleSheetImport()} disabled={isLoadingSheet} className="w-full h-9 bg-foreground text-background font-bold text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors">
                                            {isLoadingSheet ? <Loader2 size={14} className="animate-spin" /> : 'Importar Dados'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {showFilters && (
                            <div className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-4 mb-4 shrink-0 relative animate-in zoom-in-95 duration-200">
                                <button onClick={() => setShowFilters(false)} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground">
                                    <X size={16} />
                                </button>
                                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Filtros de Leads</h4>
                                
                                <div className="space-y-3">
                                    <input type="text" placeholder="Buscar por Nome do Lead" value={filters.nameQuery} onChange={e => setFilters({...filters, nameQuery: e.target.value})} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                    <input type="text" placeholder="Buscar por Nome do Imóvel" value={filters.propertyName} onChange={e => setFilters({...filters, propertyName: e.target.value})} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                    
                                    <select value={filters.propertyType} onChange={e => setFilters({...filters, propertyType: e.target.value})} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs appearance-none">
                                        <option value="">Qualquer tipo de imóvel</option>
                                        <option value="apartment">Apartamento</option>
                                        <option value="house">Casa</option>
                                        <option value="land">Terreno / Lote</option>
                                        <option value="commercial">Comercial</option>
                                    </select>

                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="text" placeholder="Valor Mínimo" value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: formatCurrencyBRL(e.target.value)})} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                        <input type="text" placeholder="Valor Máximo" value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: formatCurrencyBRL(e.target.value)})} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                    </div>

                                    <select value={filters.bedrooms} onChange={e => setFilters({...filters, bedrooms: e.target.value})} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs appearance-none">
                                        <option value="any">Qualquer dormitório</option>
                                        <option value="1">1 Quarto</option>
                                        <option value="2">2 Quartos</option>
                                        <option value="3+">3+ Quartos</option>
                                    </select>
                                </div>

                                <button onClick={handleFetchLeads} disabled={isFetchingLeads} className="w-full h-9 bg-foreground text-background font-bold text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors">
                                    {isFetchingLeads ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar e Buscar'}
                                </button>
                            </div>
                        )}

                        {recipients.length > 0 && !showFilters && (
                            <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-card rounded-lg border border-border">
                                <div className="p-2 border-b border-border bg-foreground/5 flex justify-between items-center shrink-0">
                                    <span className="text-xs font-bold text-muted-foreground px-2">Lista Selecionada</span>
                                    <button onClick={() => setShowFilters(true)} className="text-xs font-bold text-foreground hover:text-secondary-foreground transition-colors px-2">
                                        + Adicionar mais
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
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

                    <div className="bg-foreground/5 p-4 rounded-xl border border-border/40">
                        {isFinished && results ? (
                            <div className="space-y-3 animate-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                    <CheckCircle2 size={20} />
                                    Processo Concluído!
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-card p-3 rounded-xl border border-border/40 text-center">
                                        <p className="text-[10px] uppercase text-muted-foreground font-black tracking-wider mb-1">Tentativas</p>
                                        <p className="font-black text-foreground text-lg">{results.total}</p>
                                    </div>
                                    <div className="bg-card p-3 rounded-xl border border-border/40 text-center">
                                        <p className="text-[10px] uppercase text-green-600 font-black tracking-wider mb-1">Sucessos</p>
                                        <p className="font-black text-green-600 text-lg">{results.success}</p>
                                    </div>
                                    <div className="bg-card p-3 rounded-xl border border-border/40 text-center">
                                        <p className="text-[10px] uppercase text-red-500 font-black tracking-wider mb-1">Erros</p>
                                        <p className="font-black text-red-500 text-lg">{results.error}</p>
                                    </div>
                                    <div className="bg-card p-3 rounded-xl border border-border/40 text-center">
                                        <p className="text-[10px] uppercase text-orange-500 font-black tracking-wider mb-1">Opt-out</p>
                                        <p className="font-black text-orange-500 text-lg">{results.unsubscribed}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleSend}
                                disabled={isSending || recipients.length === 0}
                                className="w-full h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 font-black rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                            >
                                {isSending ? (
                                    <><Loader2 className="animate-spin" size={20} /> Processando Lote...</>
                                ) : (
                                    <><Send size={20} /> Disparar Campanha</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
