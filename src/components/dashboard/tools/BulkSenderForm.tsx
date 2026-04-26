'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { 
    Send, Users, FileSpreadsheet, Image as ImageIcon, Video, FileText, X, Loader2, 
    CheckCircle2, AlertCircle, Info, HelpCircle, Filter, History, ChevronDown, ChevronUp, Clock, Ban,
    Link, Unlink, Trash2, Globe, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { 
    checkWhatsAppStatus, sendSingleBulkMessage, validateBulkAccess, 
    getLeadsForBulk, getBulkFilterOptions, createBulkCampaign, updateBulkCampaign, getBulkCampaigns,
    matchRecipientsWithLeads, fetchGoogleSheetData
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

interface CampaignRecord {
    id: string; message: string; total_recipients: number; total_success: number; total_errors: number;
    status: string; source_type: string; created_at: string; completed_at: string | null;
    profiles: { full_name: string } | null;
}

interface BulkSenderFormProps {
    tenantId: string
    profileId: string
    isAdmin: boolean
}

export function BulkSenderForm({ tenantId, profileId, isAdmin }: BulkSenderFormProps) {
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
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]
            const data = XLSX.utils.sheet_to_json(ws) as any[]
            await processImportedData(data)
        }
        reader.readAsBinaryString(file)
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
            tenantId, profileId, message,
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
            try {
                const res = await sendSingleBulkMessage({
                    recipient, message,
                    mediaUrl: media?.url, mediaType: media?.type, fileName: media?.name,
                    instanceName: status.instanceName
                })
                if (res.success) currentSuccess++
                else currentError++
            } catch { currentError++ }

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



    return (
        <div className="bg-card p-6 rounded-2xl border border-muted-foreground/30 shadow-sm space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Composição */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-800 ml-1">Mensagem do WhatsApp</label>
                        <FormTextarea 
                            placeholder="Olá {nome}, tudo bem? Confira esta oportunidade..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={8}
                        />
                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 italic">
                            <Info size={12} /> Use {"{nome}"} ou {"{primeiro_nome}"} para personalizar.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-800 ml-1">Anexar Mídia ou Documento</label>
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
                                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                                            <img src={media.url} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white text-xs font-bold">{media.name}</p>
                                            </div>
                                        </div>
                                    ) : media.type === 'video' ? (
                                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-black flex items-center justify-center">
                                            <video 
                                                src={media.url} 
                                                className="w-full h-full object-cover opacity-80"
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
                                        <div className="flex items-center gap-4 p-5 bg-[#404F4F]/5 rounded-2xl border-2 border-dashed border-[#404F4F]/20 w-full group-hover:bg-[#404F4F]/10 transition-colors">
                                            <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#404F4F] border border-[#404F4F]/10">
                                                <FileText size={32} strokeWidth={1.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[#404F4F] truncate">{media.name}</p>
                                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-0.5">Documento • PDF/Excel</p>
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
                                    className="flex-1 flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-accent-icon hover:bg-accent-icon/5 transition-all text-gray-500 hover:text-[#404F4F] group"
                                >
                                    {isMediaUploading ? (
                                        <Loader2 className="animate-spin text-[#404F4F]" size={24} />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-accent-icon/20 transition-colors">
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
                    <label className="text-sm font-bold text-gray-800 ml-1">Destinatários ({recipients.length})</label>
                    
                    {recipients.length === 0 ? (
                        <div className="space-y-4">
                            {/* Filtros */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 text-xs font-bold text-[#404F4F] hover:text-accent-icon transition-colors"
                            >
                                <Filter size={14} />
                                <span>Filtros de Segmentação</span>
                                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {showFilters && filterOptions && (
                                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Estágios */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Estágio do Funil</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {filterOptions.stages.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => setSelectedStages(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                                        selectedStages.includes(s.id)
                                                            ? 'bg-[#404F4F] text-white border-[#404F4F]'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#404F4F]/30'
                                                    }`}
                                                >{s.name}</button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Origem */}
                                    {filterOptions.sources.length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Origem</label>
                                            <select
                                                value={selectedSource}
                                                onChange={e => { setSelectedSource(e.target.value); setSelectedCampaign('') }}
                                                className="w-full h-9 px-3 text-xs font-bold bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#404F4F]/40"
                                            >
                                                <option value="">Todas as origens</option>
                                                {filterOptions.sources.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}
                                            </select>
                                        </div>
                                    )}
                                    {/* Campanha */}
                                    {selectedSource && filterOptions.campaigns.filter(c => c.source_name === selectedSource).length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Campanha</label>
                                            <select
                                                value={selectedCampaign}
                                                onChange={e => setSelectedCampaign(e.target.value)}
                                                className="w-full h-9 px-3 text-xs font-bold bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#404F4F]/40"
                                            >
                                                <option value="">Todas</option>
                                                {filterOptions.campaigns.filter(c => c.source_name === selectedSource).map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}
                                            </select>
                                        </div>
                                    )}
                                    {/* Corretor (só admin) */}
                                    {isAdmin && filterOptions.brokers.length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Corretor</label>
                                            <select
                                                value={selectedBroker}
                                                onChange={e => setSelectedBroker(e.target.value)}
                                                className="w-full h-9 px-3 text-xs font-bold bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#404F4F]/40"
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
                                className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#404F4F]/20 hover:bg-gray-100 transition-all text-gray-600 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    {isSelectingLeads ? <Loader2 className="animate-spin" size={24} /> : <Users className="text-[#404F4F]" size={24} />}
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-[#404F4F]">Leads do Sistema</p>
                                    <p className="text-[10px]">{selectedStages.length > 0 || selectedSource ? 'Filtros aplicados' : 'Leads cadastrados'}</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#404F4F]/20 hover:bg-gray-100 transition-all text-gray-600 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet className="text-[#404F4F]" size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-[#404F4F]">Subir Planilha</p>
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
                                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all text-gray-600 group ${
                                    showGoogleSheet 
                                        ? 'bg-[#404F4F]/5 border-[#404F4F]/20' 
                                        : 'bg-gray-50 border-gray-100 hover:border-[#404F4F]/20 hover:bg-gray-100'
                                }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <Globe className="text-[#0F9D58]" size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-[#404F4F]">Google Sheets</p>
                                    <p className="text-[10px]">Colar link</p>
                                </div>
                            </button>
                        </div>

                        {/* Google Sheets URL Input */}
                        {showGoogleSheet && (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className="text-[#0F9D58] shrink-0" />
                                    <p className="text-[10px] font-bold text-gray-700">Cole o link de compartilhamento da planilha</p>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={googleSheetUrl}
                                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                        className="flex-1 h-10 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#404F4F]/40 focus:ring-2 focus:ring-ring/50"
                                        onKeyDown={(e) => e.key === 'Enter' && handleGoogleSheetImport()}
                                    />
                                    <button
                                        onClick={handleGoogleSheetImport}
                                        disabled={isLoadingSheet || !googleSheetUrl.trim()}
                                        className={`h-10 px-4 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
                                            isLoadingSheet || !googleSheetUrl.trim()
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
                                <p className="text-[10px] text-gray-400 italic flex items-center gap-1">
                                    <Info size={10} />
                                    A planilha deve estar compartilhada como "Qualquer pessoa com o link"
                                </p>
                            </div>
                        )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lista de Envio</span>
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
                                        <span className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 border border-gray-100 flex items-center gap-1">
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
                                            : 'bg-gray-50 border-gray-100'
                                    }`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <p className={`text-xs font-bold truncate ${r.isInvalid ? 'text-red-500' : 'text-[#404F4F]'}`}>{r.name}</p>
                                                {r.lead_id && (
                                                    <span title="Vinculado ao CRM">
                                                        <Link size={10} className="text-blue-500 shrink-0" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[10px] ${r.isInvalid ? 'text-red-400' : 'text-gray-500'}`}>{formatPhone(r.phone)}</p>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                                            r.isInvalid ? 'bg-red-400' : r.lead_id ? 'bg-blue-400' : 'bg-yellow-400'
                                        }`}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3">
                        <HelpCircle className="text-blue-500 shrink-0" size={18} />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-900">Como funciona o disparo?</p>
                            <p className="text-[10px] text-blue-700 leading-relaxed text-pretty">
                                O sistema enviará as mensagens uma por uma, com um intervalo aleatório entre 1.5s e 3s para simular comportamento humano e reduzir o risco de bloqueio. 
                                <br/><br/>
                                <strong className="text-blue-900">Importante:</strong> Mantenha esta aba aberta até o fim do processo.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações e Progresso */}
            <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
                {isSending && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-[#404F4F]">
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin text-accent-icon" size={14} />
                                <span>Enviando mensagens ({progress.current}/{progress.total})</span>
                            </div>
                            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
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
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#404F4F]">Disparo Finalizado</p>
                                <p className="text-[10px] text-gray-500">{results.success} enviados, {results.error} falhas.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsFinished(false)}
                            className="text-[10px] font-bold text-[#404F4F] hover:underline"
                        >
                            Fechar Resumo
                        </button>
                    </div>
                )}

                <div className="flex gap-3">
                    {isSending ? (
                        <button 
                            onClick={handleStop}
                            className="w-full h-12 text-sm font-bold bg-white border border-red-200 text-red-500 hover:bg-red-50 transition-all transform active:scale-[0.99] rounded-xl shadow-sm flex items-center justify-center gap-2"
                        >
                            <X size={20} />
                            Interromper Disparo
                        </button>
                    ) : (
                        <button 
                            onClick={handleSend}
                            disabled={isSending || recipients.length === 0 || (!message && !media)}
                            className={`w-full h-12 text-sm font-bold bg-[#FFE600] border-none text-black hover:bg-[#F2DB00] transition-all transform active:scale-[0.99] rounded-xl shadow-sm flex items-center justify-center gap-2 ${(recipients.length === 0 || (!message && !media)) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            <Send size={20} />
                            Iniciar Disparo para {recipients.length} Contatos
                        </button>
                    )}
                </div>

            </div>

            {/* Histórico de Campanhas */}
            <div className="pt-4 border-t border-gray-100">
                <button
                    onClick={handleLoadHistory}
                    className="flex items-center gap-2 text-xs font-bold text-[#404F4F]/70 hover:text-[#404F4F] transition-colors"
                >
                    <History size={14} />
                    <span>Histórico de Disparos</span>
                    {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showHistory && (
                    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={20} /></div>
                        ) : campaignHistory.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-6">Nenhum disparo realizado ainda.</p>
                        ) : (
                            campaignHistory.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            {c.status === 'completed' && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                                            {c.status === 'cancelled' && <Ban size={12} className="text-red-500 shrink-0" />}
                                            {c.status === 'sending' && <Loader2 size={12} className="animate-spin text-amber-500 shrink-0" />}
                                            <p className="text-xs font-bold text-[#404F4F] truncate">{c.message ? c.message.substring(0, 50) + (c.message.length > 50 ? '...' : '') : 'Somente mídia'}</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                            <span className="flex items-center gap-1"><Clock size={10} />{new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="text-green-600 font-bold">{c.total_success} ✓</span>
                                            <span className="text-red-500 font-bold">{c.total_errors} ✗</span>
                                            {c.profiles && <span className="text-gray-400">por {c.profiles.full_name}</span>}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ml-3 ${
                                        c.status === 'completed' ? 'bg-green-50 text-green-600' : c.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                        {c.status === 'completed' ? 'Concluído' : c.status === 'cancelled' ? 'Cancelado' : 'Enviando'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
