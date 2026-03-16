'use client'

import { useState, useRef } from 'react'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { 
    Send, 
    Users, 
    FileSpreadsheet, 
    Image as ImageIcon, 
    Video, 
    FileText, 
    X, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    Info,
    HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { sendBulkWhatsAppMessages } from '@/app/_actions/whatsapp-bulk'
import { getPipelineData } from '@/app/_actions/leads'
import { createClient } from '@/lib/supabase/client'
import { formatPhone } from '@/lib/utils/phone'

interface Recipient {
    name: string
    phone: string
    lead_id?: string
}

export function BulkSenderForm() {
    const [message, setMessage] = useState('')
    const [recipients, setRecipients] = useState<Recipient[]>([])
    const [sourceType, setSourceType] = useState<'system' | 'file' | null>(null)
    const [isMediaUploading, setIsMediaUploading] = useState(false)
    const [media, setMedia] = useState<{ url: string; type: 'image' | 'video' | 'document'; name: string } | null>(null)
    const [isSending, setIsSending] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [isSelectingLeads, setIsSelectingLeads] = useState(false)
    
    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            const bstr = evt.target?.result
            const wb = XLSX.read(bstr, { type: 'binary' })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]
            const data = XLSX.utils.sheet_to_json(ws) as any[]

            const mapped = data.map(row => ({
                name: row.Nome || row.name || row.nome || 'Cliente',
                phone: String(row.Telefone || row.phone || row.telefone || '').replace(/\D/g, '')
            })).filter(r => r.phone.length >= 10)

            setRecipients(mapped)
            setSourceType('file')
            toast.success(`${mapped.length} contatos importados da planilha.`)
        }
        reader.readAsBinaryString(file)
    }

    const handleFetchSystemLeads = async () => {
        setIsSelectingLeads(true)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Não autenticado')

            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
            if (!profile) throw new Error('Perfil não encontrado')

            const result = await getPipelineData(profile.tenant_id)
            if (result.success && result.data) {
                const mapped = result.data.leads.map((l: any) => ({
                    name: l.name,
                    phone: l.phone,
                    lead_id: l.id
                }))
                setRecipients(mapped)
                setSourceType('system')
                toast.success(`${mapped.length} leads do sistema selecionados.`)
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

    const handleSend = async () => {
        if (recipients.length === 0) return toast.error('Selecione os destinatários.')
        if (!message && !media) return toast.error('Escreva uma mensagem ou anexe um arquivo.')

        setIsSending(true)
        setProgress({ current: 0, total: recipients.length })

        try {
            const result = await sendBulkWhatsAppMessages({
                recipients,
                message,
                mediaUrl: media?.url,
                mediaType: media?.type,
                fileName: media?.name
            })

            if (result.success) {
                toast.success('Processo de disparo concluído!')
                setRecipients([])
                setSourceType(null)
                setMessage('')
                setMedia(null)
            } else {
                toast.error(result.error)
            }
        } catch (error: any) {
            toast.error('Erro no disparo: ' + error.message)
        } finally {
            setIsSending(false)
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
                            <Info size={12} /> Use {"{nome}"} para personalizar com o nome do cliente.
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
                                    className="flex-1 flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#FFE600] hover:bg-[#FFE600]/5 transition-all text-gray-500 hover:text-[#404F4F] group"
                                >
                                    {isMediaUploading ? (
                                        <Loader2 className="animate-spin text-[#404F4F]" size={24} />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-[#FFE600]/20 transition-colors">
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
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={handleFetchSystemLeads}
                                disabled={isSelectingLeads}
                                className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#404F4F]/20 hover:bg-gray-100 transition-all text-gray-600 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    {isSelectingLeads ? <Loader2 className="animate-spin" size={24} /> : <Users className="text-[#404F4F]" size={24} />}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-[#404F4F]">Leads do Sistema</p>
                                    <p className="text-[10px]">Todos os leads cadastrados</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#404F4F]/20 hover:bg-gray-100 transition-all text-gray-600 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet className="text-[#404F4F]" size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-[#404F4F]">Subir Planilha</p>
                                    <p className="text-[10px]">Excel ou CSV (Nome e Tel)</p>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                    accept=".csv,.xlsx,.xls"
                                />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lista de Envio</span>
                                <button 
                                    onClick={() => { setRecipients([]); setSourceType(null); }}
                                    className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
                                >
                                    Limpar Lista
                                </button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {recipients.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-[#404F4F] truncate">{r.name}</p>
                                            <p className="text-[10px] text-gray-500">{formatPhone(r.phone)}</p>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
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
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#404F4F]">
                            <span>Enviando mensagens ({progress.current}/{progress.total})</span>
                            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[#FFE600] transition-all duration-500"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <button 
                    onClick={handleSend}
                    disabled={isSending || recipients.length === 0 || (!message && !media)}
                    className={`w-full h-12 text-sm font-bold bg-[#FFE600] border-none text-black hover:bg-[#F2DB00] transition-all transform active:scale-[0.99] rounded-xl shadow-sm flex items-center justify-center gap-2 ${isSending ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {isSending ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Processando Envio em Massa...
                        </>
                    ) : (
                        <>
                            <Send size={20} />
                            Iniciar Disparo para {recipients.length} Contatos
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
