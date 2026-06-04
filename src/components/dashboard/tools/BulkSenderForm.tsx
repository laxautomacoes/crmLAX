'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { 
    Send, Users, FileSpreadsheet, Image as ImageIcon, Video, FileText, X, Loader2, 
    CheckCircle2, AlertCircle, Info, HelpCircle, Filter, History, ChevronDown, ChevronUp, Clock, Ban,
    Link, Unlink, Trash2, Globe, ExternalLink, BookOpen, Save, Type, Shield, Timer, Play
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { formatCurrencyBRL } from '@/lib/utils/currency'
import { getBulkFilterSuggestions } from '@/app/_actions/bulk-filter-suggestions'
import { AutocompleteInput } from '@/components/shared/forms/AutocompleteInput'
import { 
    checkWhatsAppStatus, validateBulkAccess, 
    getLeadsForBulk, getBulkFilterOptions, getBulkCampaigns,
    matchRecipientsWithLeads, fetchGoogleSheetAsXlsx,
    saveBulkTemplate, getBulkTemplates, deleteBulkTemplate,
    getBulkCampaignRecipients,
    deleteBulkCampaign, deleteAllBulkCampaigns,
    startBulkCampaign, cancelBulkCampaign, checkActiveCampaign, resumeBulkCampaign,
    forceCancelCampaign, checkStalledCampaign
} from '@/app/_actions/whatsapp-bulk'
import { createClient } from '@/lib/supabase/client'
import { formatPhone } from '@/lib/utils/phone'
import { normalizeWhatsAppNumber, isValidWhatsAppNumber } from '@/lib/utils/whatsapp-utils'

// ─── Aliases de colunas para detecção flexível ─────────────────────────────────

const NAME_ALIASES = ['nome', 'name', 'cliente', 'contato', 'razao social', 'razao_social', 'empresa']
const PHONE_ALIASES = ['telefone', 'phone', 'celular', 'whatsapp', 'tel', 'fone', 'mobile', 'numero', 'número', 'contato_telefone', 'cel']
const ALL_ALIASES = [...NAME_ALIASES, ...PHONE_ALIASES]

/**
 * Lê um worksheet do SheetJS de forma inteligente:
 * 1. Lê como arrays brutos (raw: true) para preservar dígitos de telefone
 * 2. Auto-detecta a linha do cabeçalho procurando aliases conhecidos
 * 3. Retorna objetos com chaves nomeadas e valores brutos
 */
function smartParseWorksheet(ws: XLSX.WorkSheet): Record<string, any>[] {
    // Ler como array de arrays com valores brutos (sem formatação de célula)
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][]
    
    if (rawRows.length < 2) return []
    
    // Encontrar a linha do cabeçalho (primeiras 15 linhas)
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
        const row = rawRows[i]
        if (!Array.isArray(row) || row.length === 0) continue
        
        const cellTexts = row.map(cell => String(cell || '').toLowerCase().trim())
        const hasAlias = cellTexts.some(val => 
            val.length > 0 && ALL_ALIASES.some(alias => val.includes(alias) || alias.includes(val))
        )
        if (hasAlias) {
            headerRowIndex = i
            break
        }
    }
    
    // Montar headers a partir da linha detectada
    const headerRow = rawRows[headerRowIndex]
    const headers = headerRow.map((h: any, i: number) => {
        const val = String(h || '').trim()
        return val || `col_${i}`
    })
    
    console.log(`[Import Debug] Header na linha ${headerRowIndex + 1}:`, headers)
    
    // Mapear dados a partir da linha seguinte ao cabeçalho
    const dataRows = rawRows.slice(headerRowIndex + 1)
    return dataRows
        .filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
        .map(row => {
            const obj: Record<string, any> = {}
            headers.forEach((h: string, i: number) => {
                // Converter valores numéricos para string preservando todos os dígitos
                const val = row[i]
                if (val === undefined || val === null) {
                    obj[h] = ''
                } else if (typeof val === 'number') {
                    // Números inteiros: converter sem notação científica
                    obj[h] = Number.isInteger(val) ? val.toString() : String(val)
                } else {
                    obj[h] = String(val)
                }
            })
            return obj
        })
}

function findColumnValue(row: Record<string, any>, aliases: string[]): string | undefined {
    const keys = Object.keys(row)
    // 1. Tentativa exata
    for (const alias of aliases) {
        const match = keys.find(k => k.toLowerCase().trim() === alias)
        if (match && row[match] !== undefined && row[match] !== null) return String(row[match])
    }
    // 2. Tentativa parcial (coluna "contém" o alias) — ex: "Telefone 1", "Nome Completo"
    for (const alias of aliases) {
        const match = keys.find(k => k.toLowerCase().trim().includes(alias))
        if (match && row[match] !== undefined && row[match] !== null) return String(row[match])
    }
    // 3. Alias "contém" a chave — ex: coluna "tel" matchando alias "telefone"
    for (const alias of aliases) {
        const match = keys.find(k => alias.includes(k.toLowerCase().trim()) && k.trim().length >= 3)
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
    current_index?: number; cancel_requested?: boolean;
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
    const [nameQuery, setNameQuery] = useState('')
    const [clientName, setClientName] = useState('')
    const [propertyName, setPropertyName] = useState('')
    const [minPrice, setMinPrice] = useState('')
    const [maxPrice, setMaxPrice] = useState('')
    const [bedrooms, setBedrooms] = useState('any')
    const [location, setLocation] = useState('')
    const [filterSuggestions, setFilterSuggestions] = useState<{
        clientNames: string[], leadNames: string[], propertyNames: string[], locations: string[], bedroomOptions: string[]
    }>({ clientNames: [], leadNames: [], propertyNames: [], locations: [], bedroomOptions: [] })
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
    // DDD padrão para números sem DDD
    const [defaultDDD, setDefaultDDD] = useState('48')
    // Google Sheets
    const [showGoogleSheet, setShowGoogleSheet] = useState(false)
    const [googleSheetUrl, setGoogleSheetUrl] = useState('')
    const [isLoadingSheet, setIsLoadingSheet] = useState(false)
    // Seleção de aba da planilha
    const [showSheetPicker, setShowSheetPicker] = useState(false)
    const [availableSheets, setAvailableSheets] = useState<string[]>([])
    const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null)
    const [sheetPickerSource, setSheetPickerSource] = useState<'file' | 'google'>('file')
    // Templates
    const [templates, setTemplates] = useState<BulkTemplate[]>([])
    const [showTemplates, setShowTemplates] = useState(false)
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
    const [showSaveTemplate, setShowSaveTemplate] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [isSavingTemplate, setIsSavingTemplate] = useState(false)
    // Limite de envios
    const [sendLimit, setSendLimit] = useState<string>('')
    // Velocidade do disparo
    const [sendSpeed, setSendSpeed] = useState<'safe' | 'ultra' | null>(null)
    const [pendingSpeed, setPendingSpeed] = useState<'safe' | 'ultra' | null>(null)
    const [showSpeedWarning, setShowSpeedWarning] = useState(false)
    
    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaInputRef = useRef<HTMLInputElement>(null)
    const stopRef = useRef(false)
    const cancelTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [stalledDetected, setStalledDetected] = useState(false)

    // Carregar opções de filtro ao montar
    useEffect(() => {
        const loadFilters = async () => {
            const result = await getBulkFilterOptions(tenantId)
            if (result.success && result.data) setFilterOptions(result.data)
        }
        loadFilters()
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

    // Detectar disparo ativo ao montar (caso tenha voltado à página)
    useEffect(() => {
        const checkActive = async () => {
            const campaign = await checkActiveCampaign(tenantId)
            if (campaign) {
                setCurrentCampaignId(campaign.id)
                setProgress({ current: campaign.current_index, total: campaign.total_recipients })
                setResults({ success: campaign.total_success, error: campaign.total_errors })
                setCampaignTitle(campaign.title || '')
                
                if (campaign.status === 'stalled') {
                    // Campanha travada — mostrar alerta
                    setStalledDetected(true)
                    setIsSending(false)
                } else {
                    setIsSending(true)
                }
            }
        }
        checkActive()
    }, [tenantId])

    // Supabase Realtime: progresso da campanha
    useEffect(() => {
        if (!currentCampaignId || !isSending) return

        const supabase = createClient()
        const channel = supabase
            .channel(`campaign-progress-${currentCampaignId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'bulk_campaigns',
                filter: `id=eq.${currentCampaignId}`
            }, (payload: any) => {
                const d = payload.new
                setProgress({ current: d.current_index || 0, total: d.total_recipients || 0 })
                setResults({ success: d.total_success || 0, error: d.total_errors || 0 })

                // Resetar detecção de stalled quando há atividade
                if (d.last_activity_at) {
                    setStalledDetected(false)
                }

                if (d.status === 'completed' || d.status === 'cancelled') {
                    setIsSending(false)
                    setIsFinished(true)
                    setStopRequested(false)
                    setStalledDetected(false)
                    // Limpar timer de cancelamento forçado se existir
                    if (cancelTimerRef.current) {
                        clearTimeout(cancelTimerRef.current)
                        cancelTimerRef.current = null
                    }
                    if (d.status === 'completed') {
                        toast.success('Processo de disparo concluído!')
                    } else {
                        toast.warning('Disparo interrompido.')
                    }
                } else if (d.status === 'stalled') {
                    // Edge Function marcou como stalled — mostrar alerta
                    setStalledDetected(true)
                    setIsSending(false)
                    setStopRequested(false)
                    toast.warning('O servidor de disparo pausou. Você pode retomar ou cancelar.')
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentCampaignId, isSending])

    // Proteção contra fechar aba durante envio
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isSending) { e.preventDefault(); e.returnValue = '' }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isSending])

    // Watchdog: detectar campanhas travadas (sem progresso por 3 minutos)
    useEffect(() => {
        if (!currentCampaignId || !isSending) return

        const watchdogInterval = setInterval(async () => {
            const result = await checkStalledCampaign(currentCampaignId)
            if (result.stalled) {
                setStalledDetected(true)
                setIsSending(false)
                setStopRequested(false)
                toast.warning('O disparo parece ter travado. Sem atividade nos últimos 3 minutos.')
                clearInterval(watchdogInterval)
            }
        }, 60000) // Verificar a cada 60 segundos

        return () => clearInterval(watchdogInterval)
    }, [currentCampaignId, isSending])

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
                const data = smartParseWorksheet(ws)
                await processImportedData(data)
            }
        }
        reader.readAsBinaryString(file)
        // Limpar input para permitir reupload do mesmo arquivo
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSheetSelection = async (sheetName: string) => {
        setShowSheetPicker(false)

        if (pendingWorkbook) {
            const ws = pendingWorkbook.Sheets[sheetName]
            const data = smartParseWorksheet(ws)
            setPendingWorkbook(null)
            setAvailableSheets([])
            await processImportedData(data)

            // Limpar estado do Google Sheets se veio de lá
            if (sheetPickerSource === 'google') {
                setShowGoogleSheet(false)
                setGoogleSheetUrl('')
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
        if (data.length === 0) {
            toast.error('A aba selecionada está vazia.')
            return
        }

        // Debug: mostrar as colunas encontradas na primeira linha
        const firstRow = data[0]
        const columnKeys = Object.keys(firstRow)
        console.log('[Import Debug] Colunas encontradas:', columnKeys)
        console.log('[Import Debug] Primeira linha:', firstRow)

        // 1. Detecção flexível de colunas
        const ddd = defaultDDD.replace(/\D/g, '')
        const mapped = data.map(row => {
            const rawName = String(findColumnValue(row, NAME_ALIASES) || 'Cliente')
            // Pega apenas o primeiro nome (ex: "Luiz Durli / Matheus" → "Luiz")
            const name = rawName.split(/[\/,;|]+/)[0].trim().split(/\s+/)[0].trim() || 'Cliente'
            const rawPhone = String(findColumnValue(row, PHONE_ALIASES) || '')
            
            // Se a célula contém múltiplos números separados por / , ; ou |, pega apenas o primeiro
            const phoneParts = rawPhone.split(/[\/,;|]+/)
            let phone = ''
            for (const part of phoneParts) {
                const cleaned = part.replace(/\D/g, '')
                if (cleaned.length >= 8 && cleaned.length <= 15) {
                    phone = cleaned
                    break
                }
            }
            // Fallback: se nenhuma parte isolada funcionou, tenta o rawPhone inteiro
            if (!phone) {
                phone = rawPhone.replace(/\D/g, '')
            }

            // Se o número tem 8 ou 9 dígitos (sem DDD), adiciona o DDD padrão
            if (phone.length === 8 || phone.length === 9) {
                phone = `${ddd}${phone}`
            }
            
            return { name, phone }
        }).filter(r => r.phone.length >= 8)

        // Fallback: Se nenhum contato foi encontrado via aliases, tentar detectar automaticamente
        // procurando colunas com valores que parecem telefones
        if (mapped.length === 0 && data.length > 0) {
            console.log('[Import Debug] Nenhum match via aliases. Tentando detecção automática...')
            
            let phoneKey = ''
            let nameKey = ''
            
            // Encontrar coluna de telefone: procurar por valores que parecem números de telefone
            for (const key of columnKeys) {
                const sampleValues = data.slice(0, 5).map(r => String(r[key] || ''))
                const hasPhoneValues = sampleValues.some(v => {
                    const digits = v.replace(/\D/g, '')
                    return digits.length >= 8 && digits.length <= 15
                })
                if (hasPhoneValues) {
                    phoneKey = key
                    break
                }
            }
            
            // Encontrar coluna de nome: primeira coluna de texto que NÃO é o telefone
            if (phoneKey) {
                for (const key of columnKeys) {
                    if (key === phoneKey) continue
                    const sampleValues = data.slice(0, 5).map(r => String(r[key] || ''))
                    const hasTextValues = sampleValues.some(v => v.length > 1 && !/^\d+$/.test(v.replace(/\D/g, '')))
                    if (hasTextValues) {
                        nameKey = key
                        break
                    }
                }
            }
            
            if (phoneKey) {
                console.log(`[Import Debug] Detecção automática: nome="${nameKey}", telefone="${phoneKey}"`)
                const autoMapped = data.map(row => {
                    const rawName = nameKey ? String(row[nameKey] || 'Cliente') : 'Cliente'
                    const name = rawName.split(/[\/,;|]+/)[0].trim().split(/\s+/)[0].trim() || 'Cliente'
                    const rawPhone = String(row[phoneKey] || '')
                    const phoneParts = rawPhone.split(/[\/,;|]+/)
                    let phone = ''
                    for (const part of phoneParts) {
                        const cleaned = part.replace(/\D/g, '')
                        if (cleaned.length >= 8 && cleaned.length <= 15) {
                            phone = cleaned
                            break
                        }
                    }
                    if (!phone) phone = rawPhone.replace(/\D/g, '')
                    // Se sem DDD, adiciona o padrão
                    if (phone.length === 8 || phone.length === 9) {
                        phone = `${ddd}${phone}`
                    }
                    return { name, phone }
                }).filter(r => r.phone.length >= 8)
                
                if (autoMapped.length > 0) {
                    toast.info(`Colunas detectadas automaticamente: "${nameKey || 'N/A'}" (nome) e "${phoneKey}" (telefone).`)
                    // Continuar com autoMapped ao invés de mapped
                    return processValidatedData(autoMapped)
                }
            }
            
            toast.error(`Nenhum contato válido encontrado. Colunas da planilha: ${columnKeys.join(', ')}`)
            return
        }

        await processValidatedData(mapped)
    }

    // Sub-função para processar dados já mapeados (deduplicação + validação + vinculação)
    const processValidatedData = async (mapped: { name: string; phone: string }[]) => {

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
            // Baixar a planilha inteira como XLSX via server action
            const result = await fetchGoogleSheetAsXlsx(googleSheetUrl.trim())
            if (!result.success || !result.xlsxBase64) {
                toast.error(result.error || 'Erro ao acessar a planilha.')
                return
            }

            // Parsear XLSX diretamente do base64 com SheetJS
            const wb = XLSX.read(result.xlsxBase64, { type: 'base64' })

            if (wb.SheetNames.length > 1) {
                // Múltiplas abas: abrir modal para o usuário escolher (mesmo UX do upload local)
                setAvailableSheets(wb.SheetNames)
                setPendingWorkbook(wb)
                setSheetPickerSource('google')
                setShowSheetPicker(true)
            } else {
                // Apenas uma aba: processar direto
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = smartParseWorksheet(ws)
                await processImportedData(data)
                setShowGoogleSheet(false)
                setGoogleSheetUrl('')
            }
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
            if (clientName) filters.clientName = clientName
            if (nameQuery) filters.nameQuery = nameQuery
            if (propertyName) filters.propertyName = propertyName
            if (minPrice) { const num = parseFloat(minPrice.replace(/[^\d,]/g, '').replace(',', '.')); if (!isNaN(num)) filters.minPrice = num }
            if (maxPrice) { const num = parseFloat(maxPrice.replace(/[^\d,]/g, '').replace(',', '.')); if (!isNaN(num)) filters.maxPrice = num }
            if (bedrooms && bedrooms !== 'any') filters.bedrooms = bedrooms
            if (location) filters.location = location

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

    // Corrigir orientação EXIF de imagens usando Canvas
    const fixImageOrientation = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')
                if (!ctx) { resolve(file); return }
                ctx.drawImage(img, 0, 0)
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob)
                        else resolve(file)
                    },
                    file.type || 'image/jpeg',
                    0.92
                )
                URL.revokeObjectURL(img.src)
            }
            img.onerror = () => { resolve(file) }
            img.src = URL.createObjectURL(file)
        })
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

            // Se for imagem, corrigir orientação EXIF via Canvas antes do upload
            let fileToUpload: File | Blob = file
            if (file.type.startsWith('image/')) {
                fileToUpload = await fixImageOrientation(file)
            }

            const { error: uploadError } = await supabase.storage
                .from('crm-attachments')
                .upload(filePath, fileToUpload, {
                    contentType: file.type,
                })

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

    const handleStop = async () => {
        stopRef.current = true
        setStopRequested(true)
        if (currentCampaignId) {
            await cancelBulkCampaign(currentCampaignId)
            
            // Timer de segurança: se após 30s o status não mudou, forçar cancelamento
            cancelTimerRef.current = setTimeout(async () => {
                toast.warning('O servidor não respondeu. Forçando cancelamento...')
                const result = await forceCancelCampaign(currentCampaignId)
                if (result.success) {
                    setIsSending(false)
                    setIsFinished(true)
                    setStopRequested(false)
                    setStalledDetected(false)
                    toast.success('Disparo cancelado com sucesso.')
                } else {
                    toast.error('Erro ao forçar cancelamento: ' + (result.error || 'desconhecido'))
                    setStopRequested(false)
                }
                cancelTimerRef.current = null
            }, 30000)
        }
    }

    const handleForceCancel = async () => {
        if (!currentCampaignId) return
        const result = await forceCancelCampaign(currentCampaignId)
        if (result.success) {
            setIsSending(false)
            setIsFinished(true)
            setStopRequested(false)
            setStalledDetected(false)
            if (cancelTimerRef.current) {
                clearTimeout(cancelTimerRef.current)
                cancelTimerRef.current = null
            }
            toast.success('Disparo cancelado com sucesso.')
        } else {
            toast.error('Erro ao forçar cancelamento.')
        }
    }

    const handleResumeStalled = async () => {
        if (!currentCampaignId) return
        const result = await resumeBulkCampaign(currentCampaignId)
        if (result.success) {
            setStalledDetected(false)
            setIsSending(true)
            setStopRequested(false)
            toast.success(`Retomando envio: ${result.remaining} contatos restantes.`)
        } else {
            toast.error(result.error || 'Erro ao retomar disparo.')
        }
    }

    // Calcula o número efetivo de envios considerando o limite
    const effectiveRecipientCount = (() => {
        const limit = parseInt(sendLimit)
        if (sendLimit && !isNaN(limit) && limit > 0 && limit < recipients.length) {
            return limit
        }
        return recipients.length
    })()

    const handleSend = async () => {
        if (!campaignTitle.trim()) return toast.error('Dê um título para esta campanha.')
        if (recipients.length === 0) return toast.error('Selecione os destinatários.')
        if (!message && !media) return toast.error('Escreva uma mensagem ou anexe um arquivo.')
        if (!sendSpeed) return toast.error('Selecione a velocidade do disparo.')

        // Aplicar limite de envios
        const limit = parseInt(sendLimit)
        const hasLimit = sendLimit && !isNaN(limit) && limit > 0 && limit < recipients.length
        const effectiveRecipients = hasLimit ? recipients.slice(0, limit) : recipients

        // Validar plano
        const access = await validateBulkAccess()
        if (!access.allowed) return toast.error(access.error)
        if (access.remaining !== null && access.remaining !== undefined && effectiveRecipients.length > access.remaining) {
            return toast.error(`Você só pode enviar mais ${access.remaining} mensagens este mês. Reduza a lista ou faça upgrade.`)
        }
        setPlanRemaining(access.remaining ?? null)

        const status = await checkWhatsAppStatus()
        if (!status.connected || !status.instanceName) {
            return toast.error(status.error)
        }

        // Criar campanha e disparar Edge Function no backend
        const result = await startBulkCampaign({
            tenantId, profileId,
            title: campaignTitle.trim(),
            message,
            mediaUrl: media?.url,
            mediaType: media?.type,
            mediaName: media?.name,
            recipients: effectiveRecipients.map(r => ({ name: r.name, phone: r.phone, lead_id: r.lead_id })),
            speedSetting: sendSpeed,
            instanceName: status.instanceName,
            filtersApplied: { stages: selectedStages, source: selectedSource, campaign: selectedCampaign, broker: selectedBroker },
            sourceType: sourceType || 'system'
        })

        if (!result.success || !result.data) {
            return toast.error(result.error || 'Erro ao iniciar disparo.')
        }

        setCurrentCampaignId(result.data.id)
        setIsSending(true)
        stopRef.current = false
        setStopRequested(false)
        setIsFinished(false)
        setResults({ success: 0, error: 0 })
        setProgress({ current: 0, total: effectiveRecipients.length })

        toast.success('Disparo iniciado! Você pode navegar para outras páginas sem interromper o envio.')
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

    const handleResumeCampaign = async (campaignId: string) => {
        const result = await resumeBulkCampaign(campaignId)
        if (result.success) {
            toast.success(`Retomando envio: ${result.remaining} contatos restantes (de ${result.total}).`)
            // Atualizar o status na lista local
            setCampaignHistory(prev => prev.map(c => 
                c.id === campaignId ? { ...c, status: 'sending', cancel_requested: false } : c
            ))
        } else {
            toast.error(result.error || 'Erro ao retomar campanha.')
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
        <div className="bg-card p-6 rounded-lg border border-muted-foreground/30 shadow-sm space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Composição */}
                <div className="space-y-6">
                    {/* Título da Campanha */}
                    <div className="space-y-2">
                        <div className="min-h-[32px] flex items-center">
                            <label className="text-sm font-bold text-foreground ml-1">
                                Título da Campanha
                            </label>
                        </div>
                        <input
                            type="text"
                            value={campaignTitle}
                            onChange={(e) => setCampaignTitle(e.target.value)}
                            placeholder="Ex: Lançamento Residencial Park Sul"
                            className="w-full h-10 px-3 text-sm font-medium bg-background border border-muted-foreground/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-foreground placeholder:text-muted-foreground/50"
                        />
                    </div>

                    {/* Mensagem + Templates */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-foreground ml-1">Mensagem</label>
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
                            <div className="p-3 bg-foreground/5 rounded-lg border border-border/40 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
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

                    <div className="space-y-2">
                        <div className="min-h-[32px] flex items-center">
                            <label className="text-sm font-bold text-foreground ml-1">Anexar Mídia ou Documento</label>
                        </div>
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
                                        <div className="relative max-h-[180px] rounded-lg overflow-hidden border border-border/40 shadow-sm bg-foreground/5 flex items-center justify-center">
                                            <img src={media.url} alt="Preview" className="max-h-[180px] w-auto object-contain" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white text-xs font-bold">{media.name}</p>
                                            </div>
                                        </div>
                                    ) : media.type === 'video' ? (
                                        <div className="relative max-h-[180px] rounded-lg overflow-hidden border border-border/40 shadow-sm bg-black flex items-center justify-center">
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
                                        <div className="flex items-center gap-4 p-5 bg-foreground/5 rounded-lg border-2 border-dashed border-border/40 w-full group-hover:bg-foreground/10 transition-colors">
                                            <div className="w-14 h-14 rounded-lg bg-card shadow-sm flex items-center justify-center text-foreground border border-border/40">
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

                {/* Destinatários */}
                <div className="space-y-6">
                <div className="space-y-2">
                    <div className="min-h-[32px] flex items-center justify-between">
                        <label className="text-sm font-bold text-foreground ml-1">Destinatários ({recipients.length})</label>
                    </div>

                    {recipients.length === 0 ? (
                        <div className="space-y-4">
                            {showFilters && (
                                <div className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-4 mb-4 shrink-0 relative animate-in zoom-in-95 duration-200">
                                    <button onClick={() => setShowFilters(false)} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground">
                                        <X size={16} />
                                    </button>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Filtros de Leads</h4>
                                    
                                    <div className="space-y-3">
                                        <AutocompleteInput placeholder="Nome do Cliente" value={clientName} onChange={v => setClientName(v)} suggestions={filterSuggestions.clientNames} />
                                        <AutocompleteInput placeholder="Nome do Lead" value={nameQuery} onChange={v => setNameQuery(v)} suggestions={filterSuggestions.leadNames} />
                                        <AutocompleteInput placeholder="Nome do Imóvel" value={propertyName} onChange={v => setPropertyName(v)} suggestions={filterSuggestions.propertyNames} />
                                        <select value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="appearance-none w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs">
                                            <option value="any">Qualquer dormitório</option>
                                            {filterSuggestions.bedroomOptions.length > 0 ? (
                                                filterSuggestions.bedroomOptions.map(b => (
                                                    <option key={b} value={b}>{b} {parseInt(b) === 1 ? 'Quarto' : 'Quartos'}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="1">1 Quarto</option>
                                                    <option value="2">2 Quartos</option>
                                                    <option value="3">3 Quartos</option>
                                                    <option value="4+">4+ Quartos</option>
                                                </>
                                            )}
                                        </select>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" placeholder="Valor Mínimo" value={minPrice} onChange={e => setMinPrice(formatCurrencyBRL(e.target.value))} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                            <input type="text" placeholder="Valor Máximo" value={maxPrice} onChange={e => setMaxPrice(formatCurrencyBRL(e.target.value))} className="w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs" />
                                        </div>
                                        <AutocompleteInput placeholder="Localização" value={location} onChange={v => setLocation(v)} suggestions={filterSuggestions.locations} />
                                    </div>

                                    <button onClick={() => { handleFetchSystemLeads(); setShowFilters(false); }} disabled={isSelectingLeads} className="w-full h-9 bg-secondary text-secondary-foreground font-bold text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-secondary/90 transition-colors">
                                        {isSelectingLeads ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar e Buscar'}
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button 
                                onClick={() => setShowFilters(true)}
                                className="flex flex-row md:flex-col items-center justify-center gap-3 p-3 md:p-5 bg-background rounded-lg border border-muted-foreground/30 hover:border-muted-foreground/50 transition-all text-muted-foreground group text-center"
                            >
                                <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-card flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <Filter className="text-foreground" size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground">Leads</p>
                                    <p className="text-[10px]">Filtrar e selecionar</p>
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

                        {/* DDD padrão para importação */}
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                <Info size={10} className="shrink-0" />
                                Números sem DDD receberão o código
                            </p>
                            <input
                                type="text"
                                value={defaultDDD}
                                onChange={(e) => setDefaultDDD(e.target.value.replace(/\D/g, '').slice(0, 2))}
                                maxLength={2}
                                className="w-12 h-6 px-1.5 text-[10px] text-center font-bold bg-foreground/5 border border-border/40 rounded-md focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 text-foreground"
                            />
                        </div>

                        {/* Google Sheets URL Input */}
                        {showGoogleSheet && (
                            <div className="p-4 bg-background rounded-lg border border-muted-foreground/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
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
                                    A planilha deve estar compartilhada como &quot;Qualquer pessoa com o link&quot;. Planilhas com múltiplas abas serão detectadas automaticamente.
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
                                    <span className="px-2.5 py-1 rounded-lg bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/25">
                                        {importStats.valid} válidos
                                    </span>
                                    {importStats.linked > 0 && (
                                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25">
                                            {importStats.linked} vinculados ao CRM
                                        </span>
                                    )}
                                    {importStats.invalid > 0 && (
                                        <button
                                            onClick={() => setShowInvalids(!showInvalids)}
                                            className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors"
                                        >
                                            {importStats.invalid} inválidos {showInvalids ? '▲' : '▼'}
                                        </button>
                                    )}
                                    {importStats.duplicates > 0 && (
                                        <button
                                            onClick={() => setShowDuplicates(!showDuplicates)}
                                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
                                        >
                                            {importStats.duplicates} duplicados removidos {showDuplicates ? '▲' : '▼'}
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
                                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Duplicados Removidos</p>
                                    <div className="max-h-[120px] overflow-y-auto space-y-1 custom-scrollbar">
                                        {importStats.duplicateList.map((d, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[10px] text-amber-600 dark:text-amber-400">
                                                <span className="font-bold truncate max-w-[120px]">{d.name}</span>
                                                <span className="text-amber-500/70">{formatPhone(d.phone)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lista de inválidos */}
                            {showInvalids && importStats && importStats.invalid > 0 && (
                                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Números Inválidos</p>
                                        <button
                                            onClick={handleRemoveInvalids}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
                                        >
                                            <Trash2 size={10} />
                                            Remover Todos
                                        </button>
                                    </div>
                                    <div className="max-h-[120px] overflow-y-auto space-y-1 custom-scrollbar">
                                        {recipients.filter(r => r.isInvalid).map((r, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[10px] text-red-600 dark:text-red-400">
                                                <AlertCircle size={10} className="shrink-0" />
                                                <span className="font-bold truncate max-w-[120px]">{r.name}</span>
                                                <span className="text-red-500/70">{formatPhone(r.phone)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lista principal de destinatários */}
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {recipients.map((r, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                        r.isInvalid 
                                            ? 'bg-red-500/10 border-red-500/20' 
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

                    </div>

                    {/* Limite de Envios */}
                    {recipients.length > 0 && (
                        <div className="space-y-2">
                            <div className="min-h-[32px] flex items-center">
                                <label className="text-sm font-bold text-foreground ml-1">Limite de Envios</label>
                            </div>
                            <div className="flex items-center gap-3 p-3.5 bg-background rounded-lg border border-muted-foreground/30">
                                <div className="flex-1 min-w-0">
                                    <input
                                        type="number"
                                        min="1"
                                        max={recipients.length}
                                        value={sendLimit}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= recipients.length)) {
                                                setSendLimit(val)
                                            }
                                        }}
                                        placeholder={`Todos (${recipients.length})`}
                                        className="w-full h-10 px-3 text-sm font-medium bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-foreground placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        disabled={isSending}
                                    />
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-bold text-foreground">
                                        {effectiveRecipientCount} de {recipients.length}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {sendLimit && parseInt(sendLimit) > 0 && parseInt(sendLimit) < recipients.length
                                            ? 'Primeiros da lista'
                                            : 'Sem limite'
                                        }
                                    </p>
                                </div>
                            </div>
                            {sendLimit && parseInt(sendLimit) > 0 && parseInt(sendLimit) < recipients.length && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 ml-1 italic">
                                    <Info size={12} />
                                    Serão enviadas mensagens apenas para os primeiros {sendLimit} contatos da lista.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Seletor de Velocidade */}
                    <div className="space-y-2">
                        <div className="min-h-[32px] flex items-center">
                            <label className="text-sm font-bold text-foreground ml-1">Velocidade do Disparo</label>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { key: 'safe' as const, label: '60 – 120s', time: '~1h15 para 50 msgs', risk: 'Padrão', color: 'text-amber-500' },
                                { key: 'ultra' as const, label: '120 – 240s', time: '~2h30 para 50 msgs', risk: 'Seguro', color: 'text-green-500' },
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => { setPendingSpeed(opt.key); setShowSpeedWarning(true) }}
                                    disabled={isSending}
                                    className={`relative p-3.5 rounded-lg border text-center md:text-left transition-all ${
                                        sendSpeed === opt.key
                                            ? 'border-foreground/30 bg-background ring-1 ring-foreground/20'
                                            : 'border-muted-foreground/30 bg-background hover:border-muted-foreground/50'
                                    } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {sendSpeed === opt.key && (
                                        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-foreground animate-in fade-in zoom-in duration-200" />
                                    )}
                                    <p className="text-sm font-bold text-foreground">{opt.label} <span className="font-normal text-muted-foreground block md:inline">entre mensagens</span></p>
                                    <p className={`text-xs font-bold ${opt.color} mt-1`}>Risco {opt.risk}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{opt.time}</p>
                                </button>
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            {/* Modal de Aviso de Velocidade */}
            {showSpeedWarning && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-border">
                        <div className="px-6 py-5 border-b border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center">
                                        <AlertCircle className="text-secondary-foreground" size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-foreground">Atenção</h3>
                                        <p className="text-xs font-bold text-red-500">Aviso sobre possível bloqueio do WhatsApp</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setPendingSpeed(null); setShowSpeedWarning(false) }}
                                    className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-6 space-y-3">
                            <p className="text-sm text-foreground leading-relaxed">
                                Você escolheu o intervalo de <strong className="text-accent-icon">{pendingSpeed === 'safe' ? '60 – 120s' : '120 – 240s'}</strong> entre as mensagens.
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">
                                Nenhum intervalo de tempo garante que o número de WhatsApp utilizado não possa ser bloqueado.
                            </p>
                            <p className="text-sm font-bold text-foreground">
                                Deseja prosseguir mesmo assim?
                            </p>
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    onClick={() => { if (pendingSpeed) setSendSpeed(pendingSpeed); setPendingSpeed(null); setShowSpeedWarning(false) }}
                                    className="flex-1 h-12 text-sm font-bold bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                                >
                                    Sim, prosseguir
                                </button>
                                <button
                                    onClick={() => { setPendingSpeed(null); setShowSpeedWarning(false) }}
                                    className="flex-1 h-12 text-sm font-bold text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ações e Progresso */}
            <div className="pt-6 border-t border-border/40 flex flex-col gap-4">
                {isSending && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin text-accent-icon" size={14} />
                                <span>Enviando mensagens ({progress.current}/{progress.total})</span>
                            </div>
                            <span>{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-accent-icon transition-all duration-500"
                                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-green-600">{results.success} Sucessos</span>
                            <span className="text-red-500">{results.error} Falhas</span>
                        </div>
                    </div>
                )}

                {/* Alerta de campanha travada (stalled) */}
                {stalledDetected && !isSending && !isFinished && currentCampaignId && (
                    <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground">Disparo Travado</p>
                                <p className="text-[10px] text-muted-foreground">
                                    O servidor de disparo parou de responder. {progress.current}/{progress.total} mensagens foram processadas ({results.success} sucessos, {results.error} falhas).
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleResumeStalled}
                                className="flex-1 h-10 text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                                <Play size={14} />
                                Retomar Disparo
                            </button>
                            <button
                                onClick={handleForceCancel}
                                className="flex-1 h-10 text-xs font-bold bg-card border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                                <X size={14} />
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {isFinished && !isSending && !stalledDetected && (
                    <div className="p-4 bg-foreground/5 rounded-lg border border-border/40 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
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
                            onClick={() => { setIsFinished(false); setStalledDetected(false); setCurrentCampaignId(null); }}
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
                            disabled={stopRequested}
                            className={`w-full h-12 text-sm font-bold transition-all transform active:scale-[0.99] rounded-lg shadow-sm flex items-center justify-center gap-2 ${
                                stopRequested 
                                    ? 'bg-card border border-amber-500/30 text-amber-500 cursor-wait' 
                                    : 'bg-card border border-red-500/30 text-red-500 hover:bg-red-500/10'
                            }`}
                        >
                            {stopRequested ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Solicitando cancelamento...
                                </>
                            ) : (
                                <>
                                    <X size={20} />
                                    Interromper Disparo
                                </>
                            )}
                        </button>
                    ) : (
                        <button 
                            onClick={handleSend}
                            disabled={isSending || recipients.length === 0 || (!message && !media)}
                            className={`w-full h-12 text-sm font-bold bg-secondary border-none text-secondary-foreground hover:bg-secondary/90 transition-all transform active:scale-[0.99] rounded-lg shadow-sm flex items-center justify-center gap-2 ${(recipients.length === 0 || (!message && !media)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Iniciar Disparo para {effectiveRecipientCount} Contato{effectiveRecipientCount !== 1 ? 's' : ''}
                        </button>
                    )}
                </div>

            </div>

            {/* Histórico de Campanhas */}
            <div className="pt-4 border-t border-border/40">
                <div className="bg-background rounded-lg border border-muted-foreground/30 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-foreground/5 transition-colors" onClick={handleLoadHistory}>
                        <span className="text-sm font-bold text-foreground">Histórico de Disparos</span>
                        <div className="flex items-center gap-2">
                            {showHistory && campaignHistory.length > 0 && (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                            {showHistory ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                        </div>
                    </div>
                    {showHistory && (
                        <div className="border-t border-muted-foreground/20 animate-in fade-in slide-in-from-top-2 duration-200">
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
                            ) : campaignHistory.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-6">Nenhum disparo realizado ainda.</p>
                            ) : (
                                <div className="divide-y divide-muted-foreground/20">
                                {campaignHistory.map(c => (
                                <div key={c.id} className="space-y-0">
                                    <button
                                        onClick={() => c.total_errors > 0 ? handleExpandCampaign(c.id) : null}
                                        className={`w-full flex items-center justify-between p-3 text-left transition-colors group/card ${
                                            c.total_errors > 0 ? 'hover:bg-foreground/5 cursor-pointer' : 'cursor-default'
                                        } ${expandedCampaignId === c.id ? 'bg-foreground/5' : ''}`}
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
                                                {c.current_index !== undefined && c.current_index < c.total_recipients && c.status !== 'sending' && (
                                                    <span className="text-amber-500 font-bold">{c.current_index}/{c.total_recipients} enviados</span>
                                                )}
                                                {c.profiles && <span className="text-muted-foreground/60">por {c.profiles.full_name}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                            {/* Botão Continuar — para campanhas canceladas ou incompletas */}
                                            {c.status !== 'sending' && c.current_index !== undefined && c.current_index < c.total_recipients && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleResumeCampaign(c.id); }}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-amber-500 hover:text-amber-400 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-colors"
                                                    title={`Continuar de ${c.current_index}/${c.total_recipients}`}
                                                >
                                                    <Play size={10} />
                                                    Continuar
                                                </button>
                                            )}
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                c.status === 'completed' ? 'bg-green-600 text-white' : c.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {c.status === 'completed' ? 'Concluído' : c.status === 'cancelled' ? 'Cancelado' : 'Enviando'}
                                            </span>
                                            {c.total_errors > 0 ? (
                                                expandedCampaignId === c.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />
                                            ) : (
                                                <span className="w-[14px]" />
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
                            ))}
                            </div>
                        )}
                    </div>
                )}
                </div>
            </div>

            {/* Modal de Salvar Template */}
            {showSaveTemplate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-5 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
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
                    <div className="bg-card rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center">
                                        <FileSpreadsheet className="text-foreground" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-foreground">Selecionar Aba</h3>
                                        <p className="text-[10px] text-muted-foreground">Planilha com {availableSheets.length} abas detectadas</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowSheetPicker(false); setPendingWorkbook(null); setAvailableSheets([]); }}
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
                                        className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-border/40 bg-foreground/5 hover:bg-foreground/10 hover:border-border transition-all group text-left"
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
