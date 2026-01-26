'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { Search, Mail, MessageCircle, Send, Loader2, User, CheckCircle2, ChevronDown, ChevronUp, Image as ImageIcon, Video, FileText, MapPin, Info, Home } from 'lucide-react'
import { getPipelineData } from '@/app/_actions/leads'
import { sendPropertyEmail, logInteraction } from '@/app/_actions/messaging'
import { getProfile } from '@/app/_actions/profile'
import { toast } from 'sonner'
import { formatPhone } from '@/lib/utils/phone'

interface SendToLeadModalProps {
    isOpen: boolean
    onClose: () => void
    property: any
    tenantId: string
    tenantSlug: string
}

export function SendToLeadModal({ isOpen, onClose, property, tenantId, tenantSlug }: SendToLeadModalProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [leads, setLeads] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedLead, setSelectedLead] = useState<any>(null)
    const [sending, setSending] = useState(false)
    const [currentBroker, setCurrentBroker] = useState<any>(null)
    
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
        selectedImages: string[];
        selectedVideos: string[];
        selectedDocs: any[];
    }>({
        title: true,
        price: true,
        description: 'full',
        location: 'approximate',
        showBedrooms: true,
        showSuites: true,
        showArea: true,
        showType: true,
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
        basic: true,
        details: false,
        location: false,
        images: false,
        videos: false,
        docs: false
    })

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    useEffect(() => {
        if (isOpen) {
            fetchLeads()
            fetchCurrentBroker()
        }
    }, [isOpen])

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

    const filteredLeads = leads.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm)
    )

    const handleSendEmail = async (lead: any) => {
        if (!lead || !lead.email) {
            toast.error('Este lead não possui um e-mail válido')
            return
        }

        setSending(true)
        setSelectedLead(lead)
        const result = await sendPropertyEmail(lead.id, lead.email, property, {
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

    const handleSendWhatsApp = async (lead: any) => {
        if (!lead || !lead.phone) {
            toast.error('Este lead não possui um WhatsApp válido')
            return
        }

        setSending(true)
        const cleanPhone = lead.phone.replace(/\D/g, '')
        
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
        
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
            .map((doc: any) => (property.documents || []).findIndex((d: any) => d.url === doc.url))
            .filter(idx => idx !== -1)
        if (docIndices.length < (property.documents || []).length) {
            queryParams.set('cdoc', docIndices.join(','))
        }

        const queryString = queryParams.toString()
        const propertyUrl = `${origin}/site/${tenantSlug}/property/${property.id}${queryString ? `?${queryString}` : ''}`
        
        // Build dynamic message
        let message = `Olá ${lead.name}! Tudo bem?\n\nEstou te enviando os detalhes deste imóvel que pode te interessar:\n\n`
        
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
        
        if (details.length > 0) {
            message += `\n*Detalhes:* \n• ${details.join('\n• ')}\n`
        }

        if (config.description === 'full' && property.description) {
            message += `\n*Descrição:* \n${property.description}\n`
        }

        message += `\nConfira todas as fotos e detalhes aqui: ${propertyUrl}\n\nQualquer dúvida estou à disposição!`
        
        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
        
        window.open(whatsappUrl, '_blank')
        
        await logInteraction(lead.id, 'whatsapp', `Enviado link do imóvel via WhatsApp: ${property.title}`)
        
        toast.success('WhatsApp aberto!')
        setSending(false)
        onClose()
    }

    const selectedImagesSet = useMemo(() => new Set(config.selectedImages), [config.selectedImages])
    const selectedVideosSet = useMemo(() => new Set(config.selectedVideos), [config.selectedVideos])
    const selectedDocsSet = useMemo(() => new Set(config.selectedDocs.map((d: any) => d.url)), [config.selectedDocs])

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
                            <FormInput
                                placeholder="Buscar lead por nome, email ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                icon={Search}
                            />

                            <div className="space-y-2">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="animate-spin text-primary" size={24} />
                                    </div>
                                ) : filteredLeads.length > 0 ? (
                                    filteredLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            onClick={() => setSelectedLead(lead)}
                                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <User size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-foreground truncate">{lead.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{lead.email || 'Sem e-mail'}</p>
                                                <p className="text-[10px] font-medium text-muted-foreground">{formatPhone(lead.phone)}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center py-8 text-muted-foreground">Nenhum lead encontrado.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Lead Header */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Lead Selecionado</p>
                                    <p className="text-lg font-bold text-foreground">{selectedLead.name}</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedLead(null)}
                                    className="text-sm font-bold text-primary hover:underline"
                                >
                                    Alterar
                                </button>
                            </div>

                            {/* Configuration Options */}
                            <div className="space-y-4 border border-border rounded-xl overflow-hidden bg-card">
                                {/* Basic Info Section */}
                                <div className="border-b border-border">
                                    <button 
                                        onClick={() => toggleSection('basic')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Info size={18} className="text-primary" />
                                            <span className="font-bold text-foreground">Informações Básicas</span>
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
                                            <div className="flex flex-col gap-2 pt-1">
                                                <p className="text-xs font-bold text-muted-foreground uppercase">Descrição</p>
                                                <div className="flex gap-4">
                                                    <button 
                                                        onClick={() => setConfig({...config, description: 'full'})}
                                                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${config.description === 'full' ? 'bg-primary/10 border-primary text-primary font-bold' : 'border-border text-muted-foreground'}`}
                                                    >
                                                        Completa
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfig({...config, description: 'none'})}
                                                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${config.description === 'none' ? 'bg-primary/10 border-primary text-primary font-bold' : 'border-border text-muted-foreground'}`}
                                                    >
                                                        Não enviar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Details Section */}
                                <div className="border-b border-border">
                                    <button 
                                        onClick={() => toggleSection('details')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Home size={18} className="text-primary" />
                                            <span className="font-bold text-foreground">Detalhes (Cômodos/Áreas)</span>
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
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Location Section */}
                                <div className="border-b border-border">
                                    <button 
                                        onClick={() => toggleSection('location')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapPin size={18} className="text-primary" />
                                            <span className="font-bold text-foreground">Localização</span>
                                        </div>
                                        {expandedSections.location ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.location && (
                                        <div className="p-4 pt-0">
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { id: 'exact', label: 'Endereço Exato' },
                                                    { id: 'approximate', label: 'Aproximada (Bairro)' },
                                                    { id: 'none', label: 'Não enviar' }
                                                ].map((opt) => (
                                                    <button 
                                                        key={opt.id}
                                                        onClick={() => setConfig({...config, location: opt.id as any})}
                                                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${config.location === opt.id ? 'bg-primary/10 border-primary text-primary font-bold' : 'border-border text-muted-foreground'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Media - Images Section */}
                                <div className="border-b border-border">
                                    <button 
                                        onClick={() => toggleSection('images')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ImageIcon size={18} className="text-primary" />
                                            <span className="font-bold text-foreground">Imagens ({config.selectedImages.length})</span>
                                        </div>
                                        {expandedSections.images ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.images && (
                                        <div className="p-4 pt-0">
                                            {property.images?.length > 0 ? (
                                                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                                    {property.images.map((img: string, idx: number) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => {
                                                                const newImages = selectedImagesSet.has(img)
                                                                    ? config.selectedImages.filter((i: string) => i !== img)
                                                                    : [...config.selectedImages, img]
                                                                setConfig({...config, selectedImages: newImages})
                                                            }}
                                                            className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-opacity ${selectedImagesSet.has(img) ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                        >
                                                            <img 
                                                                src={img} 
                                                                className="w-full h-full object-cover" 
                                                                loading="lazy"
                                                                alt={`Foto ${idx + 1}`}
                                                            />
                                                            {selectedImagesSet.has(img) && (
                                                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                                    <CheckCircle2 className="text-white fill-primary" size={20} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic">Nenhuma imagem disponível.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Media - Videos Section */}
                                <div className="border-b border-border">
                                    <button 
                                        onClick={() => toggleSection('videos')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Video size={18} className="text-primary" />
                                            <span className="font-bold text-foreground">Vídeos ({config.selectedVideos.length})</span>
                                        </div>
                                        {expandedSections.videos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.videos && (
                                        <div className="p-4 pt-0 space-y-4">
                                            {property.videos?.length > 0 ? (
                                                <div className="space-y-1">
                                                    {property.videos.map((video: string, idx: number) => (
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
                                                <p className="text-xs text-muted-foreground italic">Nenhum vídeo disponível.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Media - Documents Section */}
                                <div>
                                    <button 
                                        onClick={() => toggleSection('docs')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText size={18} className="text-primary" />
                                            <span className="font-bold text-foreground">Documentos ({config.selectedDocs.length})</span>
                                        </div>
                                        {expandedSections.docs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {expandedSections.docs && (
                                        <div className="p-4 pt-0 space-y-4">
                                            {property.documents?.length > 0 ? (
                                                <div className="space-y-1">
                                                    {property.documents.map((doc: any, idx: number) => (
                                                        <FormCheckbox 
                                                            key={idx}
                                                            label={doc.name || `Documento ${idx + 1}`}
                                                            checked={selectedDocsSet.has(doc.url)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                const newDocs = checked
                                                                    ? [...config.selectedDocs, doc]
                                                                    : config.selectedDocs.filter((d: any) => d.url !== doc.url)
                                                                setConfig({...config, selectedDocs: newDocs})
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic">Nenhum documento disponível.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {selectedLead && (
                    <div className="pt-6 border-t border-border mt-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleSendEmail(selectedLead)}
                                disabled={sending || !selectedLead.email}
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                    <Mail size={20} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-foreground text-sm">Enviar E-mail</p>
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{selectedLead.email || 'Sem e-mail'}</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSendWhatsApp(selectedLead)}
                                disabled={sending || !selectedLead.phone}
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                                    <MessageCircle size={20} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-foreground text-sm">Enviar WhatsApp</p>
                                    <p className="text-[10px] text-muted-foreground">{formatPhone(selectedLead.phone)}</p>
                                </div>
                            </button>
                        </div>

                        {sending && (
                            <div className="flex items-center justify-center gap-2 text-primary font-bold mt-4">
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
