'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from '@/components/shared/Modal'
import {
    Upload, Loader2, CheckCircle2, Cpu, Globe, Image as ImageIcon,
    User, Phone, Mail, FileText, Sparkles, ClipboardList
} from 'lucide-react'
import { toast } from 'sonner'
import { getTenantAIConfig } from '@/app/_actions/ai-usage'
import { createLead } from '@/app/_actions/leads'
import { formatPhone } from '@/lib/utils/phone'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'

interface Broker {
    id: string
    full_name: string
}

interface Stage {
    id: string
    name: string
}

interface LeadImportImageModalProps {
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
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4o', name: 'GPT-4o' },
    ]
}

export function LeadImportImageModal({
    isOpen,
    onClose,
    tenantId,
    stages,
    brokers = [],
    isAdmin = false,
    onImportSuccess
}: LeadImportImageModalProps) {
    const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload')
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    
    // Configurações do motor de IA
    const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai'>('gemini')
    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash')

    // Dados extraídos pela IA para revisão
    const [leadData, setLeadData] = useState({
        name: '',
        phone: '',
        email: '',
        notes: '',
        stage_id: '',
        assigned_to: '',
        lead_source: 'Print CRM',
        campaign: ''
    })

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Carregar configuração de IA do tenant ao abrir o modal
    useEffect(() => {
        if (isOpen && tenantId) {
            getTenantAIConfig(tenantId).then((config) => {
                const provider = (config.provider === 'openai' ? 'openai' : 'gemini') as 'gemini' | 'openai'
                setSelectedProvider(provider)
                const models = OCR_MODELS[provider]
                const match = models.find(m => m.id === config.model)
                setSelectedModel(match ? config.model : models[0].id)
            }).catch(() => {})

            // Definir estágio inicial padrão
            if (stages.length > 0) {
                setLeadData(prev => ({ ...prev, stage_id: stages[0].id }))
            }
        }
    }, [isOpen, tenantId, stages])

    // Lidar com evento de colar (paste) da área de transferência
    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (step !== 'upload' || !isOpen) return
        
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile()
                if (blob) {
                    // Criar um File a partir do Blob
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
    }, [step, isOpen])

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
        if (f && f.type.startsWith('image/')) {
            setFile(f)
            const url = URL.createObjectURL(f)
            setPreviewUrl(url)
        } else {
            toast.error('Selecione um arquivo de imagem válido (PNG, JPG, JPEG).')
            setFile(null)
            setPreviewUrl(null)
        }
    }

    const handleStartProcessing = async () => {
        if (!file || !tenantId) return

        setIsProcessing(true)
        setStep('processing')
        
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('tenant_id', tenantId)
            formData.append('ai_provider', selectedProvider)
            formData.append('ai_model', selectedModel)

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-lead-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
                body: formData
            })

            const result = await response.json()

            if (response.ok && result.success && result.data) {
                const extracted = result.data
                
                // Formatar o telefone extraído se houver
                const formattedPhone = extracted.phone ? formatPhone(extracted.phone) : ''
                
                setLeadData(prev => ({
                    ...prev,
                    name: extracted.name || '',
                    phone: formattedPhone,
                    email: extracted.email || '',
                    notes: extracted.notes || '',
                }))
                
                setStep('review')
                toast.success('Leitura concluída! Por favor, revise os dados.')
            } else {
                throw new Error(result.error || 'Erro ao processar imagem')
            }
        } catch (error: any) {
            console.error('Erro ao processar imagem:', error)
            toast.error(error.message || 'Ocorreu um erro ao processar o print.')
            setStep('upload')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleSaveLead = async () => {
        if (!leadData.name || !leadData.phone || !tenantId) {
            toast.error('Nome e Telefone são obrigatórios')
            return
        }

        if (!leadData.stage_id) {
            toast.error('Selecione um estágio inicial')
            return
        }

        setIsSaving(true)
        try {
            const result = await createLead(tenantId, {
                ...leadData,
                value: 0,
                interest: 'Importado via Print',
                property_interest: leadData.notes ? leadData.notes.substring(0, 150) : 'Lead de Print'
            })

            if (result.success) {
                toast.success('Lead importado com sucesso!')
                onImportSuccess()
                handleClose()
            } else {
                toast.error('Erro ao salvar lead: ' + result.error)
            }
        } catch (error) {
            console.error('Erro ao salvar lead:', error)
            toast.error('Erro ao salvar o lead importado.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        setFile(null)
        setPreviewUrl(null)
        setStep('upload')
        setLeadData({
            name: '',
            phone: '',
            email: '',
            notes: '',
            stage_id: stages[0]?.id || '',
            assigned_to: '',
            lead_source: 'Print CRM',
            campaign: ''
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
        onClose()
    }

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title={step === 'review' ? "Revisar Lead da IA" : "Importar Lead por Print (IA)"} 
            size={step === 'review' ? 'xl' : 'md'}
        >
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                {/* ETAPA 1: UPLOAD/COLAGEM DA IMAGEM */}
                {step === 'upload' && (
                    <div className="space-y-5">
                        
                        {/* Caixa de Dica e Explicação */}
                        <div className="bg-[#404F4F]/5 border border-[#404F4F]/10 rounded-lg p-4 flex gap-3">
                            <ClipboardList className="shrink-0 mt-0.5 text-accent-icon" size={18} />
                            <div>
                                <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                                    Tire um print da tela do outro CRM (contendo o nome, telefone e outras informações do lead), e faça o upload abaixo.
                                </p>
                                <p className="text-xs text-accent-icon font-bold mt-1.5 animate-pulse">
                                    Dica: Você também pode simplesmente pressionar Ctrl+V (ou Cmd+V) para colar o print diretamente!
                                </p>
                            </div>
                        </div>

                        {/* Configurações do Motor de IA */}
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

                        {/* Área de Upload / Colagem / Drag & Drop */}
                        {!file ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border border-muted-foreground/30 bg-foreground/5 hover:bg-foreground/10 rounded-lg p-10 flex flex-col items-center justify-center gap-3 hover:border-accent-icon/50 transition-all cursor-pointer group"
                            >
                                <div className="p-3 bg-muted rounded-full group-hover:bg-[#404F4F]/10 group-hover:text-accent-icon transition-colors">
                                    <Upload size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-foreground">Clique ou arraste um print para selecionar</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Formatos aceitos: PNG, JPG, JPEG (máx. 10MB)
                                    </p>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    accept="image/*" 
                                    className="hidden" 
                                />
                            </div>
                        ) : (
                            <div className="bg-card border border-muted-foreground/30 rounded-lg p-4 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-secondary/15 text-accent-icon rounded-xl">
                                            <ImageIcon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground truncate max-w-[200px]">{file.name}</p>
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

                                {/* Preview da imagem colada/carregada */}
                                {previewUrl && (
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

                        {/* Botões de Ação */}
                        <div className="flex gap-3 pt-1">
                            <button 
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-foreground hover:bg-muted/50 rounded-lg transition-colors border border-border/50"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={handleStartProcessing}
                                disabled={!file}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-sm font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                <Sparkles size={16} /> Analisar Print com IA
                            </button>
                        </div>

                    </div>
                )}

                {/* ETAPA 2: PROCESSANDO A LEITURA */}
                {step === 'processing' && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 className="animate-spin text-accent-icon" size={40} />
                        <div className="text-center">
                            <h3 className="text-base font-bold text-foreground">Analisando Imagem...</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
                                A IA está extraindo as informações de lead da imagem. Isso levará alguns segundos...
                            </p>
                        </div>
                    </div>
                )}

                {/* ETAPA 3: REVISAR E CONFIRMAR DADOS */}
                {step === 'review' && (
                    <div className="space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <div className="col-span-1 md:col-span-2">
                                <FormInput
                                    label="Nome Completo *"
                                    value={leadData.name}
                                    onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                                    placeholder="Ex: Pablo Luiz de Arruda"
                                />
                            </div>

                            <div>
                                <FormInput
                                    label="Telefone *"
                                    value={leadData.phone}
                                    onChange={(e) => setLeadData({ ...leadData, phone: formatPhone(e.target.value) })}
                                    placeholder="Ex: (48) 98415-3533"
                                />
                            </div>

                            <div>
                                <FormInput
                                    label="E-mail"
                                    type="email"
                                    value={leadData.email}
                                    onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                                    placeholder="Ex: pablo.arruda01@gmail.com"
                                />
                            </div>

                            <div>
                                <FormSelect
                                    label="Estágio Inicial *"
                                    value={leadData.stage_id}
                                    onChange={(e) => setLeadData({ ...leadData, stage_id: e.target.value })}
                                    options={[
                                        { value: '', label: 'Selecione o estágio' },
                                        ...stages.map(s => ({ value: s.id, label: s.name }))
                                    ]}
                                />
                            </div>

                            {isAdmin && brokers.length > 0 && (
                                <div>
                                    <FormSelect
                                        label="Corretor Responsável"
                                        value={leadData.assigned_to}
                                        onChange={(e) => setLeadData({ ...leadData, assigned_to: e.target.value })}
                                        options={[
                                            { value: '', label: 'Não atribuído' },
                                            ...brokers.map(b => ({ value: b.id, label: b.full_name }))
                                        ]}
                                    />
                                </div>
                            )}

                            <div className={isAdmin && brokers.length > 0 ? "col-span-1" : "col-span-1 md:col-span-2"}>
                                <FormInput
                                    label="Origem do Lead"
                                    value={leadData.lead_source}
                                    onChange={(e) => setLeadData({ ...leadData, lead_source: e.target.value })}
                                    placeholder="Ex: Print CRM"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <FormTextarea
                                    label="Notas / Perfil de Interesse Extraído"
                                    value={leadData.notes}
                                    onChange={(e) => setLeadData({ ...leadData, notes: e.target.value })}
                                    rows={4}
                                    placeholder="Detalhes adicionais do lead..."
                                />
                            </div>

                        </div>

                        {/* Botões de Ação */}
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
                                onClick={handleSaveLead}
                                disabled={isSaving || !leadData.name || !leadData.phone}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-sm font-bold bg-[#FFE600] text-[#404F4F] hover:bg-[#F2DB00] rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {isSaving ? (
                                    <><Loader2 className="animate-spin" size={16} /> Salvando...</>
                                ) : (
                                    <><CheckCircle2 size={16} /> Confirmar e Criar Lead</>
                                )}
                            </button>
                        </div>

                    </div>
                )}

            </div>
        </Modal>
    )
}
