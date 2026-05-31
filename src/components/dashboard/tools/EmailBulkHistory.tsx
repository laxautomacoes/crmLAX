'use client'

import { useState } from 'react'
import { getEmailCampaigns, getEmailCampaignReport, deleteEmailCampaign, deleteAllEmailCampaigns } from '@/app/_actions/email-bulk'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronUp, ChevronDown, Ban, Eye, Trash2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface EmailBulkHistoryProps {
    tenantId: string
}

export function EmailBulkHistory({ tenantId }: EmailBulkHistoryProps) {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

    // Relatório expandido
    const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
    const [reportLogs, setReportLogs] = useState<any[]>([])
    const [isLoadingReport, setIsLoadingReport] = useState(false)

    const handleLoadHistory = async () => {
        if (!showHistory) {
            setIsLoadingHistory(true)
            const res = await getEmailCampaigns(tenantId)
            if (res.success && res.data) {
                setCampaigns(res.data)
            }
            setIsLoadingHistory(false)
        }
        setShowHistory(!showHistory)
    }

    const handleExpandCampaign = async (campaignId: string) => {
        if (expandedCampaignId === campaignId) {
            setExpandedCampaignId(null)
            return
        }
        setExpandedCampaignId(campaignId)
        setIsLoadingReport(true)
        const res = await getEmailCampaignReport(campaignId)
        if (res.success && res.data) {
            setReportLogs(res.data)
        }
        setIsLoadingReport(false)
    }

    const handleDeleteCampaign = async (campaignId: string) => {
        const res = await deleteEmailCampaign(campaignId)
        if (res.success) {
            setCampaigns(prev => prev.filter(c => c.id !== campaignId))
            if (expandedCampaignId === campaignId) setExpandedCampaignId(null)
            toast.success('Campanha excluída.')
        } else {
            toast.error('Erro ao excluir campanha.')
        }
    }

    const handleDeleteAllCampaigns = async () => {
        const res = await deleteAllEmailCampaigns(tenantId)
        if (res.success) {
            setCampaigns([])
            setExpandedCampaignId(null)
            setConfirmDeleteAll(false)
            toast.success('Todas as campanhas foram excluídas.')
        } else {
            toast.error('Erro ao excluir campanhas.')
        }
    }

    return (
        <div className="bg-background rounded-lg border border-muted-foreground/30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-foreground/5 transition-colors" onClick={handleLoadHistory}>
                <span className="text-sm font-bold text-foreground">Histórico de Disparos</span>
                <div className="flex items-center gap-2">
                    {showHistory && campaigns.length > 0 && (
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
                    ) : campaigns.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">Nenhum disparo realizado ainda.</p>
                    ) : (
                        <div className="divide-y divide-muted-foreground/20">
                            {campaigns.map(c => (
                                <div key={c.id} className="space-y-0">
                                    <button
                                        onClick={() => handleExpandCampaign(c.id)}
                                        className={`w-full flex items-center justify-between p-3 text-left transition-colors group/card hover:bg-foreground/5 cursor-pointer ${expandedCampaignId === c.id ? 'bg-foreground/5' : ''}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                {c.status === 'completed' && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                                                {c.status === 'sending' && <Loader2 size={12} className="animate-spin text-amber-500 shrink-0" />}
                                                {c.status === 'cancelled' && <Ban size={12} className="text-red-500 shrink-0" />}
                                                <p className="text-xs font-bold text-foreground truncate">{c.title || c.subject || 'Sem título'}</p>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                <span className="flex items-center gap-1"><Clock size={10} />{new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="text-green-600 font-bold">{c.total_sent || 0} ✓</span>
                                                <span className="text-red-500 font-bold">{c.total_bounced || 0} ✗</span>
                                                {c.profiles && <span className="text-muted-foreground/60">por {c.profiles.full_name}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                c.status === 'completed' ? 'bg-green-600 text-white' : c.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {c.status === 'completed' ? 'Concluído' : c.status === 'cancelled' ? 'Cancelado' : 'Enviando'}
                                            </span>
                                            {expandedCampaignId === c.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(c.id); }}
                                                className="p-1.5 text-muted-foreground/50 hover:text-red-500 transition-colors opacity-0 group-hover/card:opacity-100"
                                                title="Excluir campanha"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </button>

                                    {/* Detalhes expandidos — relatório da campanha */}
                                    {expandedCampaignId === c.id && (
                                        <div className="p-3 bg-foreground/5 border border-t-0 border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {isLoadingReport ? (
                                                <div className="flex items-center justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" size={16} /></div>
                                            ) : reportLogs.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-3">Sem detalhes registrados para esta campanha.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">Relatório de Envio ({reportLogs.length})</p>
                                                    <div className="max-h-[250px] overflow-y-auto space-y-1 custom-scrollbar">
                                                        {reportLogs.map(log => (
                                                            <div key={log.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border/40">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        {log.status === 'opened' && <Eye size={10} className="text-green-500 shrink-0" />}
                                                                        {log.status === 'delivered' && <CheckCircle2 size={10} className="text-blue-500 shrink-0" />}
                                                                        {log.status === 'error' && <XCircle size={10} className="text-red-500 shrink-0" />}
                                                                        {log.status === 'bounced' && <Ban size={10} className="text-red-500 shrink-0" />}
                                                                        {log.status === 'complained' && <AlertTriangle size={10} className="text-orange-500 shrink-0" />}
                                                                        {log.status === 'pending' && <Loader2 size={10} className="animate-spin text-muted-foreground shrink-0" />}
                                                                        <p className="text-xs font-bold text-foreground truncate">{log.leads?.contacts?.name || log.recipient_email}</p>
                                                                        <p className="text-[10px] text-muted-foreground truncate">{log.recipient_email}</p>
                                                                    </div>
                                                                    {log.error_message && (
                                                                        <p className="text-[10px] text-red-500 mt-0.5 ml-[18px] truncate">{log.error_message}</p>
                                                                    )}
                                                                </div>
                                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                                                                    log.status === 'opened' ? 'bg-green-500/20 text-green-400' :
                                                                    log.status === 'delivered' ? 'bg-blue-500/20 text-blue-400' :
                                                                    log.status === 'error' || log.status === 'bounced' ? 'bg-red-500/20 text-red-400' :
                                                                    log.status === 'complained' ? 'bg-orange-500/20 text-orange-400' :
                                                                    'bg-foreground/10 text-muted-foreground'
                                                                }`}>
                                                                    {log.status === 'opened' ? 'Aberto' :
                                                                     log.status === 'delivered' ? 'Entregue' :
                                                                     log.status === 'error' ? 'Erro' :
                                                                     log.status === 'bounced' ? 'Bounced' :
                                                                     log.status === 'complained' ? 'Spam' :
                                                                     'Enviando'}
                                                                </span>
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
    )
}
