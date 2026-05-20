'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { Search, Mail, MessageCircle, Loader2, User, CheckCircle2, ChevronDown, ChevronUp, Image as ImageIcon, Video, FileText, MapPin, Info, Home } from 'lucide-react'
import { getPipelineData, createLead } from '@/app/_actions/leads'
import { sendPropertyEmail, logInteraction } from '@/app/_actions/messaging'
import { getProfile } from '@/app/_actions/profile'
import { toast } from 'sonner'
import { formatPhone } from '@/lib/utils/phone'
import { getPropertyUrl } from '@/lib/utils/url'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, ArrowLeft, Check } from 'lucide-react'
import type { Lead } from '@/components/dashboard/leads/PipelineBoard'

interface PropertyDocument {
    name?: string
    url: string
}

interface PropertyDetailsAddress {
    bairro?: string
    cidade?: string
    rua?: string
    numero?: string
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
}

interface BrokerProfile {
    id: string
}

interface TenantRecord {
    slug?: string
    custom_domain?: string | null
    custom_domain_verified?: boolean
}

interface SendToLeadModalProps {
    isOpen: boolean
    onClose: () => void
    property: PropertyData
    tenantId: string
    tenantSlug: string
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
    
    // Configuration State
    const [config, setConfig] = useState<{
        title: boolean;
        price: boolean;
        description: 'full' | 'none';
        location: 'exact' | 'approximate' | 'none';
        showBedrooms: boolean;
        showSuites: boolean;
        showArea: boolean;
        showType: boolean;
        showAmenities: boolean;
        selectedImages: string[];
        selectedVideos: string[];
        selectedDocs: PropertyDocument[];
    }>({
        title: true,
        price: true,
        description: 'full',
        location: 'approximate',
        showBedrooms: true,
        showSuites: true,
        showArea: true,
        showType: true,
        showAmenities: true,
        selectedImages: [],
        selectedVideos: [],
        selectedDocs: []
    })

    // Reset config when modal opens or property changes
    useEffect(() => {
        if (isOpen && property) {
            setConfig(prev => ({
                ...prev,
                selectedImages: property.images || [],
                selectedVideos: property.videos || [],
                selectedDocs: property.documents || []
            }))
        }
    }, [isOpen, property])

    const [expandedSections, setExpandedSections] = useState({
        basic: false,
        details: false,
        location: false,
        images: false,
        videos: false,
        docs: false
    })

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const fetchTenant = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('tenants')
            .select('slug, custom_domain, custom_domain_verified')
            .eq('id', tenantId)
            .single()
        
        if (data) setTenant(data)
    }

    const fetchCurrentBroker = async () => {
        const { profile } = await getProfile()
        if (profile) {
            setCurrentBroker(profile)
        }
    }

    const fetchLeads = async () => {
        setIsLoading(true)
        const result = await getPipelineData(tenantId)
        if (result.success && result.data) {
            setLeads(result.data.leads)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        if (isOpen) {
            void fetchLeads()
            void fetchCurrentBroker()
            void fetchTenant()
        }
    }, [isOpen])

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
            documents: config.selectedDocs
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
        
        // Add display toggles (only if false, to keep URL short, but let's be explicit for now)
        if (!config.title) queryParams.set('ct', '0')
        if (!config.price) queryParams.set('cp', '0')
        if (config.description === 'none') queryParams.set('cd', 'n')
        if (config.location !== 'approximate') queryParams.set('cl', config.location === 'exact' ? 'e' : 'n')
        if (!config.showBedrooms) queryParams.set('cbr', '0')
        if (!config.showSuites) queryParams.set('cst', '0')
        if (!config.showArea) queryParams.set('car', '0')
        if (!config.showType) queryParams.set('cty', '0')
        if (!config.showAmenities) queryParams.set('cam', '0')
        
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
        let message = `Olá ${currentLead.name}! Tudo bem?\n\nEstou te enviando os detalhes deste imóvel que pode te interessar:\n\n`
        
        if (config.title) message += `*${property.title}*\n`
        if (config.price) message += `💰 Valor: R$ ${new Intl.NumberFormat('pt-BR').format(property.price)}\n`
        
        if (config.location !== 'none') {
            const bairro = property.details?.endereco?.bairro || ''
            const cidade = property.details?.endereco?.cidade || ''
            const rua = property.details?.endereco?.rua || ''
            const numero = property.details?.endereco?.numero || ''
            
            if (config.location === 'exact') {
                message += `📍 ${rua}, ${numero} - ${bairro}, ${cidade}\n`
            } else {
                message += `📍 ${bairro} - ${cidade}\n`
            }
        }

        const details = []
        if (config.showBedrooms && (property.details?.dormitorios || property.details?.quartos)) details.push(`${property.details.dormitorios || property.details.quartos} Dorms`)
        if (config.showSuites && property.details?.suites) details.push(`${property.details.suites} Suítes`)
        if (config.showArea && property.details?.area_privativa) details.push(`${property.details.area_privativa}m² privativos`)
        if (config.showType) details.push(`Tipo: ${property.type}`)
        if (config.showAmenities) {
            const amenityKeys = ['piscina', 'academia', 'espaco_gourmet', 'salao_festas', 'playground', 'brinquedoteca', 'churrasqueira', 'sauna', 'coworking', 'pet_place', 'quadra'];
            const hasAmenities = amenityKeys.some(k => property.details?.[k]);
            if (hasAmenities) details.push('Área de lazer');
        }
        
        if (details.length > 0) {
            message += `\n*Detalhes:* \n• ${details.join('\n• ')}\n`
        }

        if (config.description === 'full' && property.description) {
            message += `\n*Descrição:* \n${property.description}\n`
        }

        message += `\nConfira todas as fotos e detalhes aqui: ${propertyUrl}\n\nQualquer dúvida estou à disposição!`
        
        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
        
        window.open(whatsappUrl, '_blank')
        
        await logInteraction(currentLead.id, 'whatsapp', `Enviado link do property via WhatsApp: ${property.title}`)
        
        toast.success('WhatsApp aberto!')
        setSending(false)
        onClose()
    }

    const selectedImagesSet = useMemo(() => new Set(config.selectedImages), [config.selectedImages])
    const selectedVideosSet = useMemo(() => new Set(config.selectedVideos), [config.selectedVideos])
    const selectedDocsSet = useMemo(() => new Set(config.selectedDocs.map((d) => d.url)), [config.selectedDocs])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Enviar para Lead"
            size="md"
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
                                        onChange={(e) => setManualLead({...manualLead, name: e.target.value})}
                                    />
                                    <FormInput
                                        label="Telefone (WhatsApp)"
                                        placeholder="(00) 00000-0000"
                                        value={manualLead.phone}
                                        onChange={(e) => setManualLead({...manualLead, phone: e.target.value})}
                                    />
                                    <FormInput
                                        label="E-mail (Opcional)"
                                        placeholder="joao@exemplo.com"
                                        value={manualLead.email}
                                        onChange={(e) => setManualLead({...manualLead, email: e.target.value})}
                                    />
                                    
                                    <div className="pt-4 border-t">
                                        <p className="text-xs text-muted-foreground mb-4">O lead será cadastrado automaticamente ao enviar o imóvel.</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleSendEmail(null)}
                                                disabled={sending}
                                                className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-border hover:bg-blue-500/5 hover:border-blue-500/20 transition-all group"
                                            >
                                                <Mail size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                                <p className="font-bold text-foreground text-xs">E-mail</p>
                                            </button>
                                            <button
                                                onClick={() => handleSendWhatsApp(null)}
                                                disabled={sending}
                                                className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-border hover:bg-[#25D366]/5 hover:border-[#25D366]/20 transition-all group"
                                            >
                                                <MessageCircle size={16} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                                                <p className="font-bold text-foreground text-xs">WhatsApp</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <FormInput
                                                placeholder="Buscar lead por nome, email ou telefone..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                icon={Search}
                                                className="h-11"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setIsManualMode(true)
                                                setManualLead({ name: searchTerm, email: '', phone: '' })
                                            }}
                                            className="h-11 w-11 flex-shrink-0 flex items-center justify-center bg-[#FFE600] hover:bg-[#F2DB00] rounded-lg transition-all group shadow-sm hover:shadow"
                                            title="Novo Lead"
                                        >
                                            <UserPlus size={20} className="text-[#404F4F] transition-transform group-hover:scale-110" />
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
                                                    onClick={() => setSelectedLead(lead)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-all text-left group cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground group-hover:bg-foreground/10 transition-colors">
                                                        <User size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-foreground truncate">{lead.name}</p>
                                                        <p className="text-xs text-foreground truncate">{lead.email || 'Sem e-mail'}</p>
                                                        <p className="text-[10px] font-medium text-foreground">{formatPhone(lead.phone)}</p>
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
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FFE600]/10 border border-[#FFE600]/20">
                                <div className="w-12 h-12 rounded-full bg-[#FFE600]/20 flex items-center justify-center text-[#FFE600]">
                                    <User size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">Lead Selecionado</p>
                                    <p className="text-lg font-bold text-foreground">{selectedLead.name}</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedLead(null)}
                                    className="text-sm font-bold text-foreground hover:underline"
                                >
                                    Alterar
                                </button>
                            </div>

                            {/* Configuration Options */}
                            <div className="space-y-0 rounded-xl overflow-hidden bg-card">
                                {/* Basic Info Section */}
                                <div className="">
                                    <button 
                                        onClick={() => toggleSection('basic')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Info size={18} className="text-foreground" />
                                            <span className="font-bold text-foreground">Identificação e valor</span>
                                        </div>
                                        {expandedSections.basic ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.basic && (
                                        <div className="p-4 pt-0 space-y-3">
                                            <FormCheckbox 
                                                label="Título do Imóvel" 
                                                checked={config.title} 
                                                onChange={(e) => setConfig({...config, title: e.target.checked})} 
                                            />
                                            <FormCheckbox 
                                                label="Preço" 
                                                checked={config.price} 
                                                onChange={(e) => setConfig({...config, price: e.target.checked})} 
                                            />
                                            <FormCheckbox 
                                                label="Descrição" 
                                                checked={config.description === 'full'} 
                                                onChange={(e) => setConfig({...config, description: e.target.checked ? 'full' : 'none'})} 
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Details Section */}
                                <div className="">
                                    <button 
                                        onClick={() => toggleSection('details')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Home size={18} className="text-foreground" />
                                            <span className="font-bold text-foreground">Informações</span>
                                        </div>
                                        {expandedSections.details ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.details && (
                                        <div className="p-4 pt-0 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <FormCheckbox 
                                                    label="Dormitórios" 
                                                    checked={config.showBedrooms} 
                                                    onChange={(e) => setConfig({...config, showBedrooms: e.target.checked})} 
                                                />
                                                <FormCheckbox 
                                                    label="Suítes" 
                                                    checked={config.showSuites} 
                                                    onChange={(e) => setConfig({...config, showSuites: e.target.checked})} 
                                                />
                                                <FormCheckbox 
                                                    label="Área Privativa" 
                                                    checked={config.showArea} 
                                                    onChange={(e) => setConfig({...config, showArea: e.target.checked})} 
                                                />
                                                <FormCheckbox 
                                                    label="Tipo do Imóvel" 
                                                    checked={config.showType} 
                                                    onChange={(e) => setConfig({...config, showType: e.target.checked})} 
                                                />
                                                <FormCheckbox 
                                                    label="Área de Lazer" 
                                                    checked={config.showAmenities} 
                                                    onChange={(e) => setConfig({...config, showAmenities: e.target.checked})} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Location Section */}
                                <div className="">
                                    <button 
                                        onClick={() => toggleSection('location')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapPin size={18} className="text-foreground" />
                                            <span className="font-bold text-foreground">Localização</span>
                                        </div>
                                        {expandedSections.location ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.location && (
                                        <div className="p-4 pt-0">
                                            <div className="flex flex-col gap-3">
                                                <FormCheckbox 
                                                    label="Endereço Exato" 
                                                    checked={config.location === 'exact'} 
                                                    onChange={() => setConfig({...config, location: 'exact'})} 
                                                />
                                                <FormCheckbox 
                                                    label="Aproximada (Bairro)" 
                                                    checked={config.location === 'approximate'} 
                                                    onChange={() => setConfig({...config, location: 'approximate'})} 
                                                />
                                                <FormCheckbox 
                                                    label="Não enviar" 
                                                    checked={config.location === 'none'} 
                                                    onChange={() => setConfig({...config, location: 'none'})} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Media Sections (Images/Videos/Docs) */}
                                <div className="">
                                    <button 
                                        onClick={() => toggleSection('images')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ImageIcon size={18} className="text-foreground" />
                                            <span className="font-bold text-foreground">Imagens ({config.selectedImages.length})</span>
                                        </div>
                                        {expandedSections.images ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.images && (
                                        <div className="p-4 pt-0">
                                            {(property.images?.length ?? 0) > 0 ? (
                                                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                                    {(property.images ?? []).map((img: string, idx: number) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => {
                                                                const newImages = selectedImagesSet.has(img)
                                                                    ? config.selectedImages.filter((i: string) => i !== img)
                                                                    : [...config.selectedImages, img]
                                                                setConfig({...config, selectedImages: newImages})
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
                                                <p className="text-xs text-foreground italic">Nenhuma imagem disponível.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="">
                                    <button 
                                        onClick={() => toggleSection('videos')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Video size={18} className="text-foreground" />
                                            <span className="font-bold text-foreground">Vídeos ({config.selectedVideos.length})</span>
                                        </div>
                                        {expandedSections.videos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.videos && (
                                        <div className="p-4 pt-0 space-y-4">
                                            {(property.videos?.length ?? 0) > 0 ? (
                                                <div className="space-y-1">
                                                    {(property.videos ?? []).map((video: string, idx: number) => (
                                                        <FormCheckbox 
                                                            key={idx}
                                                            label={`Vídeo ${idx + 1}`}
                                                            checked={selectedVideosSet.has(video)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                const newVideos = checked
                                                                    ? [...config.selectedVideos, video]
                                                                    : config.selectedVideos.filter((v: string) => v !== video)
                                                                setConfig({...config, selectedVideos: newVideos})
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-foreground italic">Nenhum vídeo disponível.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="">
                                    <button 
                                        onClick={() => toggleSection('docs')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText size={18} className="text-foreground" />
                                            <span className="font-bold text-foreground">Documentos ({config.selectedDocs.length})</span>
                                        </div>
                                        {expandedSections.docs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.docs && (
                                        <div className="p-4 pt-0 space-y-4">
                                            {(property.documents?.length ?? 0) > 0 ? (
                                                <div className="space-y-1">
                                                    {(property.documents ?? []).map((doc: PropertyDocument, idx: number) => (
                                                        <FormCheckbox 
                                                            key={idx}
                                                            label={doc.name || `Documento ${idx + 1}`}
                                                            checked={selectedDocsSet.has(doc.url)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                const newDocs = checked
                                                                    ? [...config.selectedDocs, doc]
                                                                    : config.selectedDocs.filter((d) => d.url !== doc.url)
                                                                setConfig({...config, selectedDocs: newDocs})
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-foreground italic">Nenhum documento disponível.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {selectedLead && (
                    <div className="pt-4 mt-auto">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleSendEmail(selectedLead)}
                                disabled={sending || !selectedLead.email}
                                className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:bg-blue-500/5 hover:border-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                            >
                                <div className="w-7 h-7 rounded-full bg-blue-500/10 flex-shrink-0 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                    <Mail size={14} />
                                </div>
                                <div className="overflow-hidden min-w-0 flex-1">
                                    <p className="font-bold text-foreground text-xs truncate">E-mail</p>
                                    <p className="text-[9px] text-foreground truncate">{selectedLead.email || 'Sem e-mail'}</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSendWhatsApp(selectedLead)}
                                disabled={sending || !selectedLead.phone}
                                className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:bg-[#25D366]/5 hover:border-[#25D366]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                            >
                                <div className="w-7 h-7 rounded-full bg-[#25D366]/10 flex-shrink-0 flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform">
                                    <MessageCircle size={14} />
                                </div>
                                <div className="overflow-hidden min-w-0 flex-1">
                                    <p className="font-bold text-foreground text-xs truncate">WhatsApp</p>
                                    <p className="text-[9px] text-foreground truncate">{formatPhone(selectedLead.phone) || 'Sem telefone'}</p>
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
