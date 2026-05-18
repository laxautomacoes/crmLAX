'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { 
    Send, Users, FileSpreadsheet, Image as ImageIcon, Video, FileText, X, Loader2, 
    CheckCircle2, AlertCircle, Info, HelpCircle, Filter, History, ChevronDown, ChevronUp, Clock, Ban,
    Link, Unlink, Trash2, Globe, ExternalLink, BookOpen, Save, Type
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { 
    checkWhatsAppStatus, sendSingleBulkMessage, validateBulkAccess, 
    getLeadsForBulk, getBulkFilterOptions, createBulkCampaign, updateBulkCampaign, getBulkCampaigns,
    matchRecipientsWithLeads, fetchGoogleSheetData, fetchGoogleSheetTabs,
    saveBulkTemplate, getBulkTemplates, deleteBulkTemplate,
    logBulkRecipientResult, getBulkCampaignRecipients,
    deleteBulkCampaign, deleteAllBulkCampaigns
} from '@/app/_actions/whatsapp-bulk'
import { createClient } from '@/lib/supabase/client'
import { formatPhone } from '@/lib/utils/phone'
import { normalizeWhatsAppNumber, isValidWhatsAppNumber } from '@/lib/utils/whatsapp-utils'

// ─── Aliases de colunas para detecção flexível ─────────────────────────────────

const NAME_ALIASES = ['nome', 'name', 'cliente', 'contato', 'razao social', 'razao_social', 'empresa']
const PHONE_ALIASES = ['telefone', 'phone', 'celular', 'whatsapp', 'tel', 'fone', 'mobile', 'numero', 'número', 'contato_telefone']

function findColumnValue(row: Record<string, any>, aliases: string[]): string | undefined {
    const keys = Object.keys(row)
    for (const alias of aliases) {
        const match = keys.find(k => k.toLowerCase().trim() === alias)
        if (match && row[match] !== undefined && row[match] !== null) return String(row[match])
    }
    return undefined
}

interface Recipient {
    name: string
    phone: string
    lead_id?: string
    isInvalid?: boolean
}

interface ImportStats {
    total: number
    valid: number
    invalid: number
    duplicates: number
    linked: number
    duplicateList: { name: string; phone: string }[]
}

interface FilterOptions {
    stages: { id: string; name: string; order_index: number; color: string | null }[]
    sources: { id: string; name: string }[]
    campaigns: { id: string; name: string; source_name: string }[]
    brokers: { id: string; full_name: string }[]
    isAdmin: boolean
}

interface BulkTemplate {
    id: string; name: string; message: string | null;
    media_url: string | null; media_type: string | null; media_name: string | null;
    created_at: string;
}

interface RecipientResult {
    id: string; recipient_name: string; recipient_phone: string; lead_id: string | null;
    status: string; error_message: string | null; sent_at: string;
}

interface CampaignRecord {
    id: string; title: string | null; message: string; total_recipients: number; total_success: number; total_errors: number;
    status: string; source_type: string; created_at: string; completed_at: string | null;
    profiles: { full_name: string } | null;
}

interface BulkSenderFormProps {
    tenantId: string
    profileId: string
    isAdmin: boolean
}

export function BulkSenderForm({ tenantId, profileId, isAdmin }: BulkSenderFormProps) {
    const [campaignTitle, setCampaignTitle] = useState('')
    const [message, setMessage] = useState('')
    const [recipients, setRecipients] = useState<Recipient[]>([])
    const [sourceType, setSourceType] = useState<'system' | 'file' | null>(null)
    const [isMediaUploading, setIsMediaUploading] = useState(false)
    const [media, setMedia] = useState<{ url: string; type: 'image' | 'video' | 'document'; name: string } | null>(null)
    const [isSending, setIsSending] = useState(false)
    const [stopRequested, setStopRequested] = useState(false)
    const [results, setResults] = useState({ success: 0, error: 0 })
    const [isFinished, setIsFinished] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [isSelectingLeads, setIsSelectingLeads] = useState(false)
    // Filtros
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
    const [selectedStages, setSelectedStages] = useState<string[]>([])
    const [selectedSource, setSelectedSource] = useState('')
    const [selectedCampaign, setSelectedCampaign] = useState('')
    const [selectedBroker, setSelectedBroker] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    // Histórico
    const [campaignHistory, setCampaignHistory] = useState<CampaignRecord[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    // Campanha atual
    const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null)
    // Detalhes de campanha expandida
    const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
    const [campaignRecipients, setCampaignRecipients] = useState<RecipientResult[]>([])
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)
    // Delete de histórico
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
    // Plan
    const [planRemaining, setPlanRemaining] = useState<number | null>(null)
    // Import stats
    const [importStats, setImportStats] = useState<ImportStats | null>(null)
    const [showDuplicates, setShowDuplicates] = useState(false)
    const [showInvalids, setShowInvalids] = useState(false)
    const [isLinking, setIsLinking] = useState(false)
    // Google Sheets
    const [showGoogleSheet, setShowGoogleSheet] = useState(false)
    const [googleSheetUrl, setGoogleSheetUrl] = useState('')
    const [isLoadingSheet, setIsLoadingSheet] = useState(false)
    // Seleção de aba da planilha
    const [showSheetPicker, setShowSheetPicker] = useState(false)
    const [availableSheets, setAvailableSheets] = useState<string[]>([])
    const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null)
    const [sheetPickerSource, setSheetPickerSource] = useState<'file' | 'google'>('file')
    const [googleSheetTabs, setGoogleSheetTabs] = useState<{ name: string; gid: string }[]>([])
    const [pendingGoogleSheetId, setPendingGoogleSheetId] = useState<string>('')
    // Templates
    const [templates, setTemplates] = useState<BulkTemplate[]>([])
    const [showTemplates, setShowTemplates] = useState(false)
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
    const [showSaveTemplate, setShowSaveTemplate] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [isSavingTemplate, setIsSavingTemplate] = useState(false)
    
    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaInputRef = useRef<HTMLInputElement>(null)

    // Carregar opções de filtro ao montar
    useEffect(() => {
        const loadFilters = async () => {
            const result = await getBulkFilterOptions(tenantId)
            if (result.success && result.data) setFilterOptions(result.data)
        }
        loadFilters()
    }, [tenantId])

    // Proteção contra fechar aba durante envio
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isSending) { e.preventDefault(); e.returnValue = '' }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isSending])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (evt) => {
            const bstr = evt.target?.result
            const wb = XLSX.read(bstr, { type: 'binary' })

            if (wb.SheetNames.length > 1) {
                // Múltiplas abas: abrir modal para o usuário escolher
                setAvailableSheets(wb.SheetNames)
                setPendingWorkbook(wb)
                setSheetPickerSource('file')
                setShowSheetPicker(true)
            } else {
                // Apenas uma aba: processar direto
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = XLSX.utils.sheet_to_json(ws) as any[]
                await processImportedData(data)
            }
        }
        reader.readAsBinaryString(file)
        // Limpar input para permitir reupload do mesmo arquivo
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSheetSelection = async (sheetName: string) => {
        setShowSheetPicker(false)

        if (sheetPickerSource === 'file' && pendingWorkbook) {
            const ws = pendingWorkbook.Sheets[sheetName]
            const data = XLSX.utils.sheet_to_json(ws) as any[]
            setPendingWorkbook(null)
            setAvailableSheets([])
            await processImportedData(data)
        } else if (sheetPickerSource === 'google') {
            // Buscar dados da aba selecionada do Google Sheets
            const selectedTab = googleSheetTabs.find(t => t.name === sheetName)
            if (!selectedTab || !pendingGoogleSheetId) return

            setIsLoadingSheet(true)
            try {
                const result = await fetchGoogleSheetData(
                    `https://docs.google.com/spreadsheets/d/${pendingGoogleSheetId}/edit#gid=${selectedTab.gid}`
                )
                if (!result.success || !result.csvData) {
                    toast.error(result.error || 'Erro ao acessar a aba.')
                    return
                }
                const wb = XLSX.read(result.csvData, { type: 'string' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = XLSX.utils.sheet_to_json(ws) as any[]
                await processImportedData(data)
                setShowGoogleSheet(false)
                setGoogleSheetUrl('')
                setGoogleSheetTabs([])
                setPendingGoogleSheetId('')
            } catch (error: any) {
                toast.error('Erro ao processar aba: ' + error.message)
            } finally {
                setIsLoadingSheet(false)
            }
        }
    }

    const handleRemoveInvalids = () => {
        const filtered = recipients.filter(r => !r.isInvalid)
        const removed = recipients.length - filtered.length
        setRecipients(filtered)
        if (importStats) {
            setImportStats({ ...importStats, invalid: 0, valid: filtered.length })
        }
        toast.success(`${removed} número(s) inválido(s) removido(s).`)
        setShowInvalids(false)
    }

    // Pipeline reutilizável de processamento de dados importados
    const processImportedData = async (data: Record<string, any>[]) => {
        // 1. Detecção flexível de colunas
        const mapped = data.map(row => {
            const name = findColumnValue(row, NAME_ALIASES) || 'Cliente'
            const rawPhone = findColumnValue(row, PHONE_ALIASES) || ''
            const phone = rawPhone.replace(/\D/g, '')
            return { name, phone }
        }).filter(r => r.phone.length >= 8)

        if (mapped.length === 0) {
            toast.error('Nenhum contato válido encontrado. Verifique se a planilha tem colunas de Nome e Telefone.')
            return
        }

        // 2. Deduplicação por telefone normalizado
        const seen = new Map<string, typeof mapped[0]>()
        const duplicateList: { name: string; phone: string }[] = []
        for (const r of mapped) {
            const normalized = r.phone.replace(/\D/g, '')
            if (seen.has(normalized)) {
                duplicateList.push(r)
            } else {
                seen.set(normalized, r)
            }
        }
        const unique = Array.from(seen.values())

        // 3. Validação prévia de formato
        const withValidation: Recipient[] = unique.map(r => {
            const normalized = normalizeWhatsAppNumber(r.phone)
            const valid = isValidWhatsAppNumber(normalized)
            return { ...r, phone: r.phone, isInvalid: !valid }
        })

        const validCount = withValidation.filter(r => !r.isInvalid).length
        const invalidCount = withValidation.filter(r => r.isInvalid).length

        // 4. Vinculação automática com leads existentes
        setIsLinking(true)
        setRecipients(withValidation)
        setSourceType('file')

        let linkedCount = 0
        try {
            const phonesToMatch = withValidation
                .filter(r => !r.isInvalid)
                .map(r => r.phone)
            
            if (phonesToMatch.length > 0) {
                const matchResult = await matchRecipientsWithLeads(tenantId, phonesToMatch)
                if (matchResult.success && Object.keys(matchResult.matches).length > 0) {
                    const updated = withValidation.map(r => {
                        const normalized = normalizeWhatsAppNumber(r.phone)
                        const leadId = matchResult.matches[normalized]
                        return leadId ? { ...r, lead_id: leadId } : r
                    })
                    setRecipients(updated)
                    linkedCount = Object.keys(matchResult.matches).length
                }
            }
        } catch (err) {
            console.error('Erro ao vincular leads:', err)
        } finally {
            setIsLinking(false)
        }

        // 5. Montar stats
        setImportStats({
            total: mapped.length,
            valid: validCount,
            invalid: invalidCount,
            duplicates: duplicateList.length,
            linked: linkedCount,
            duplicateList
        })

        toast.success(`${unique.length} contatos importados.`)
    }

    const handleGoogleSheetImport = async () => {
        if (!googleSheetUrl.trim()) {
            toast.error('Cole o link da planilha do Google Sheets.')
            return
        }

        setIsLoadingSheet(true)
        try {
            // Extrair o sheet ID da URL
            const sheetIdMatch = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
            const sheetId = sheetIdMatch?.[1] || ''

            // Tentar buscar a lista de abas da planilha via server action
            if (sheetId) {
                try {
                    const tabsResult = await fetchGoogleSheetTabs(googleSheetUrl.trim())
                    if (tabsResult.success && tabsResult.tabs && tabsResult.tabs.length > 1) {
                        setGoogleSheetTabs(tabsResult.tabs)
                        setPendingGoogleSheetId(sheetId)
                        setSheetPickerSource('google')
                        setAvailableSheets(tabsResult.tabs.map(t => t.name))
                        setShowSheetPicker(true)
                        setIsLoadingSheet(false)
                        return
                    }
                } catch {
                    // Se não conseguir detectar abas, prossegue normalmente
                }
            }

            // Se só tem uma aba ou não conseguiu detectar, importar direto
            const result = await fetchGoogleSheetData(googleSheetUrl.trim())
            if (!result.success || !result.csvData) {
                toast.error(result.error || 'Erro ao acessar a planilha.')
                return
            }

            // Parsear CSV com SheetJS
            const wb = XLSX.read(result.csvData, { type: 'string' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json(ws) as any[]

            await processImportedData(data)
            setShowGoogleSheet(false)
            setGoogleSheetUrl('')
        } catch (error: any) {
            toast.error('Erro ao processar planilha: ' + error.message)
        } finally {
            setIsLoadingSheet(false)
        }
    }

    const handleFetchSystemLeads = async () => {
        setIsSelectingLeads(true)
        try {
            const filters: any = {}
            if (selectedStages.length > 0) filters.stageIds = selectedStages
            if (selectedSource) filters.leadSource = selectedSource
            if (selectedCampaign) filters.campaign = selectedCampaign
            if (selectedBroker) filters.assignedTo = selectedBroker

            const result = await getLeadsForBulk(tenantId, filters)
            if (result.success && result.data) {
                setRecipients(result.data)
                setSourceType('system')
                toast.success(`${result.data.length} leads selecionados com filtros.`)
            } else {
                toast.error(result.error || 'Erro ao buscar leads.')
            }
        } catch (error: any) {
            toast.error('Erro ao buscar leads: ' + error.message)
        } finally {
            setIsSelectingLeads(false)
        }
    }

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('crm-attachments')
                .getPublicUrl(filePath)

            let type: 'image' | 'video' | 'document' = 'document'
            if (file.type.startsWith('image/')) type = 'image'
            else if (file.type.startsWith('video/')) type = 'video'

            setMedia({ url: publicUrl, type, name: file.name })
            toast.success('Arquivo anexado com sucesso!')
        } catch (error: any) {
            toast.error('Erro no upload: ' + error.message)
        } finally {
            setIsMediaUploading(false)
        }
    }

    const stopRef = useRef(false)
    const handleStop = () => {
        stopRef.current = true
        setStopRequested(true)
    }

    const handleSend = async () => {
        if (!campaignTitle.trim()) return toast.error('Dê um título para esta campanha.')
        if (recipients.length === 0) return toast.error('Selecione os destinatários.')
        if (!message && !media) return toast.error('Escreva uma mensagem ou anexe um arquivo.')

        // Validar plano
        const access = await validateBulkAccess()
        if (!access.allowed) return toast.error(access.error)
        if (access.remaining !== null && access.remaining !== undefined && recipients.length > access.remaining) {
            return toast.error(`Você só pode enviar mais ${access.remaining} mensagens este mês. Reduza a lista ou faça upgrade.`)
        }
        setPlanRemaining(access.remaining ?? null)

        const status = await checkWhatsAppStatus()
        if (!status.connected || !status.instanceName) {
            return toast.error(status.error)
        }

        // Criar registro da campanha
        const campaignResult = await createBulkCampaign({
            tenantId, profileId, title: campaignTitle.trim(), message,
            mediaUrl: media?.url, mediaType: media?.type, mediaName: media?.name,
            totalRecipients: recipients.length,
            filtersApplied: { stages: selectedStages, source: selectedSource, campaign: selectedCampaign, broker: selectedBroker },
            sourceType: sourceType || 'system'
        })
        const campId = campaignResult.data?.id || null
        setCurrentCampaignId(campId)

        setIsSending(true)
        stopRef.current = false
        setStopRequested(false)
        setIsFinished(false)
        setResults({ success: 0, error: 0 })
        setProgress({ current: 0, total: recipients.length })

        const total = recipients.length
        let currentSuccess = 0
        let currentError = 0

        for (let i = 0; i < total; i++) {
            if (stopRef.current) break
            const recipient = recipients[i]
            let sendStatus: 'success' | 'error' = 'error'
            let errorMsg = ''
            try {
                const res = await sendSingleBulkMessage({
                    recipient, message,
                    mediaUrl: media?.url, mediaType: media?.type, fileName: media?.name,
                    instanceName: status.instanceName
                })
                if (res.success) { currentSuccess++; sendStatus = 'success' }
                else { currentError++; errorMsg = res.error || 'Erro desconhecido' }
            } catch (err: any) { currentError++; errorMsg = err?.message || 'Erro de conexão' }

            // Gravar resultado individual
            if (campId) {
                logBulkRecipientResult({
                    campaignId: campId, tenantId,
                    recipientName: recipient.name, recipientPhone: recipient.phone,
                    leadId: recipient.lead_id,
                    status: sendStatus, errorMessage: errorMsg || undefined
                })
            }

            setResults({ success: currentSuccess, error: currentError })
            setProgress({ current: i + 1, total })

            if (i + 1 < total && !stopRef.current) {
                await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500))
            }
        }

        setIsSending(false)
        setIsFinished(true)

        // Atualizar campanha no banco
        const finalStatus = stopRef.current ? 'cancelled' : 'completed'
        if (campId) {
            await updateBulkCampaign(campId, { totalSuccess: currentSuccess, totalErrors: currentError, status: finalStatus as any })
        }

        if (stopRef.current) toast.warning('Disparo interrompido pelo usuário.')
        else toast.success('Processo de disparo concluído!')
    }

    const handleLoadHistory = async () => {
        setShowHistory(!showHistory)
        if (!showHistory) {
            setIsLoadingHistory(true)
            const result = await getBulkCampaigns(tenantId)
            if (result.success && result.data) setCampaignHistory(result.data as CampaignRecord[])
            setIsLoadingHistory(false)
        }
    }

    const handleExpandCampaign = async (campaignId: string) => {
        if (expandedCampaignId === campaignId) {
            setExpandedCampaignId(null)
            setCampaignRecipients([])
            return
        }
        setExpandedCampaignId(campaignId)
        setIsLoadingRecipients(true)
        const result = await getBulkCampaignRecipients(campaignId, 'error')
        if (result.success && result.data) setCampaignRecipients(result.data as RecipientResult[])
        setIsLoadingRecipients(false)
    }

    const handleDeleteCampaign = async (campaignId: string) => {
        const result = await deleteBulkCampaign(campaignId)
        if (result.success) {
            setCampaignHistory(prev => prev.filter(c => c.id !== campaignId))
            if (expandedCampaignId === campaignId) {
                setExpandedCampaignId(null)
                setCampaignRecipients([])
            }
            toast.success('Campanha excluída.')
        } else {
            toast.error(result.error || 'Erro ao excluir.')
        }
    }

    const handleDeleteAllCampaigns = async () => {
        const result = await deleteAllBulkCampaigns(tenantId)
        if (result.success) {
            setCampaignHistory([])
            setExpandedCampaignId(null)
            setCampaignRecipients([])
            setConfirmDeleteAll(false)
            toast.success('Histórico limpo com sucesso.')
        } else {
            toast.error(result.error || 'Erro ao limpar histórico.')
        }
    }

    // ─── Template Handlers ──────────────────────────────────────────────────────

    const handleLoadTemplates = async () => {
        setShowTemplates(!showTemplates)
        if (!showTemplates) {
            setIsLoadingTemplates(true)
            const result = await getBulkTemplates(tenantId)
            if (result.success && result.data) setTemplates(result.data as BulkTemplate[])
            setIsLoadingTemplates(false)
        }
    }

    const handleSelectTemplate = (template: BulkTemplate) => {
        setMessage(template.message || '')
        if (template.media_url && template.media_type) {
            setMedia({
                url: template.media_url,
                type: template.media_type as 'image' | 'video' | 'document',
                name: template.media_name || 'Arquivo'
            })
        } else {
            setMedia(null)
        }
        setShowTemplates(false)
        toast.success(`Template "${template.name}" carregado!`)
    }

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) return toast.error('Dê um nome ao template.')
        if (!message && !media) return toast.error('Escreva uma mensagem ou anexe mídia para salvar.')

        setIsSavingTemplate(true)
        const result = await saveBulkTemplate({
            tenantId,
            name: templateName.trim(),
            message: message || undefined,
            mediaUrl: media?.url,
            mediaType: media?.type,
            mediaName: media?.name
        })
        setIsSavingTemplate(false)

        if (result.success) {
            toast.success('Template salvo com sucesso!')
            setShowSaveTemplate(false)
            setTemplateName('')
        } else {
            toast.error(result.error || 'Erro ao salvar template.')
        }
    }

    const handleDeleteTemplate = async (templateId: string) => {
        const result = await deleteBulkTemplate(templateId)
        if (result.success) {
            setTemplates(prev => prev.filter(t => t.id !== templateId))
            toast.success('Template excluído.')
        } else {
            toast.error(result.error || 'Erro ao excluir template.')
        }
    }

    return (
        <div className="bg-card p-6 rounded-2xl border border-muted-foreground/30 shadow-sm space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Composição */}
                <div className="space-y-6">
                    {/* Título da Campanha */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-foreground ml-1">
                            Título da Campanha
                        </label>
                        <input
                            type="text"
                            value={campaignTitle}
                            onChange={(e) => setCampaignTitle(e.target.value)}
                            placeholder="Ex: Lançamento Residencial Park Sul"
                            className="w-full h-10 px-3 text-sm font-medium bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-foreground placeholder:text-muted-foreground/50"
                        />
                    </div>

                    {/* Mensagem + Templates */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-foreground ml-1">Mensagem do WhatsApp</label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleLoadTemplates}
                                    className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                                        showTemplates
                                            ? 'bg-foreground/10 border-border text-foreground'
                                            : 'bg-foreground/5 border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                                    }`}
                                >
                                    <BookOpen size={12} />
                                    Templates
                                </button>
                                {(message || media) && (
                                    <button
                                        onClick={() => setShowSaveTemplate(true)}
                                        className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border bg-foreground/5 border-border/40 text-muted-foreground hover:border-green-500/40 hover:text-green-500 transition-all"
                                    >
                                        <Save size={12} />
                                        Salvar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Lista de Templates */}
                        {showTemplates && (
                            <div className="p-3 bg-foreground/5 rounded-xl border border-border/40 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Templates Salvos</p>
                                {isLoadingTemplates ? (
                                    <div className="flex items-center justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" size={16} /></div>
                                ) : templates.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum template salvo ainda.</p>
                                ) : (
                                    <div className="max-h-[200px] overflow-y-auto space-y-1.5 custom-scrollbar">
                                        {templates.map(t => (
                                            <div key={t.id} className="flex items-center justify-between p-2.5 bg-foreground/5 rounded-lg border border-border/40 hover:border-border transition-colors group">
                                                <button
                                                    onClick={() => handleSelectTemplate(t)}
                                                    className="flex-1 min-w-0 text-left"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                                                        {t.media_type && (
                                                            <span className="shrink-0">
                                                                {t.media_type === 'image' && <ImageIcon size={10} className="text-blue-400" />}
                                                                {t.media_type === 'video' && <Video size={10} className="text-purple-400" />}
                                                                {t.media_type === 'document' && <FileText size={10} className="text-amber-500" />}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {t.message && (
                                                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                            {t.message.substring(0, 60)}{t.message.length > 60 ? '...' : ''}
                                                        </p>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(t.id)}
                                                    className="p-1.5 text-muted-foreground/50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                                                    title="Excluir template"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <FormTextarea 
                            placeholder="Olá {nome}, tudo bem? Confira esta oportunidade..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={8}
                        />
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 italic">
                            <Info size={12} /> Use {"{nome}"} ou {"{primeiro_nome}"} para personalizar.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-foreground ml-1">Anexar Mídia ou Documento</label>
                        <div className="flex flex-wrap gap-2">
                            <input 
                                type="file" 
                                ref={mediaInputRef} 
                                className="hidden" 
                                onChange={handleMediaUpload}
                                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                            />
                            {media ? (
                                <div className="relative group w-full">
                                    {media.type === 'image' ? (
                                        <div className="relative max-h-[180px] rounded-2xl overflow-hidden border border-border/40 shadow-sm bg-foreground/5 flex items-center justify-center">
                                            <img src={media.url} alt="Preview" className="max-h-[180px] w-auto object-contain" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white text-xs font-bold">{media.name}</p>
                                            </div>
                                        </div>
                                    ) : media.type === 'video' ? (
                                        <div className="relative max-h-[180px] rounded-2xl overflow-hidden border border-border/40 shadow-sm bg-black flex items-center justify-center">
                                            <video 
                                                src={media.url} 
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
                                                <p className="text-white text-[10px] font-bold bg-black/40 px-2 py-1 rounded backdrop-blur-sm truncate max-w-[200px]">{media.name}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 p-5 bg-foreground/5 rounded-2xl border-2 border-dashed border-border/40 w-full group-hover:bg-foreground/10 transition-colors">
                                            <div className="w-14 h-14 rounded-xl bg-card shadow-sm flex items-center justify-center text-foreground border border-border/40">
                                                <FileText size={32} strokeWidth={1.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">{media.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">Documento • PDF/Excel</p>
                                            </div>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setMedia(null)}
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
                                    className="flex-1 flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border/40 rounded-2xl hover:border-accent-icon hover:bg-accent-icon/5 transition-all text-muted-foreground hover:text-foreground group"
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

                {/* Destinatários */}
                <div className="space-y-6">
                    <label className="text-sm font-bold text-foreground ml-1">Destinatários ({recipients.length})</label>
                    
                    {recipients.length === 0 ? (
                        <div className="space-y-4">
                            {/* Filtros */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-accent-icon transition-colors"
                            >
                                <Filter size={14} />
                                <span>Filtros de Segmentação</span>
                                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {showFilters && filterOptions && (
                                <div className="space-y-3 p-4 bg-foreground/5 rounded-xl border border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Estágios */}
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Estágio do Funil</label>
                                        <select
                                            value={selectedStages[0] || ''}
                                            onChange={e => setSelectedStages(e.target.value ? [e.target.value] : [])}
                                            className="w-full h-9 px-3 text-xs font-bold bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:border-ring text-foreground"
                                        >
                                            <option value="">Todos os estágios</option>
                                            {filterOptions.stages.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                        </select>
                                    </div>
                                    {/* Origem */}
                                    {filterOptions.sources.length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Origem</label>
                                            <select
                                                value={selectedSource}
                                                onChange={e => { setSelectedSource(e.target.value); setSelectedCampaign('') }}
                                                className="w-full h-9 px-3 text-xs font-bold bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:border-ring text-foreground"
                                            >
                                                <option value="">Todas as origens</option>
                                                {filterOptions.sources.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}
                                            </select>
                                        </div>
                                    )}
                                    {/* Campanha */}
                                    {selectedSource && filterOptions.campaigns.filter(c => c.source_name === selectedSource).length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Campanha</label>
                                            <select
                                                value={selectedCampaign}
                                                onChange={e => setSelectedCampaign(e.target.value)}
                                                className="w-full h-9 px-3 text-xs font-bold bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:border-ring text-foreground"
                                            >
                                                <option value="">Todas</option>
                                                {filterOptions.campaigns.filter(c => c.source_name === selectedSource).map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}
                                            </select>
                                        </div>
                                    )}
                                    {/* Corretor (só admin) */}
                                    {isAdmin && filterOptions.brokers.length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Corretor</label>
                                            <select
                                                value={selectedBroker}
                                                onChange={e => setSelectedBroker(e.target.value)}
                                                className="w-full h-9 px-3 text-xs font-bold bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:border-ring text-foreground"
                                            >
                                                <option value="">Todos os corretores</option>
                                                {filterOptions.brokers.map(b => (<option key={b.id} value={b.id}>{b.full_name}</option>))}
                                            </select>
                                        </div>
                                    )}
                                    {(selectedStages.length > 0 || selectedSource || selectedBroker) && (
                                        <button
                                            onClick={() => { setSelectedStages([]); setSelectedSource(''); setSelectedCampaign(''); setSelectedBroker('') }}
                                            className="text-[10px] font-bold text-red-500 hover:underline"
                                        >Limpar Filtros</button>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3">
                            <button 
                                onClick={handleFetchSystemLeads}
                                disabled={isSelectingLeads}
                                className="flex flex-col items-center gap-3 p-5 bg-foreground/5 rounded-2xl border border-border/40 hover:border-border hover:bg-foreground/10 transition-all text-muted-foreground group"
                            >
                                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    {isSelectingLeads ? <Loader2 className="animate-spin" size={24} /> : <Users className="text-foreground" size={24} />}
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-foreground">Leads do Sistema</p>
                                    <p className="text-[10px]">{selectedStages.length > 0 || selectedSource ? 'Filtros aplicados' : 'Leads cadastrados'}</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-5 bg-foreground/5 rounded-2xl border border-border/40 hover:border-border hover:bg-foreground/10 transition-all text-muted-foreground group"
                            >
                                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet className="text-foreground" size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-foreground">Subir Planilha</p>
                                    <p className="text-[10px]">Excel ou CSV</p>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                    accept=".csv,.xlsx,.xls"
                                />
                            </button>

                            <button 
                                onClick={() => setShowGoogleSheet(!showGoogleSheet)}
                                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all text-muted-foreground group ${
                                    showGoogleSheet 
                                        ? 'bg-foreground/10 border-border' 
                                        : 'bg-foreground/5 border-border/40 hover:border-border hover:bg-foreground/10'
                                }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <Globe className="text-[#0F9D58]" size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-foreground">Google Sheets</p>
                                    <p className="text-[10px]">Colar link</p>
                                </div>
                            </button>
                        </div>

                        {/* Google Sheets URL Input */}
                        {showGoogleSheet && (
                            <div className="p-4 bg-foreground/5 rounded-xl border border-border/40 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className="text-[#0F9D58] shrink-0" />
                                    <p className="text-[10px] font-bold text-foreground">Cole o link de compartilhamento da planilha</p>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={googleSheetUrl}
                                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                        className="flex-1 h-10 px-3 text-xs bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground/50"
                                        onKeyDown={(e) => e.key === 'Enter' && handleGoogleSheetImport()}
                                    />
                                    <button
                                        onClick={handleGoogleSheetImport}
                                        disabled={isLoadingSheet || !googleSheetUrl.trim()}
                                        className={`h-10 px-4 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
                                            isLoadingSheet || !googleSheetUrl.trim()
                                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                                : 'bg-[#0F9D58] text-white hover:bg-[#0D8C4D]'
                                        }`}
                                    >
                                        {isLoadingSheet ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : (
                                            <ExternalLink size={14} />
                                        )}
                                        {isLoadingSheet ? 'Importando...' : 'Importar'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                    <Info size={10} />
                                    A planilha deve estar compartilhada como "Qualquer pessoa com o link"
                                </p>
                            </div>
                        )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lista de Envio</span>
                                <button 
                                    onClick={() => { setRecipients([]); setSourceType(null); setImportStats(null); setShowDuplicates(false); setShowInvalids(false); }}
                                    className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
                                >
                                    Limpar Lista
                                </button>
                            </div>

                            {/* Badge resumo da importação */}
                            {importStats && sourceType === 'file' && (
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    <span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100">
                                        ✅ {importStats.valid} válidos
                                    </span>
                                    {importStats.linked > 0 && (
                                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                                            🔗 {importStats.linked} vinculados ao CRM
                                        </span>
                                    )}
                                    {importStats.invalid > 0 && (
                                        <button
                                            onClick={() => setShowInvalids(!showInvalids)}
                                            className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
                                        >
                                            ⚠️ {importStats.invalid} inválidos {showInvalids ? '▲' : '▼'}
                                        </button>
                                    )}
                                    {importStats.duplicates > 0 && (
                                        <button
                                            onClick={() => setShowDuplicates(!showDuplicates)}
                                            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
                                        >
                                            🔁 {importStats.duplicates} duplicados removidos {showDuplicates ? '▲' : '▼'}
                                        </button>
                                    )}
                                    {isLinking && (
                                        <span className="px-2.5 py-1 rounded-lg bg-foreground/5 text-muted-foreground border border-border/40 flex items-center gap-1">
                                            <Loader2 className="animate-spin" size={10} /> Vinculando...
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Lista de duplicados removidos */}
                            {showDuplicates && importStats && importStats.duplicateList.length > 0 && (
                                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Duplicados Removidos</p>
                                    <div className="max-h-[120px] overflow-y-auto space-y-1 custom-scrollbar">
                                        {importStats.duplicateList.map((d, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[10px] text-amber-700">
                                                <span className="font-bold truncate max-w-[120px]">{d.name}</span>
                                                <span className="text-amber-500">{formatPhone(d.phone)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lista de inválidos */}
                            {showInvalids && importStats && importStats.invalid > 0 && (
                                <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Números Inválidos</p>
                                        <button
                                            onClick={handleRemoveInvalids}
                                            className="text-[10px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors"
                                        >
                                            <Trash2 size={10} />
                                            Remover Todos
                                        </button>
                                    </div>
                                    <div className="max-h-[120px] overflow-y-auto space-y-1 custom-scrollbar">
                                        {recipients.filter(r => r.isInvalid).map((r, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[10px] text-red-600">
                                                <AlertCircle size={10} className="shrink-0" />
                                                <span className="font-bold truncate max-w-[120px]">{r.name}</span>
                                                <span className="text-red-400">{formatPhone(r.phone)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lista principal de destinatários */}
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {recipients.map((r, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                                        r.isInvalid 
                                            ? 'bg-red-50/50 border-red-100' 
                                            : 'bg-foreground/5 border-border/40'
                                    }`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <p className={`text-xs font-bold truncate ${r.isInvalid ? 'text-red-500' : 'text-foreground'}`}>{r.name}</p>
                                                {r.lead_id && (
                                                    <span title="Vinculado ao CRM">
                                                        <Link size={10} className="text-blue-500 shrink-0" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[10px] ${r.isInvalid ? 'text-red-400' : 'text-muted-foreground'}`}>{formatPhone(r.phone)}</p>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                                            r.isInvalid ? 'bg-red-400' : r.lead_id ? 'bg-blue-400' : 'bg-yellow-400'
                                        }`}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex gap-3">
                        <HelpCircle className="text-blue-400 shrink-0" size={18} />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-400">Como funciona o disparo?</p>
                            <p className="text-[10px] text-blue-400/80 leading-relaxed text-pretty">
                                O sistema enviará as mensagens uma por uma, com um intervalo aleatório entre 1.5s e 3s para simular comportamento humano e reduzir o risco de bloqueio. 
                                <br/><br/>
                                <strong className="text-blue-400">Importante:</strong> Mantenha esta aba aberta até o fim do processo.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações e Progresso */}
            <div className="pt-6 border-t border-border/40 flex flex-col gap-4">
                {isSending && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin text-accent-icon" size={14} />
                                <span>Enviando mensagens ({progress.current}/{progress.total})</span>
                            </div>
                            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-accent-icon transition-all duration-500"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-green-600">{results.success} Sucessos</span>
                            <span className="text-red-500">{results.error} Falhas</span>
                        </div>
                    </div>
                )}

                {isFinished && !isSending && (
                    <div className="p-4 bg-foreground/5 rounded-xl border border-border/40 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground">Disparo Finalizado</p>
                                <p className="text-[10px] text-muted-foreground">{results.success} enviados, {results.error} falhas.</p>
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
                    {isSending ? (
                        <button 
                            onClick={handleStop}
                            className="w-full h-12 text-sm font-bold bg-card border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all transform active:scale-[0.99] rounded-xl shadow-sm flex items-center justify-center gap-2"
                        >
                            <X size={20} />
                            Interromper Disparo
                        </button>
                    ) : (
                        <button 
                            onClick={handleSend}
                            disabled={isSending || recipients.length === 0 || (!message && !media)}
                            className={`w-full h-12 text-sm font-bold bg-secondary border-none text-secondary-foreground hover:bg-secondary/90 transition-all transform active:scale-[0.99] rounded-xl shadow-sm flex items-center justify-center gap-2 ${(recipients.length === 0 || (!message && !media)) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            <Send size={20} />
                            Iniciar Disparo para {recipients.length} Contatos
                        </button>
                    )}
                </div>

            </div>

            {/* Histórico de Campanhas */}
            <div className="pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleLoadHistory}
                        className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-foreground/80 transition-colors"
                    >
                        <span>Histórico de Disparos</span>
                        {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showHistory && campaignHistory.length > 0 && (
                        <div className="flex items-center gap-1">
                            {confirmDeleteAll ? (
                                <>
                                    <span className="text-[10px] text-red-500 font-bold">Apagar tudo?</span>
                                    <button
                                        onClick={handleDeleteAllCampaigns}
                                        className="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                    >
                                        Sim
                                    </button>
                                    <button
                                        onClick={() => setConfirmDeleteAll(false)}
                                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-foreground/5 transition-colors"
                                    >
                                        Não
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setConfirmDeleteAll(true)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                                >
                                    <Trash2 size={10} />
                                    Limpar Tudo
                                </button>
                            )}
                        </div>
                    )}
                </div>
                {showHistory && (
                    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
                        ) : campaignHistory.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-6">Nenhum disparo realizado ainda.</p>
                        ) : (
                            campaignHistory.map(c => (
                                <div key={c.id} className="space-y-0">
                                    <button
                                        onClick={() => c.total_errors > 0 ? handleExpandCampaign(c.id) : null}
                                        className={`w-full flex items-center justify-between p-3 bg-foreground/5 rounded-xl border border-border/40 text-left transition-colors group/card ${
                                            c.total_errors > 0 ? 'hover:bg-foreground/10 cursor-pointer' : 'cursor-default'
                                        } ${expandedCampaignId === c.id ? 'rounded-b-none border-b-0' : ''}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                {c.status === 'completed' && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                                                {c.status === 'cancelled' && <Ban size={12} className="text-red-500 shrink-0" />}
                                                {c.status === 'sending' && <Loader2 size={12} className="animate-spin text-amber-500 shrink-0" />}
                                                <p className="text-xs font-bold text-foreground truncate">{c.title || (c.message ? c.message.substring(0, 50) + (c.message.length > 50 ? '...' : '') : 'Somente mídia')}</p>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                <span className="flex items-center gap-1"><Clock size={10} />{new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="text-green-600 font-bold">{c.total_success} ✓</span>
                                                <span className="text-red-500 font-bold">{c.total_errors} ✗</span>
                                                {c.profiles && <span className="text-muted-foreground/60">por {c.profiles.full_name}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                c.status === 'completed' ? 'bg-green-600 text-white' : c.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {c.status === 'completed' ? 'Concluído' : c.status === 'cancelled' ? 'Cancelado' : 'Enviando'}
                                            </span>
                                            {c.total_errors > 0 && (
                                                expandedCampaignId === c.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(c.id); }}
                                                className="p-1.5 text-muted-foreground/50 hover:text-red-500 transition-colors opacity-0 group-hover/card:opacity-100"
                                                title="Excluir campanha"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </button>

                                    {/* Detalhes expandidos — destinatários com falha */}
                                    {expandedCampaignId === c.id && (
                                        <div className="p-3 bg-red-500/10 rounded-b-xl border border-t-0 border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {isLoadingRecipients ? (
                                                <div className="flex items-center justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" size={16} /></div>
                                            ) : campaignRecipients.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-3">Sem detalhes de falha registrados para esta campanha.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2">Falhas de Envio ({campaignRecipients.length})</p>
                                                    <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar">
                                                        {campaignRecipients.map(r => (
                                                            <div key={r.id} className="flex items-center justify-between p-2 bg-foreground/5 rounded-lg border border-red-500/20">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <AlertCircle size={10} className="text-red-500 shrink-0" />
                                                                        <p className="text-xs font-bold text-foreground truncate">{r.recipient_name}</p>
                                                                        <p className="text-[10px] text-muted-foreground">{formatPhone(r.recipient_phone)}</p>
                                                                    </div>
                                                                    {r.error_message && (
                                                                        <p className="text-[10px] text-red-500 mt-0.5 ml-[18px] truncate">{r.error_message}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Salvar Template */}
            {showSaveTemplate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-5 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                        <Save className="text-green-600" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-foreground">Salvar Template</h3>
                                        <p className="text-[10px] text-muted-foreground">Reutilize em disparos futuros</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}
                                    className="w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nome do Template</label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Ex: Lançamento Padrão"
                                    className="w-full h-10 px-3 text-sm font-medium bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-foreground placeholder:text-muted-foreground/50"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                                />
                            </div>
                            <div className="p-3 bg-foreground/5 rounded-lg border border-border/40">
                                <p className="text-[10px] text-muted-foreground font-bold mb-1">Conteúdo que será salvo:</p>
                                {message && <p className="text-[10px] text-foreground/80 truncate">📝 {message.substring(0, 80)}{message.length > 80 ? '...' : ''}</p>}
                                {media && <p className="text-[10px] text-foreground/80 truncate mt-0.5">📎 {media.name}</p>}
                                {!message && !media && <p className="text-[10px] text-muted-foreground italic">Nenhum conteúdo</p>}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border/40 bg-foreground/5 flex justify-end gap-2">
                            <button
                                onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}
                                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveTemplate}
                                disabled={isSavingTemplate || !templateName.trim()}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                                    isSavingTemplate || !templateName.trim()
                                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                {isSavingTemplate ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                {isSavingTemplate ? 'Salvando...' : 'Salvar Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Seleção de Aba da Planilha */}
            {showSheetPicker && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
                                        <FileSpreadsheet className="text-foreground" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-foreground">Selecionar Aba</h3>
                                        <p className="text-[10px] text-muted-foreground">Planilha com {availableSheets.length} abas detectadas</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowSheetPicker(false); setPendingWorkbook(null); setAvailableSheets([]); setGoogleSheetTabs([]); setPendingGoogleSheetId(''); }}
                                    className="w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Lista de abas */}
                        <div className="px-6 py-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Escolha a aba para importar</p>
                            <div className="space-y-2">
                                {availableSheets.map((name, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSheetSelection(name)}
                                        className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border/40 bg-foreground/5 hover:bg-foreground/10 hover:border-border transition-all group text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-card border border-border/40 flex items-center justify-center text-[10px] font-black text-foreground group-hover:bg-muted group-hover:text-foreground group-hover:border-muted transition-all shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-foreground truncate">{name}</p>
                                            <p className="text-[10px] text-muted-foreground">Aba {idx + 1} de {availableSheets.length}</p>
                                        </div>
                                        <ChevronDown size={14} className="text-muted-foreground/50 group-hover:text-foreground -rotate-90 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-border/40 bg-foreground/5">
                            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                <Info size={10} />
                                Clique na aba desejada para importar os contatos
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
