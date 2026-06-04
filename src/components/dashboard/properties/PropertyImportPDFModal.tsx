'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from '@/components/shared/Modal'
import {
    FileText, Upload, AlertCircle, CheckCircle2, Loader2,
    Cpu, Globe, ClipboardList, DollarSign, BookOpen, Search
} from 'lucide-react'
import { toast } from 'sonner'
import { getTenantAIConfig } from '@/app/_actions/ai-usage'

type ImportMode = 'cadastro' | 'tabela' | 'book'

interface PropertyImportPDFModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string | null
    onImportSuccess: () => void
    properties?: { id: string; title: string }[]
    initialMode?: ImportMode
    initialPropertyId?: string
}

const OCR_MODELS = {
    gemini: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
        { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
    ],
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4o', name: 'GPT-4o' },
    ]
}

const MODE_CONFIG = {
    cadastro: {
        icon: ClipboardList,
        label: 'Cadastro',
        sublabel: 'Rápido',
        description: 'A IA vai ler o PDF e criar um novo imóvel com os dados extraídos (título, preço, área, quartos, endereço).',
        color: 'text-blue-500',
    },
    tabela: {
        icon: DollarSign,
        label: 'Tabela',
        sublabel: 'Preços',
        description: 'Selecione o empreendimento e faça upload da tabela de preços atualizada. A IA extrairá unidades, valores e condições de pagamento.',
        color: 'text-emerald-500',
    },
    book: {
        icon: BookOpen,
        label: 'Book',
        sublabel: 'Digital',
        description: 'Carregue o book de apresentação do empreendimento. A IA extrairá textos, amenidades e separará as imagens (plantas, lazer, fachada).',
        color: 'text-purple-500',
    }
}

/** Renderiza páginas de um PDF como imagens JPEG usando pdf.js */
async function renderPDFPages(file: File): Promise<string[]> {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pages: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const scale = 2.0 // Alta resolução
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!

        await page.render({ canvasContext: ctx, viewport } as any).promise
        
        // Converter para base64 JPEG (sem o prefixo data:)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        pages.push(dataUrl.split(',')[1])
    }

    return pages
}

export function PropertyImportPDFModal({
    isOpen,
    onClose,
    tenantId,
    onImportSuccess,
    properties = [],
    initialMode,
    initialPropertyId
}: PropertyImportPDFModalProps) {
    const [mode, setMode] = useState<ImportMode>(initialMode || 'cadastro')
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStep, setProcessingStep] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai'>('gemini')
    const [selectedModel, setSelectedModel] = useState('gemini-3-flash')
    const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropertyId || '')
    const [propertySearch, setPropertySearch] = useState(() => {
        if (initialPropertyId && properties.length > 0) {
            const prop = properties.find(p => p.id === initialPropertyId)
            return prop?.title || ''
        }
        return ''
    })
    const [referenceMonth, setReferenceMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const [indexType, setIndexType] = useState('CUB')
    const [indexValue, setIndexValue] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Carregar config AI do tenant
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (f && f.type === 'application/pdf') {
            setFile(f)
        } else {
            toast.error('Selecione um arquivo PDF válido.')
            setFile(null)
        }
    }

    const handleUpload = async () => {
        if (!file || !tenantId) return
        if (mode === 'tabela' && !selectedPropertyId) {
            toast.error('Selecione o empreendimento primeiro.')
            return
        }

        setIsProcessing(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('tenant_id', tenantId)
            formData.append('mode', mode)
            formData.append('ai_provider', selectedProvider)
            formData.append('ai_model', selectedModel)

            if (mode === 'tabela') {
                formData.append('property_id', selectedPropertyId)
                formData.append('reference_month', referenceMonth)
                formData.append('index_type', indexType)
                if (indexValue) formData.append('index_value', indexValue)
            }

            // Para Book ou OpenAI: renderizar páginas como imagens para viabilizar multimodal
            if (mode === 'book' || mode === 'tabela' || selectedProvider === 'openai') {
                setProcessingStep('Renderizando páginas do PDF...')
                const pageImages = await renderPDFPages(file)
                formData.append('page_images', JSON.stringify(pageImages))
                setProcessingStep(`${pageImages.length} páginas renderizadas. Enviando para IA...`)
            } else {
                setProcessingStep('Enviando para IA...')
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-property-pdf`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
                body: formData
            })

            const result = await response.json()

            if (response.ok && result.success) {
                if (result.action === 'created') {
                    toast.success(`Imóvel "${result.title}" criado com sucesso!`)
                } else if (result.action === 'updated') {
                    toast.success(`${result.units_count} unidades atualizadas em "${result.title}"! A partir de R$ ${result.price_from?.toLocaleString('pt-BR')}`)
                } else if (result.action === 'created_book') {
                    toast.success(`"${result.title}" criado com ${result.images_count} imagens extraídas!`)
                }
                onImportSuccess()
                handleClose()
            } else {
                throw new Error(result.error || 'Erro ao processar PDF')
            }
        } catch (error: any) {
            console.error('Erro no PDF:', error)
            toast.error(error.message)
        } finally {
            setIsProcessing(false)
            setProcessingStep('')
        }
    }

    const handleClose = () => {
        setFile(null)
        // Restaurar para valores iniciais ao fechar
        if (initialPropertyId) {
            setSelectedPropertyId(initialPropertyId)
            const prop = properties.find(p => p.id === initialPropertyId)
            setPropertySearch(prop?.title || '')
        } else {
            setSelectedPropertyId('')
            setPropertySearch('')
        }
        if (initialMode) setMode(initialMode)
        if (fileInputRef.current) fileInputRef.current.value = ''
        onClose()
    }

    const modeConfig = MODE_CONFIG[mode]
    const ModeIcon = modeConfig.icon

    // Filtrar propriedades para o dropdown
    const filteredProperties = properties.filter(p =>
        p.title.toLowerCase().includes(propertySearch.toLowerCase())
    )

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar PDF (IA)" size="lg">
            <div className="space-y-5">

                {/* ── Toggle 3 Modos ── */}
                <div className="relative flex p-1 bg-muted/50 rounded-lg border border-border">
                    <div
                        className="absolute inset-y-1 bg-card rounded-md shadow-sm border border-border/50 transition-all duration-300 ease-out pointer-events-none"
                        style={{
                            width: 'calc(33.333% - 5.33px)',
                            transform: `translateX(calc(${mode === 'cadastro' ? 0 : mode === 'tabela' ? 100 : 200}% + ${mode === 'cadastro' ? 0 : mode === 'tabela' ? 4 : 8}px))`
                        }}
                    />
                    {(['cadastro', 'tabela', 'book'] as ImportMode[]).map((m) => {
                        const cfg = MODE_CONFIG[m]
                        const Icon = cfg.icon
                        return (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setFile(null) }}
                                disabled={isProcessing}
                                className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                                    mode === m ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${mode === m ? cfg.color : ''}`} />
                                <span className="text-[9px] font-black uppercase tracking-wider leading-tight">{cfg.label}</span>
                                <span className="text-[8px] font-bold uppercase tracking-wider leading-tight opacity-60">{cfg.sublabel}</span>
                            </button>
                        )
                    })}
                </div>

                {/* ── Descrição do modo ── */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3">
                    <ModeIcon className={`shrink-0 mt-0.5 ${modeConfig.color}`} size={18} />
                    <p className="text-xs text-foreground/80 leading-relaxed">{modeConfig.description}</p>
                </div>

                {/* ── Seletor de Empreendimento (modo tabela) ── */}
                {mode === 'tabela' && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Empreendimento
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                value={propertySearch}
                                onChange={(e) => setPropertySearch(e.target.value)}
                                placeholder="Buscar imóvel..."
                                className="w-full bg-muted/30 border border-border rounded-lg pl-9 pr-4 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                            />
                        </div>
                        <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-muted/20">
                            {filteredProperties.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">Nenhum imóvel encontrado</p>
                            ) : (
                                filteredProperties.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setSelectedPropertyId(p.id); setPropertySearch(p.title) }}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors border-b border-border/50 last:border-0 ${
                                            selectedPropertyId === p.id
                                                ? 'bg-primary/10 text-foreground font-bold'
                                                : 'text-foreground/70 hover:bg-muted/50'
                                        }`}
                                    >
                                        {p.title}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ── Campos Mês / Índice / Valor (modo tabela) ── */}
                {mode === 'tabela' && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Referência da Tabela
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1 block mb-1">
                                    Mês Ref.
                                </span>
                                <input
                                    type="month"
                                    value={referenceMonth}
                                    onChange={(e) => setReferenceMonth(e.target.value)}
                                    disabled={isProcessing}
                                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1 block mb-1">
                                    Índice
                                </span>
                                <div className="relative">
                                    <select
                                        value={indexType}
                                        onChange={(e) => setIndexType(e.target.value)}
                                        disabled={isProcessing}
                                        className="w-full appearance-none bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all cursor-pointer"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px'
                                        }}
                                    >
                                        <option value="CUB">CUB</option>
                                        <option value="INCC">INCC</option>
                                        <option value="IGP-M">IGP-M</option>
                                        <option value="IPCA">IPCA</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1 block mb-1">
                                    Valor
                                </span>
                                <input
                                    type="text"
                                    value={indexValue}
                                    onChange={(e) => setIndexValue(e.target.value)}
                                    placeholder="3.096,25"
                                    disabled={isProcessing}
                                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Seletor Motor IA ── */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Motor de IA</label>
                    <div className="flex gap-2">
                        <div className="relative flex flex-1 p-1 bg-muted/50 rounded-lg border border-border h-9">
                            <div className={`absolute inset-y-1 w-[calc(50%-4px)] bg-card rounded-md shadow-sm border border-border/50 transition-all duration-300 ease-out pointer-events-none ${
                                selectedProvider === 'openai' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                            }`} />
                            <button onClick={() => handleProviderChange('gemini')} disabled={isProcessing}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black transition-colors ${
                                    selectedProvider === 'gemini' ? 'text-foreground' : 'text-muted-foreground'
                                }`}
                            >
                                <Cpu className="w-3 h-3" /> GEMINI
                            </button>
                            <button onClick={() => handleProviderChange('openai')} disabled={isProcessing}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black transition-colors ${
                                    selectedProvider === 'openai' ? 'text-foreground' : 'text-muted-foreground'
                                }`}
                            >
                                <Globe className="w-3 h-3" /> GPT
                            </button>
                        </div>
                        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={isProcessing}
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

                {/* ── Upload Area ── */}
                {!file ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-muted-foreground/30 rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-accent-icon/50 hover:bg-muted/20 transition-all cursor-pointer group"
                    >
                        <div className="p-3 bg-muted rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Upload size={24} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-foreground">Clique para selecionar</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {mode === 'book' ? 'Book digital em PDF (máx. 20MB)' : 'Arquivo PDF (máx. 20MB)'}
                            </p>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
                    </div>
                ) : (
                    <div className="bg-card border border-muted-foreground/30 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground truncate max-w-[200px]">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button onClick={() => setFile(null)} className="text-xs font-bold text-red-500 hover:underline">Remover</button>
                    </div>
                )}

                {/* ── Botões ── */}
                <div className="flex gap-3 pt-1">
                    <button onClick={handleClose} disabled={isProcessing}
                        className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button onClick={handleUpload}
                        disabled={!file || isProcessing || (mode === 'tabela' && !selectedPropertyId)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isProcessing ? (
                            <><Loader2 className="animate-spin" size={16} /> Processando...</>
                        ) : (
                            <><CheckCircle2 size={16} /> Iniciar Importação</>
                        )}
                    </button>
                </div>

                {isProcessing && processingStep && (
                    <p className="text-[10px] text-center text-muted-foreground animate-pulse">{processingStep}</p>
                )}
            </div>
        </Modal>
    )
}
