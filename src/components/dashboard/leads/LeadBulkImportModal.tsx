'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from '@/components/shared/Modal'
import {
    Upload, Loader2, CheckCircle2, Cpu, Globe, Image as ImageIcon,
    User, Phone, Mail, FileText, Sparkles, ClipboardList, AlertCircle, Trash2, ArrowRight, Table, Pencil, Save, X
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { getTenantAIConfig } from '@/app/_actions/ai-usage'
import { createLeadsBulk } from '@/app/_actions/leads'
import { formatPhone } from '@/lib/utils/phone'

interface Broker {
    id: string
    full_name: string
}

interface Stage {
    id: string
    name: string
}

interface LeadBulkImportModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string | null
    stages: Stage[]
    brokers?: Broker[]
    isAdmin?: boolean
    onImportSuccess: () => void
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

interface TempLead {
    id: string
    name: string
    phone: string
    email: string
    notes: string
    selected: boolean
    validationError?: string
}

export function LeadBulkImportModal({
    isOpen,
    onClose,
    tenantId,
    stages,
    brokers = [],
    isAdmin = false,
    onImportSuccess
}: LeadBulkImportModalProps) {
    const [activeTab, setActiveTab] = useState<'print' | 'pdf' | 'spreadsheet'>('print')
    const [step, setStep] = useState<'upload' | 'mapping' | 'processing' | 'review'>('upload')
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    
    // Configurações do motor de IA
    const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai'>('gemini')
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')

    // Dados da planilha para mapeamento
    const [sheetColumns, setSheetColumns] = useState<string[]>([])
    const [sheetData, setSheetData] = useState<any[]>([])
    const [columnMapping, setColumnMapping] = useState({
        name: '',
        phone: '',
        email: '',
        notes: ''
    })

    // Lista de leads extraídos para revisão
    const [tempLeads, setTempLeads] = useState<TempLead[]>([])
    
    // Configurações globais para aplicar em lote
    const [bulkStageId, setBulkStageId] = useState('')
    const [bulkAssignedTo, setBulkAssignedTo] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Resetar estado quando abre/fecha
    useEffect(() => {
        if (isOpen) {
            handleResetState()
            if (stages.length > 0) {
                setBulkStageId(stages[0].id)
            }
            if (tenantId) {
                getTenantAIConfig(tenantId).then((config) => {
                    const provider = (config.provider === 'openai' ? 'openai' : 'gemini') as 'gemini' | 'openai'
                    setSelectedProvider(provider)
                    const models = OCR_MODELS[provider]
                    const match = models.find(m => m.id === config.model)
                    setSelectedModel(match ? config.model : models[0].id)
                }).catch(() => {})
            }
        }
    }, [isOpen, tenantId, stages])

    const handleResetState = () => {
        setFile(null)
        setPreviewUrl(null)
        setStep('upload')
        setTempLeads([])
        setSheetColumns([])
        setSheetData([])
        setColumnMapping({ name: '', phone: '', email: '', notes: '' })
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // Lidar com evento de colar (paste) da área de transferência
    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (step !== 'upload' || activeTab !== 'print' || !isOpen) return
        
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile()
                if (blob) {
                    const pastedFile = new File([blob], `print-upload-${Date.now()}.png`, { type: blob.type })
                    setFile(pastedFile)
                    const url = URL.createObjectURL(pastedFile)
                    setPreviewUrl(url)
                    toast.success('Print colado da área de transferência!')
                    e.preventDefault()
                    break
                }
            }
        }
    }, [step, activeTab, isOpen])

    useEffect(() => {
        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [handlePaste])

    const handleProviderChange = (provider: 'gemini' | 'openai') => {
        setSelectedProvider(provider)
        setSelectedModel(OCR_MODELS[provider][0].id)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return

        if (activeTab === 'print') {
            if (f.type.startsWith('image/')) {
                setFile(f)
                setPreviewUrl(URL.createObjectURL(f))
            } else {
                toast.error('Por favor, selecione um arquivo de imagem válido (PNG, JPG, JPEG).')
            }
        } else if (activeTab === 'pdf') {
            if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
                setFile(f)
            } else {
                toast.error('Por favor, selecione um arquivo PDF válido.')
            }
        } else if (activeTab === 'spreadsheet') {
            if (
                f.name.endsWith('.csv') || 
                f.name.endsWith('.xlsx') || 
                f.name.endsWith('.xls') ||
                f.type === 'text/csv' ||
                f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ) {
                setFile(f)
                processSpreadsheetPreview(f)
            } else {
                toast.error('Selecione uma planilha válida (CSV, XLSX, XLS).')
            }
        }
    }

    // Pré-visualizar planilha e ler colunas no frontend
    const processSpreadsheetPreview = (f: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                
                // Converter para JSON mantendo cabeçalhos
                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
                if (rawData.length === 0) {
                    toast.error('A planilha parece estar vazia.')
                    return
                }

                const headers = rawData[0].map(h => String(h || '').trim()).filter(Boolean)
                setSheetColumns(headers)

                // Converter para objetos chaveados
                const objectsData = XLSX.utils.sheet_to_json(worksheet)
                setSheetData(objectsData)

                // Tentar mapeamento inteligente automático baseado em nomes comuns
                const mapping = { name: '', phone: '', email: '', notes: '' }
                headers.forEach(h => {
                    const low = h.toLowerCase()
                    if (low.includes('nome') || low.includes('lead') || low.includes('cliente') || low === 'name') {
                        if (!mapping.name) mapping.name = h
                    } else if (low.includes('fone') || low.includes('tel') || low.includes('cel') || low.includes('whats') || low === 'phone') {
                        if (!mapping.phone) mapping.phone = h
                    } else if (low.includes('email') || low.includes('e-mail') || low === 'mail') {
                        if (!mapping.email) mapping.email = h
                    } else if (low.includes('perfil') || low.includes('obs') || low.includes('nota') || low.includes('interesse') || low.includes('desc') || low === 'notes') {
                        if (!mapping.notes) mapping.notes = h
                    }
                })
                setColumnMapping(mapping)
            } catch (err) {
                console.error(err)
                toast.error('Erro ao ler a estrutura da planilha.')
            }
        }
        reader.readAsArrayBuffer(f)
    }

    // Executar OCR por IA no backend
    const handleStartIAProcessing = async () => {
        if (!file || !tenantId) return

        setIsProcessing(true)
        setStep('processing')
        
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('tenant_id', tenantId)
            formData.append('ai_provider', selectedProvider)
            formData.append('ai_model', selectedModel)

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-lead-bulk`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
                body: formData
            })

            const result = await response.json()

            if (response.ok && result.success && result.data && Array.isArray(result.data.leads)) {
                const parsedLeads = result.data.leads.map((l: any, index: number) => {
                    const formatted = l.phone ? formatPhone(l.phone) : ''
                    const err = !l.name ? 'Nome obrigatório' : (!formatted ? 'Telefone obrigatório/inválido' : undefined)
                    return {
                        id: `ia-${index}-${Date.now()}`,
                        name: l.name || '',
                        phone: formatted,
                        email: l.email || '',
                        notes: l.notes || '',
                        selected: !err, // Seleciona automaticamente se estiver válido
                        validationError: err
                    }
                })
                
                setTempLeads(parsedLeads)
                setStep('review')
                toast.success(`Leitura concluída! Encontramos ${parsedLeads.length} leads.`)
            } else {
                throw new Error(result.error || 'Erro ao processar arquivo com IA')
            }
        } catch (error: any) {
            console.error('Erro no processamento bulk:', error)
            toast.error(error.message || 'Ocorreu um erro ao processar os leads com IA.')
            setStep('upload')
        } finally {
            setIsProcessing(false)
        }
    }

    // Avançar para mapeamento manual de colunas da planilha
    const handleSpreadsheetNext = () => {
        if (sheetColumns.length === 0) {
            toast.error('Carregue uma planilha com colunas primeiro.')
            return
        }
        setStep('mapping')
    }

    // Concluir mapeamento e converter planilha em Leads de Revisão
    const handleConfirmMapping = () => {
        if (!columnMapping.name || !columnMapping.phone) {
            toast.error('As colunas de Nome e Telefone são de mapeamento obrigatório.')
            return
        }

        const parsed = sheetData.map((row, index) => {
            const rawPhone = String(row[columnMapping.phone] || '')
            const formatted = rawPhone ? formatPhone(rawPhone) : ''
            const name = String(row[columnMapping.name] || '')
            const email = columnMapping.email ? String(row[columnMapping.email] || '') : ''
            const notes = columnMapping.notes ? String(row[columnMapping.notes] || '') : ''
            
            const err = !name ? 'Nome obrigatório' : (!formatted ? 'Telefone obrigatório/inválido' : undefined)
            
            return {
                id: `sheet-${index}-${Date.now()}`,
                name,
                phone: formatted,
                email,
                notes,
                selected: !err,
                validationError: err
            }
        })

        setTempLeads(parsed)
        setStep('review')
        toast.success(`Planilha mapeada! Revisando ${parsed.length} leads.`)
    }

    // Editar dados inline no grid de revisão
    const handleLeadChange = (id: string, field: keyof TempLead, value: any) => {
        setTempLeads(prev => prev.map(lead => {
            if (lead.id !== id) return lead
            
            const updated = { ...lead, [field]: value }
            
            // Revalidar
            let err: string | undefined = undefined
            if (field === 'name' || field === 'phone') {
                const nameVal = field === 'name' ? value : updated.name
                const phoneVal = field === 'phone' ? formatPhone(value) : updated.phone
                if (!nameVal) {
                    err = 'Nome obrigatório'
                } else if (!phoneVal) {
                    err = 'Telefone obrigatório/inválido'
                }
            } else {
                err = updated.validationError
            }

            return {
                ...updated,
                phone: field === 'phone' ? formatPhone(value) : updated.phone,
                validationError: err,
                // Auto-selecionar se corrigiu o erro e estava marcado para importar
                selected: err ? false : lead.selected
            }
        }))
    }

    // Alternar seleção individual
    const toggleSelectLead = (id: string) => {
        setTempLeads(prev => prev.map(l => {
            if (l.id === id) {
                if (l.validationError && !l.selected) {
                    toast.error(`Não é possível selecionar: ${l.validationError}`)
                    return l
                }
                return { ...l, selected: !l.selected }
            }
            return l
        }))
    }

    // Selecionar ou desmarcar todos
    const toggleSelectAll = (checked: boolean) => {
        setTempLeads(prev => prev.map(l => {
            if (l.validationError) return { ...l, selected: false }
            return { ...l, selected: checked }
        }))
    }

    const handleDeleteRow = (id: string) => {
        setTempLeads(prev => prev.filter(l => l.id !== id))
    }

    // Confirmar e Importar Leads no Banco de Dados
    const handleSaveBulk = async () => {
        const leadsToSave = tempLeads.filter(l => l.selected && !l.validationError)
        if (leadsToSave.length === 0) {
            toast.error('Nenhum lead válido selecionado para importação.')
            return
        }

        setIsSaving(true)
        try {
            // Formatar os dados para salvar
            const leadsPayload = leadsToSave.map(l => ({
                name: l.name,
                phone: l.phone,
                email: l.email || undefined,
                notes: l.notes || undefined,
                stage_id: bulkStageId || undefined,
                assigned_to: bulkAssignedTo || undefined
            }))

            const result = await createLeadsBulk(tenantId!, leadsPayload)

            if (result.success && result.data) {
                const { successCount, failCount, errors } = result.data
                toast.success(`Importação concluída! ${successCount} leads criados com sucesso.`)
                if (failCount > 0) {
                    toast.warning(`${failCount} leads falharam. Detalhes: ${errors.join(', ')}`)
                }
                onImportSuccess()
                handleClose()
            } else {
                toast.error(`Erro ao importar leads: ${result.error || 'Erro desconhecido'}`)
            }
        } catch (error) {
            console.error(error)
            toast.error('Erro inesperado ao realizar importação em massa.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        handleResetState()
        onClose()
    }

    const allSelected = tempLeads.length > 0 && tempLeads.filter(l => !l.validationError).every(l => l.selected)
    const selectedCount = tempLeads.filter(l => l.selected).length

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title={
                step === 'review' 
                    ? `Revisar Leads Importados (${tempLeads.length} identificados)` 
                    : step === 'mapping' 
                        ? 'Mapeamento de Colunas da Planilha'
                        : 'Importação de Leads em Massa'
            } 
            size={step === 'review' ? '2xl' : 'md'}
        >
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                {/* ETAPA 1: UPLOAD DO ARQUIVO */}
                {step === 'upload' && (
                    <div className="space-y-5">
                        
                        {/* Seletor de Abas (Tipo de Arquivo) */}
                        <div className="flex items-center border-b border-border overflow-x-auto no-scrollbar mb-4">
                            <button
                                type="button"
                                onClick={() => { setActiveTab('print'); setFile(null); setPreviewUrl(null) }}
                                className={`px-6 py-3 text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'print' ? 'text-foreground border-b-[3px] active-tab-indicator' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ImageIcon size={18} strokeWidth={1} />
                                Print / Imagem
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('pdf'); setFile(null) }}
                                className={`px-6 py-3 text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'pdf' ? 'text-foreground border-b-[3px] active-tab-indicator' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <FileText size={18} strokeWidth={1} />
                                PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('spreadsheet'); setFile(null) }}
                                className={`px-6 py-3 text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'spreadsheet' ? 'text-foreground border-b-[3px] active-tab-indicator' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Table size={18} strokeWidth={1} />
                                Planilha Excel/CSV
                            </button>
                        </div>

                        {/* Informações/Dicas baseadas na aba ativa */}
                        {activeTab === 'print' && (
                            <div className="bg-[#404F4F]/5 border border-[#404F4F]/10 rounded-lg p-3.5 flex gap-3">
                                <ClipboardList className="shrink-0 mt-0.5 text-accent-icon" size={18} />
                                <div>
                                    <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                                        Tire um print de uma tabela de leads do outro CRM e cole aqui. A IA lerá a tabela inteira e extrairá os leads em lote.
                                    </p>
                                    <p className="text-xs text-accent-icon font-bold mt-1.5">
                                        Dica: Use Ctrl+V (ou Cmd+V) para colar a imagem diretamente!
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'pdf' && (
                            <div className="bg-[#404F4F]/5 border border-[#404F4F]/10 rounded-lg p-3.5 flex gap-3">
                                <FileText className="shrink-0 mt-0.5 text-accent-icon" size={18} />
                                <div>
                                    <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                                        Suba um arquivo PDF exportado de outra plataforma. O Gemini irá analisar o texto e tabelas do documento para criar os leads.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'spreadsheet' && (
                            <div className="bg-[#404F4F]/5 border border-[#404F4F]/10 rounded-lg p-3.5 flex gap-3">
                                <CheckCircle2 className="shrink-0 mt-0.5 text-accent-icon" size={18} />
                                <div>
                                    <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                                        Carregue um arquivo Excel (.xlsx, .xls) ou CSV. Você poderá fazer o mapeamento manual rápido de colunas sem consumir créditos de IA.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Motor de IA (Visível apenas para Print e PDF) */}
                        {activeTab !== 'spreadsheet' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Motor de IA</label>
                                <div className="flex gap-2">
                                    <div className="relative flex flex-1 p-1 bg-muted/50 rounded-lg border border-border h-9">
                                        <div className={`absolute inset-y-1 w-[calc(50%-4px)] bg-card rounded-md shadow-sm border border-border/50 transition-all duration-300 ease-out pointer-events-none ${
                                            selectedProvider === 'openai' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                                        }`} />
                                        <button 
                                            type="button"
                                            onClick={() => handleProviderChange('gemini')}
                                            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black transition-colors ${
                                                selectedProvider === 'gemini' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}
                                        >
                                            <Cpu className="w-3 h-3" /> GEMINI
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleProviderChange('openai')}
                                            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black transition-colors ${
                                                selectedProvider === 'openai' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}
                                        >
                                            <Globe className="w-3 h-3" /> GPT
                                        </button>
                                    </div>
                                    <select 
                                        value={selectedModel} 
                                        onChange={(e) => setSelectedModel(e.target.value)}
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
                        )}

                        {/* Área de Seleção de Arquivo */}
                        {!file ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border border-muted-foreground/30 bg-foreground/5 hover:bg-foreground/10 rounded-lg p-10 flex flex-col items-center justify-center gap-3 hover:border-accent-icon/50 transition-all cursor-pointer group animate-in fade-in"
                            >
                                <div className="p-3 bg-muted rounded-full group-hover:bg-[#404F4F]/10 group-hover:text-accent-icon transition-colors">
                                    <Upload size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-foreground">
                                        Clique ou arraste um arquivo para selecionar
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {activeTab === 'print' && 'Formatos aceitos: PNG, JPG, JPEG (máx. 10MB)'}
                                        {activeTab === 'pdf' && 'Formatos aceitos: PDF (máx. 15MB)'}
                                        {activeTab === 'spreadsheet' && 'Formatos aceitos: CSV, XLSX, XLS (máx. 20MB)'}
                                    </p>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    accept={
                                        activeTab === 'print' ? 'image/*' : 
                                        activeTab === 'pdf' ? 'application/pdf' : 
                                        '.csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                                    } 
                                    className="hidden" 
                                />
                            </div>
                        ) : (
                            <div className="bg-card border border-muted-foreground/30 rounded-lg p-4 flex flex-col gap-3 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-secondary/15 text-accent-icon rounded-xl">
                                            {activeTab === 'print' && <ImageIcon size={20} />}
                                            {activeTab === 'pdf' && <FileText size={20} />}
                                            {activeTab === 'spreadsheet' && <CheckCircle2 size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-foreground truncate max-w-[240px]">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => { setFile(null); setPreviewUrl(null) }} 
                                        className="text-xs font-bold text-red-500 hover:underline"
                                    >
                                        Remover
                                    </button>
                                </div>

                                {/* Preview de Imagem se houver */}
                                {previewUrl && activeTab === 'print' && (
                                    <div className="relative rounded-lg overflow-hidden border border-muted-foreground/30 max-h-[160px] flex items-center justify-center bg-muted/20">
                                        <img 
                                            src={previewUrl} 
                                            alt="Preview do print" 
                                            className="object-contain max-h-[160px] w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Botões de rodapé na Etapa 1 */}
                        <div className="flex gap-3 pt-1">
                            <button 
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-foreground hover:bg-muted/50 rounded-lg transition-colors border border-border/50"
                            >
                                Cancelar
                            </button>

                            {activeTab === 'spreadsheet' ? (
                                <button 
                                    type="button"
                                    onClick={handleSpreadsheetNext}
                                    disabled={!file}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-sm font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Mapear Colunas <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={handleStartIAProcessing}
                                    disabled={!file}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-sm font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    <Sparkles size={16} /> Analisar com IA em Massa
                                </button>
                            )}
                        </div>

                    </div>
                )}

                {/* ETAPA 2: CONFIGURAR MAPEAMENTO DE PLANILHA */}
                {step === 'mapping' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-muted/30 p-3 rounded-lg border border-border text-[11px] text-muted-foreground leading-relaxed">
                            Mapeie quais colunas da sua planilha correspondem aos dados de lead do sistema. Nome e Telefone são campos obrigatórios.
                        </div>

                        <div className="space-y-3.5">
                            {/* Nome */}
                            <div>
                                <label className="text-xs font-bold text-gray-800 ml-1">Nome Completo *</label>
                                <select
                                    value={columnMapping.name}
                                    onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px'
                                    }}
                                >
                                    <option value="">-- Selecionar coluna --</option>
                                    {sheetColumns.map(col => <option key={col} value={col}>{col}</option>)}
                                </select>
                            </div>

                            {/* Telefone */}
                            <div>
                                <label className="text-xs font-bold text-gray-800 ml-1">Telefone / WhatsApp *</label>
                                <select
                                    value={columnMapping.phone}
                                    onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px'
                                    }}
                                >
                                    <option value="">-- Selecionar coluna --</option>
                                    {sheetColumns.map(col => <option key={col} value={col}>{col}</option>)}
                                </select>
                            </div>

                            {/* E-mail */}
                            <div>
                                <label className="text-xs font-bold text-gray-800 ml-1">E-mail</label>
                                <select
                                    value={columnMapping.email}
                                    onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px'
                                    }}
                                >
                                    <option value="">-- Ignorar ou selecionar coluna --</option>
                                    {sheetColumns.map(col => <option key={col} value={col}>{col}</option>)}
                                </select>
                            </div>

                            {/* Notas / Observações */}
                            <div>
                                <label className="text-xs font-bold text-gray-800 ml-1">Perfil / Notas / Observações</label>
                                <select
                                    value={columnMapping.notes}
                                    onChange={(e) => setColumnMapping({ ...columnMapping, notes: e.target.value })}
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px'
                                    }}
                                >
                                    <option value="">-- Ignorar ou selecionar coluna --</option>
                                    {sheetColumns.map(col => <option key={col} value={col}>{col}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Botões de rodapé na etapa de mapeamento */}
                        <div className="flex gap-3 pt-3 border-t border-border/40">
                            <button
                                type="button"
                                onClick={() => setStep('upload')}
                                className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-foreground hover:bg-muted/50 rounded-lg transition-colors border border-border/50"
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmMapping}
                                disabled={!columnMapping.name || !columnMapping.phone}
                                className="flex-1 px-4 py-3 md:py-2 text-sm font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] rounded-lg shadow-sm transition-all disabled:opacity-50"
                            >
                                Processar Planilha
                            </button>
                        </div>
                    </div>
                )}

                {/* ETAPA 3: PROCESSANDO LEITURA */}
                {step === 'processing' && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 className="animate-spin text-accent-icon" size={40} />
                        <div className="text-center animate-pulse">
                            <h3 className="text-base font-bold text-foreground">Extraindo Dados via IA...</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-relaxed mx-auto">
                                Analisando tabelas e colunas do arquivo. Isso pode levar de 5 a 15 segundos...
                            </p>
                        </div>
                    </div>
                )}

                {/* ETAPA 4: GRADE DE REVISÃO E AÇÕES EM MASSA */}
                {step === 'review' && (
                    <div className="space-y-4 animate-in fade-in max-h-[70vh] flex flex-col">
                        
                        {/* Caixa de Ações Rápidas em Lote */}
                        <div className="bg-foreground/5 border border-border/50 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Estágio do Funil (Lote)</label>
                                <select
                                    value={bulkStageId}
                                    onChange={(e) => {
                                        setBulkStageId(e.target.value)
                                        // Aplicar opcionalmente a todos
                                        toast.success('Estágio definido para importação.')
                                    }}
                                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring/50 transition-all appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px'
                                    }}
                                >
                                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            {isAdmin && brokers.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Corretor Responsável (Lote)</label>
                                    <select
                                        value={bulkAssignedTo}
                                        onChange={(e) => {
                                            setBulkAssignedTo(e.target.value)
                                            // Atualizar atribuído em lote para todos os leads marcados
                                            setTempLeads(prev => prev.map(l => l.selected ? { ...l, assigned_to: e.target.value } : l))
                                            toast.success('Corretor atribuído aos leads selecionados!')
                                        }}
                                        className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring/50 transition-all appearance-none cursor-pointer"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px'
                                        }}
                                    >
                                        <option value="">-- Distribuição Automática --</option>
                                        {brokers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Grade Tabela de Revisão */}
                        <div className="flex-1 overflow-auto border border-border rounded-lg min-h-[250px] bg-card">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/40 border-b border-border">
                                        <th className="p-2.5 w-10 text-center">
                                            <input 
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                                className="w-4 h-4 text-primary rounded border-border cursor-pointer focus:ring-0 focus:ring-offset-0"
                                            />
                                        </th>
                                        <th className="p-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider">Status</th>
                                        <th className="p-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider min-w-[150px]">Nome Completo</th>
                                        <th className="p-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider min-w-[120px]">Telefone</th>
                                        <th className="p-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider min-w-[150px]">E-mail</th>
                                        <th className="p-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider min-w-[200px]">Perfil / Notas</th>
                                        <th className="p-2.5 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tempLeads.map(l => (
                                        <tr 
                                            key={l.id} 
                                            className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${
                                                l.validationError ? 'bg-red-500/5' : ''
                                            }`}
                                        >
                                            <td className="p-2.5 text-center">
                                                <input 
                                                    type="checkbox"
                                                    checked={l.selected}
                                                    disabled={!!l.validationError}
                                                    onChange={() => toggleSelectLead(l.id)}
                                                    className="w-4 h-4 text-primary rounded border-border cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="p-2.5 whitespace-nowrap">
                                                {l.validationError ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full w-fit">
                                                        <AlertCircle size={10} /> {l.validationError}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full w-fit">
                                                        Válido
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <input 
                                                    type="text" 
                                                    value={l.name}
                                                    onChange={(e) => handleLeadChange(l.id, 'name', e.target.value)}
                                                    placeholder="Digite o nome..."
                                                    className={`w-full bg-transparent border-0 border-b border-transparent focus:border-border px-1 py-0.5 text-xs text-foreground focus:outline-none font-semibold ${
                                                        !l.name ? 'border-red-400 bg-red-400/5' : ''
                                                    }`}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input 
                                                    type="text" 
                                                    value={l.phone}
                                                    onChange={(e) => handleLeadChange(l.id, 'phone', e.target.value)}
                                                    placeholder="Telefone..."
                                                    className={`w-full bg-transparent border-0 border-b border-transparent focus:border-border px-1 py-0.5 text-xs text-foreground focus:outline-none ${
                                                        !l.phone ? 'border-red-400 bg-red-400/5' : ''
                                                    }`}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input 
                                                    type="email" 
                                                    value={l.email}
                                                    onChange={(e) => handleLeadChange(l.id, 'email', e.target.value)}
                                                    placeholder="E-mail..."
                                                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-border px-1 py-0.5 text-xs text-foreground focus:outline-none"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <textarea 
                                                    value={l.notes}
                                                    onChange={(e) => handleLeadChange(l.id, 'notes', e.target.value)}
                                                    placeholder="Notas de interesse..."
                                                    rows={1}
                                                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-border px-1 py-0.5 text-xs text-foreground focus:outline-none resize-y min-h-[24px]"
                                                />
                                            </td>
                                            <td className="p-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRow(l.id)}
                                                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                    title="Excluir lead"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {tempLeads.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                                                Nenhum lead carregado para revisão.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Botões finais de rodapé de confirmação */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border/40 items-center justify-between">
                            <span className="text-xs text-muted-foreground font-semibold">
                                {selectedCount} de {tempLeads.length} leads selecionados para importação
                            </span>
                            <div className="flex gap-2.5 w-full sm:w-auto">
                                <button 
                                    type="button"
                                    onClick={() => setStep('upload')}
                                    className="flex-1 sm:flex-none px-4 py-3 md:py-2 text-sm font-bold text-foreground hover:bg-muted/50 rounded-lg transition-colors border border-border/50"
                                >
                                    Voltar
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleSaveBulk}
                                    disabled={isSaving || selectedCount === 0}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 md:py-2 text-sm font-bold bg-[#FFE600] text-[#404F4F] hover:bg-[#F2DB00] rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {isSaving ? (
                                        <><Loader2 className="animate-spin" size={16} /> Importando...</>
                                    ) : (
                                        <><CheckCircle2 size={16} /> Importar {selectedCount} Leads</>
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </Modal>
    )
}
