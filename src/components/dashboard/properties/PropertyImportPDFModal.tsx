'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from '@/components/shared/Modal'
import {
    FileText, Upload, AlertCircle, CheckCircle2, Loader2,
    Cpu, Globe, ClipboardList, DollarSign, BookOpen, Search
} from 'lucide-react'
import { toast } from 'sonner'
import { getTenantAIConfig } from '@/app/_actions/ai-usage'

interface PropertyImportPDFModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string | null
    onImportSuccess: () => void
    properties?: { id: string; title: string }[]
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
    initialPropertyId
}: PropertyImportPDFModalProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStep, setProcessingStep] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai'>('gemini')
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
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
    const [blockTower, setBlockTower] = useState('')
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
        if (!selectedPropertyId) {
            toast.error('Empreendimento não selecionado.')
            return
        }

        setIsProcessing(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('tenant_id', tenantId)
            formData.append('mode', 'tabela') // Sempre tabela agora
            formData.append('ai_provider', selectedProvider)
            formData.append('ai_model', selectedModel)

            formData.append('property_id', selectedPropertyId)
            formData.append('reference_month', referenceMonth)
            formData.append('index_type', indexType)
            if (indexValue) formData.append('index_value', indexValue)

            // Sempre renderizar imagens para OCR (multimodal via gpt ou gemini)
            setProcessingStep('Renderizando páginas do PDF...')
            const pageImages = await renderPDFPages(file)
            formData.append('page_images', JSON.stringify(pageImages))
            setProcessingStep('Enviando para IA...')

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-property-pdf`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
                body: formData
            })

            const result = await response.json()

            if (response.ok && result.success) {
                if (result.action === 'updated') {
                    toast.success(`${result.units_count} unidades atualizadas em "${result.title}"! A partir de R$ ${result.price_from?.toLocaleString('pt-BR')}`)
                } else {
                    toast.success(`Processamento concluído para "${result.title}"!`)
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
        if (initialPropertyId) {
            setSelectedPropertyId(initialPropertyId)
        } else {
            setSelectedPropertyId('')
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
        onClose()
    }

    // Título do empreendimento
    const propertyTitle = properties.find(p => p.id === selectedPropertyId)?.title || ''

    const headerButton = (
        <button onClick={handleUpload}
            disabled={!file || isProcessing || !selectedPropertyId}
            className="px-8 min-w-[140px] justify-center py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
        >
            {isProcessing ? (
                <>Processando...</>
            ) : (
                'Importar'
            )}
        </button>
    )

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title={
                <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                    Importar PDF (IA)
                </h3>
            } 
            extraHeaderContent={headerButton}
            size="lg"
        >
            <div className="space-y-5">

                {/* ── Empreendimento Selecionado ── */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                        Empreendimento
                    </label>
                    <div className="w-full bg-white dark:bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-sm font-bold text-foreground">
                        {propertyTitle || 'Nenhum empreendimento selecionado'}
                    </div>
                </div>

                {/* ── Campos Mês / Índice / Valor ── */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                        Referência da Tabela
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1 block mb-1">
                                Mês Ref.
                            </span>
                            <input
                                type="month"
                                value={referenceMonth}
                                onChange={(e) => setReferenceMonth(e.target.value)}
                                disabled={isProcessing}
                                className="w-full bg-white dark:bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
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
                                    className="w-full appearance-none bg-white dark:bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all cursor-pointer"
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
                                className="w-full bg-white dark:bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Seletor Motor IA ── */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Escolher IA</label>
                    <div className="flex gap-2">
                        <div className="relative flex flex-1 p-1 bg-white dark:bg-muted/30 rounded-lg border border-border h-9">
                            <div className={`absolute inset-y-1 w-[calc(50%-4px)] bg-secondary rounded-md shadow-sm transition-all duration-300 ease-out pointer-events-none ${
                                selectedProvider === 'openai' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                            }`} />
                            <button onClick={() => handleProviderChange('gemini')} disabled={isProcessing}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black transition-colors ${
                                    selectedProvider === 'gemini' ? 'text-secondary-foreground' : 'text-muted-foreground'
                                }`}
                            >
                                <Cpu className="w-3 h-3" /> GEMINI
                            </button>
                            <button onClick={() => handleProviderChange('openai')} disabled={isProcessing}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black transition-colors ${
                                    selectedProvider === 'openai' ? 'text-secondary-foreground' : 'text-muted-foreground'
                                }`}
                            >
                                <Globe className="w-3 h-3" /> GPT
                            </button>
                        </div>
                        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={isProcessing}
                            className="flex-1 bg-white dark:bg-muted/30 border border-border rounded-lg px-3 py-2 text-[11px] font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer"
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
                        className="bg-white dark:bg-muted/30 border border-muted-foreground/30 rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-accent-icon/50 hover:bg-muted/10 transition-all cursor-pointer group"
                    >
                        <div className="p-3 bg-muted rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Upload size={24} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-foreground">Clique para selecionar</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Arquivo PDF (máx. 20MB)
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



            </div>
        </Modal>
    )
}
