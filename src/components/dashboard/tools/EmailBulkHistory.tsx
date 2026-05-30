'use client'

import { useState, useEffect } from 'react'
import { getEmailCampaigns, getEmailCampaignReport } from '@/app/_actions/email-bulk'
import { Loader2, Mail, CheckCircle2, XCircle, MousePointerClick, AlertTriangle, ChevronRight, Ban, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EmailBulkHistoryProps {
    tenantId: string
}

export function EmailBulkHistory({ tenantId }: EmailBulkHistoryProps) {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null)
    const [reportLogs, setReportLogs] = useState<any[]>([])
    const [loadingReport, setLoadingReport] = useState(false)

    useEffect(() => {
        loadCampaigns()
    }, [tenantId])

    const loadCampaigns = async () => {
        setLoading(true)
        const res = await getEmailCampaigns(tenantId)
        if (res.success && res.data) {
            setCampaigns(res.data)
        }
        setLoading(false)
    }

    const openReport = async (campaign: any) => {
        setSelectedCampaign(campaign)
        setLoadingReport(true)
        const res = await getEmailCampaignReport(campaign.id)
        if (res.success && res.data) {
            setReportLogs(res.data)
        }
        setLoadingReport(false)
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
    }

    if (campaigns.length === 0) {
        return (
            <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border/50">
                <Mail className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-3" />
                <h3 className="text-sm font-bold text-foreground">Nenhuma campanha enviada</h3>
                <p className="text-xs text-muted-foreground mt-1">Os envios em massa aparecerão aqui.</p>
            </div>
        )
    }

    if (selectedCampaign) {
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <button 
                    onClick={() => setSelectedCampaign(null)}
                    className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                    <ChevronRight className="rotate-180" size={16} /> Voltar para histórico
                </button>

                <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm space-y-6">
                    <div>
                        <h2 className="text-xl font-black text-foreground">{selectedCampaign.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">Enviada em {format(new Date(selectedCampaign.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-foreground/5 p-4 rounded-xl border border-border/40">
                            <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Destinatários</p>
                            <p className="text-2xl font-black text-foreground mt-1">{selectedCampaign.total_recipients}</p>
                        </div>
                        <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                            <p className="text-[10px] uppercase font-black tracking-wider text-green-600 dark:text-green-400">Taxa Abertura</p>
                            <p className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">
                                {selectedCampaign.total_sent > 0 
                                    ? Math.round((selectedCampaign.total_opened / selectedCampaign.total_sent) * 100) 
                                    : 0}%
                            </p>
                            <p className="text-xs font-bold text-green-600/70 dark:text-green-400/70 mt-1">{selectedCampaign.total_opened} abertos</p>
                        </div>
                        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                            <p className="text-[10px] uppercase font-black tracking-wider text-red-600 dark:text-red-400">Erros / Bounce</p>
                            <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{selectedCampaign.total_bounced}</p>
                        </div>
                        <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                            <p className="text-[10px] uppercase font-black tracking-wider text-orange-600 dark:text-orange-400">Spam Reportado</p>
                            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">{selectedCampaign.total_complained}</p>
                        </div>
                    </div>

                    <div className="pt-4">
                        <h3 className="font-bold text-foreground mb-4">Relatório Detalhado</h3>
                        
                        {loadingReport ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                        ) : (
                            <div className="border border-border/40 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-foreground/5 text-foreground font-bold uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="p-4">Contato</th>
                                            <th className="p-4">E-mail</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Data/Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {reportLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-foreground/[0.02]">
                                                <td className="p-4 font-bold text-foreground">{log.leads?.contacts?.name || '-'}</td>
                                                <td className="p-4 text-muted-foreground">{log.recipient_email}</td>
                                                <td className="p-4">
                                                    {log.status === 'opened' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-wider"><Eye size={12} /> Aberto</span>}
                                                    {log.status === 'delivered' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider"><CheckCircle2 size={12} /> Entregue</span>}
                                                    {log.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-foreground/10 text-muted-foreground text-[10px] font-black uppercase tracking-wider"><Loader2 size={12} className="animate-spin"/> Enviando</span>}
                                                    {log.status === 'error' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider"><XCircle size={12} /> Erro API</span>}
                                                    {log.status === 'bounced' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider"><Ban size={12} /> Bounced</span>}
                                                    {log.status === 'complained' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider"><AlertTriangle size={12} /> Spam</span>}
                                                </td>
                                                <td className="p-4 text-xs text-muted-foreground">
                                                    {format(new Date(log.opened_at || log.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {campaigns.map(camp => (
                <div key={camp.id} onClick={() => openReport(camp)} className="bg-card p-5 rounded-2xl border border-border/50 shadow-sm hover:border-foreground/30 transition-all cursor-pointer flex flex-col md:flex-row gap-6 md:items-center justify-between group">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-foreground text-lg group-hover:text-secondary-foreground transition-colors">{camp.title}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                                camp.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                camp.status === 'sending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                'bg-foreground/10 text-muted-foreground'
                            }`}>
                                {camp.status === 'completed' ? 'Finalizada' : camp.status === 'sending' ? 'Processando' : camp.status}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{camp.subject}</p>
                        <p className="text-xs font-bold text-muted-foreground">
                            Enviada em {format(new Date(camp.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                            {camp.profiles?.full_name ? ` por ${camp.profiles.full_name}` : ''}
                        </p>
                    </div>

                    <div className="flex items-center gap-6 md:gap-8 shrink-0">
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Destinatários</p>
                            <p className="font-black text-foreground">{camp.total_recipients}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Aberturas</p>
                            <p className="font-black text-green-600 dark:text-green-400">
                                {camp.total_sent > 0 ? Math.round((camp.total_opened / camp.total_sent) * 100) : 0}%
                            </p>
                        </div>
                        <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                </div>
            ))}
        </div>
    )
}
