'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import {
    Globe, Link2, FileText, Cpu, Loader2, CheckCircle2,
    ArrowLeft, Building2, BedDouble, Bath, Car, MapPin, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { getTenantAIConfig } from '@/app/_actions/ai-usage'

type Step = 'input' | 'list' | 'preview'
type InputMode = 'url' | 'text'

const OCR_MODELS = {
    gemini: [
        { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
        { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    ],
    openai: [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-5.4', name: 'GPT-5.4' },
        { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
    ]
}

interface ScrapedProperty {
    title: string
    price: number | null
    type: string
    description: string
    details: {
        area_privativa?: string
        area_total?: string
        area_terreno?: string
        area_construida?: string
        quartos?: string
        suites?: string
        banheiros?: string
        vagas?: string
        valor_condominio?: string
        valor_iptu?: string
        situacao?: string
        obs_dormitorios?: string
        is_empreendimento?: boolean
        empreendimento?: { construtora?: string; previsao_entrega?: string }
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
        endereco?: {
            rua?: string; numero?: string; bairro?: string
            cidade?: string; estado?: string; cep?: string
        }
    }
    source_images?: string[]
}

interface PropertyScrapingModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string | null
    onScrapingSuccess: (data: ScrapedProperty) => void
}

export function PropertyScrapingModal({ isOpen, onClose, tenantId, onScrapingSuccess }: PropertyScrapingModalProps) {
    const [step, setStep] = useState<Step>('input')
    const [inputMode, setInputMode] = useState<InputMode>('url')
    const [urlValue, setUrlValue] = useState('')
    const [textValue, setTextValue] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStep, setProcessingStep] = useState('')
    const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai'>('gemini')
    const [selectedModel, setSelectedModel] = useState('gemini-3-flash')
    const [scrapedProperties, setScrapedProperties] = useState<ScrapedProperty[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
        if (isOpen && tenantId) {
            getTenantAIConfig(tenantId).then((config) => {
                const provider = (config.provider === 'openai' ? 'openai' : 'gemini') as 'gemini' | 'openai'
                setSelectedProvider(provider)
                const models = OCR_MODELS[provider]
                const match = models.find(m => m.id === config.model)
                setSelectedModel(match ? config.model : models[0].id)
            }).catch(() => {})
        }
    }, [isOpen, tenantId])

    const handleProviderChange = (provider: 'gemini' | 'openai') => {
        setSelectedProvider(provider)
        setSelectedModel(OCR_MODELS[provider][0].id)
    }

    const handleExtract = async () => {
        if (!tenantId) return
        const input = inputMode === 'url' ? urlValue.trim() : textValue.trim()
        if (!input) { toast.error(inputMode === 'url' ? 'Cole a URL do imóvel.' : 'Cole o texto da página.'); return }

        if (inputMode === 'url') {
            try { new URL(input) } catch { toast.error('URL inválida.'); return }
        }

        setIsProcessing(true)
        setProcessingStep(inputMode === 'url' ? 'Acessando página...' : 'Processando texto...')

        try {
            const payload: Record<string, string> = { tenant_id: tenantId, ai_provider: selectedProvider, ai_model: selectedModel }
            if (inputMode === 'url') payload.url = input
            else payload.raw_text = input

            setProcessingStep('Extraindo dados com IA...')

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scrape-property`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erro ao extrair dados.')
            }

            setScrapedProperties(result.properties)

            if (result.count === 1) {
                setSelectedIndex(0)
                setStep('preview')
                toast.success('Imóvel extraído com sucesso!')
            } else {
                setStep('list')
                toast.success(`${result.count} imóveis encontrados!`)
            }
        } catch (error: any) {
            console.error('Scraping error:', error)
            toast.error(error.message || 'Erro ao extrair dados.')
        } finally {
            setIsProcessing(false)
            setProcessingStep('')
        }
    }

    const handleUseData = () => {
        const prop = scrapedProperties[selectedIndex]
        if (prop) {
            onScrapingSuccess(prop)
            handleClose()
        }
    }

    const handleClose = () => {
        setStep('input')
        setUrlValue('')
        setTextValue('')
        setScrapedProperties([])
        setSelectedIndex(0)
        onClose()
    }

    const formatPrice = (price: number | null) => {
        if (!price) return '—'
        return `R$ ${price.toLocaleString('pt-BR')}`
    }

    const TYPE_LABELS: Record<string, string> = {
        apartment: 'Apartamento', house: 'Casa', land: 'Terreno',
        commercial: 'Comercial', penthouse: 'Cobertura', studio: 'Estúdio'
    }

    const selected = scrapedProperties[selectedIndex]

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar via URL" size="md">
            <div className="space-y-5">

                {/* ── STEP 1: Input ── */}
                {step === 'input' && (
                    <>
                        {/* Toggle URL / Texto */}
                        <div className="relative flex p-1 bg-muted/50 rounded-lg border border-border">
                            <div
                                className="absolute inset-y-1 bg-card rounded-md shadow-sm border border-border/50 transition-all duration-300 ease-out pointer-events-none"
                                style={{ width: 'calc(50% - 4px)', transform: `translateX(${inputMode === 'url' ? '0' : 'calc(100% + 4px)'})` }}
                            />
                            <button onClick={() => setInputMode('url')} disabled={isProcessing}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${inputMode === 'url' ? 'text-foreground' : 'text-muted-foreground'}`}
                            ><Link2 className="w-3.5 h-3.5" /> Colar URL</button>
                            <button onClick={() => setInputMode('text')} disabled={isProcessing}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${inputMode === 'text' ? 'text-foreground' : 'text-muted-foreground'}`}
                            ><FileText className="w-3.5 h-3.5" /> Colar Texto</button>
                        </div>

                        {/* Input field */}
                        {inputMode === 'url' ? (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">URL da página</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <input type="url" value={urlValue} onChange={e => setUrlValue(e.target.value)}
                                        placeholder="https://site.com.br/imovel/..."
                                        disabled={isProcessing}
                                        className="w-full bg-foreground/5 border border-border/40 rounded-lg pl-10 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground ml-1">Cole a URL de qualquer site com informações de imóvel</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Texto da página</label>
                                <textarea value={textValue} onChange={e => setTextValue(e.target.value)}
                                    placeholder="Cole aqui o texto copiado da página do imóvel..."
                                    disabled={isProcessing}
                                    rows={6}
                                    className="w-full bg-foreground/5 border border-border/40 rounded-lg px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all resize-none"
                                />
                                <p className="text-[10px] text-muted-foreground ml-1">Use quando o site bloquear acesso automático</p>
                            </div>
                        )}

                        {/* AI Engine selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Motor de IA</label>
                            <div className="flex gap-2">
                                <div className="relative flex flex-1 p-1 bg-muted/50 rounded-lg border border-border h-9">
                                    <div className={`absolute inset-y-1 w-[calc(50%-4px)] bg-card rounded-md shadow-sm border border-border/50 transition-all duration-300 ease-out pointer-events-none ${selectedProvider === 'openai' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`} />
                                    <button onClick={() => handleProviderChange('gemini')} disabled={isProcessing}
                                        className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black transition-colors ${selectedProvider === 'gemini' ? 'text-foreground' : 'text-muted-foreground'}`}
                                    ><Cpu className="w-3 h-3" /> GEMINI</button>
                                    <button onClick={() => handleProviderChange('openai')} disabled={isProcessing}
                                        className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black transition-colors ${selectedProvider === 'openai' ? 'text-foreground' : 'text-muted-foreground'}`}
                                    ><Globe className="w-3 h-3" /> GPT</button>
                                </div>
                                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={isProcessing}
                                    className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-[11px] font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px'
                                    }}
                                >
                                    {OCR_MODELS[selectedProvider].map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-1">
                            <button onClick={handleClose} disabled={isProcessing}
                                className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50">
                                Cancelar
                            </button>
                            <button onClick={handleExtract}
                                disabled={isProcessing || (inputMode === 'url' ? !urlValue.trim() : !textValue.trim())}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                                {isProcessing ? (<><Loader2 className="animate-spin" size={16} /> Extraindo...</>) : (<><CheckCircle2 size={16} /> Extrair Dados</>)}
                            </button>
                        </div>

                        {isProcessing && processingStep && (
                            <p className="text-[10px] text-center text-muted-foreground animate-pulse">{processingStep}</p>
                        )}
                    </>
                )}

                {/* ── STEP 2: Property List ── */}
                {step === 'list' && (
                    <>
                        <div className="flex items-center gap-2 mb-1">
                            <button onClick={() => setStep('input')} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"><ArrowLeft size={16} /></button>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{scrapedProperties.length} imóveis encontrados</p>
                        </div>
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                            {scrapedProperties.map((prop, i) => (
                                <button key={i} onClick={() => { setSelectedIndex(i); setStep('preview') }}
                                    className="w-full text-left bg-foreground/5 hover:bg-foreground/10 border border-border/40 rounded-xl p-4 transition-all group">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-foreground truncate">{prop.title || `Imóvel ${i + 1}`}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                                <span className="text-[10px] font-bold text-primary uppercase">{TYPE_LABELS[prop.type] || prop.type}</span>
                                                {prop.details?.quartos && <span className="flex items-center gap-1 text-xs text-muted-foreground"><BedDouble size={12} />{prop.details.quartos}</span>}
                                                {prop.details?.banheiros && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Bath size={12} />{prop.details.banheiros}</span>}
                                                {prop.details?.vagas && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Car size={12} />{prop.details.vagas}</span>}
                                                {(prop.details?.endereco?.bairro || prop.details?.endereco?.cidade) && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MapPin size={12} />{[prop.details.endereco.bairro, prop.details.endereco.cidade].filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {prop.price && <span className="text-sm font-black text-foreground">{formatPrice(prop.price)}</span>}
                                            <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* ── STEP 3: Preview ── */}
                {step === 'preview' && selected && (
                    <>
                        <div className="flex items-center gap-2 mb-1">
                            <button onClick={() => scrapedProperties.length > 1 ? setStep('list') : setStep('input')}
                                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"><ArrowLeft size={16} /></button>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preview do imóvel</p>
                        </div>

                        <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar">
                            {/* Title & Price */}
                            <div className="bg-foreground/5 border border-border/40 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-bold text-primary uppercase">{TYPE_LABELS[selected.type] || selected.type}</span>
                                        <h4 className="text-base font-bold text-foreground mt-0.5">{selected.title}</h4>
                                    </div>
                                    <span className="text-lg font-black text-foreground whitespace-nowrap">{formatPrice(selected.price)}</span>
                                </div>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                    { label: 'Quartos', value: selected.details?.quartos, icon: BedDouble },
                                    { label: 'Suítes', value: selected.details?.suites, icon: BedDouble },
                                    { label: 'Banheiros', value: selected.details?.banheiros, icon: Bath },
                                    { label: 'Vagas', value: selected.details?.vagas, icon: Car },
                                ].map(item => item.value ? (
                                    <div key={item.label} className="bg-foreground/5 border border-border/40 rounded-lg p-3 text-center">
                                        <item.icon size={14} className="mx-auto text-muted-foreground mb-1" />
                                        <p className="text-lg font-black text-foreground">{item.value}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                    </div>
                                ) : null)}
                            </div>

                            {/* Areas */}
                            {(selected.details?.area_privativa || selected.details?.area_total) && (
                                <div className="bg-foreground/5 border border-border/40 rounded-xl p-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Áreas</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {selected.details?.area_privativa && <div><span className="text-muted-foreground">Privativa:</span> <span className="font-bold text-foreground">{selected.details.area_privativa}m²</span></div>}
                                        {selected.details?.area_total && <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-foreground">{selected.details.area_total}m²</span></div>}
                                        {selected.details?.area_terreno && <div><span className="text-muted-foreground">Terreno:</span> <span className="font-bold text-foreground">{selected.details.area_terreno}m²</span></div>}
                                        {selected.details?.area_construida && <div><span className="text-muted-foreground">Construída:</span> <span className="font-bold text-foreground">{selected.details.area_construida}m²</span></div>}
                                    </div>
                                </div>
                            )}

                            {/* Address */}
                            {selected.details?.endereco && (selected.details.endereco.bairro || selected.details.endereco.cidade) && (
                                <div className="bg-foreground/5 border border-border/40 rounded-xl p-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Endereço</p>
                                    <p className="text-xs text-foreground font-medium">
                                        {[selected.details.endereco.rua, selected.details.endereco.numero].filter(Boolean).join(', ')}
                                        {selected.details.endereco.rua && (selected.details.endereco.bairro || selected.details.endereco.cidade) ? ' — ' : ''}
                                        {[selected.details.endereco.bairro, selected.details.endereco.cidade, selected.details.endereco.estado].filter(Boolean).join(', ')}
                                        {selected.details.endereco.cep ? ` (${selected.details.endereco.cep})` : ''}
                                    </p>
                                </div>
                            )}

                            {/* Amenities */}
                            {(() => {
                                const amenities = [
                                    { key: 'portaria_24h', label: 'Portaria 24h' },
                                    { key: 'piscina', label: 'Piscina' },
                                    { key: 'academia', label: 'Academia' },
                                    { key: 'salao_festas', label: 'Salão de Festas' },
                                    { key: 'espaco_gourmet', label: 'Espaço Gourmet' },
                                    { key: 'playground', label: 'Playground' },
                                    { key: 'brinquedoteca', label: 'Brinquedoteca' },
                                    { key: 'sala_jogos', label: 'Sala de Jogos' },
                                    { key: 'sala_cinema', label: 'Cinema' },
                                    { key: 'home_market', label: 'Home Market' },
                                ].filter(a => (selected.details as any)?.[a.key])
                                if (amenities.length === 0) return null
                                return (
                                    <div className="bg-foreground/5 border border-border/40 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Amenidades</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {amenities.map(a => (
                                                <span key={a.key} className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full">{a.label}</span>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Description preview */}
                            {selected.description && (
                                <div className="bg-foreground/5 border border-border/40 rounded-xl p-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Descrição</p>
                                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4">{selected.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => scrapedProperties.length > 1 ? setStep('list') : setStep('input')}
                                className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                                Voltar
                            </button>
                            <button onClick={handleUseData}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all active:scale-[0.98] whitespace-nowrap">
                                <Building2 size={16} /> Usar Dados
                            </button>
                        </div>
                    </>
                )}

            </div>
        </Modal>
    )
}
