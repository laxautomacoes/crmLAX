'use client'

import { useState, useEffect } from 'react'
import { Globe, CheckCircle2, XCircle, Clock, Loader2, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { setupEmailDomain, checkEmailDomainStatus, deleteEmailDomain } from '@/app/_actions/tenant'
import { toast } from 'sonner'

interface EmailDomainSettingsProps {
    tenantId: string;
    initialDomain?: string;
    initialResendId?: string;
    initialVerified?: boolean;
    initialStatus?: string;
}

export function EmailDomainSettings({ 
    tenantId, 
    initialDomain, 
    initialResendId, 
    initialVerified,
    initialStatus 
}: EmailDomainSettingsProps) {
    const [domain, setDomain] = useState(initialDomain || '')
    const [resendId, setResendId] = useState(initialResendId || '')
    const [status, setStatus] = useState(initialStatus || 'not_started')
    const [verified, setVerified] = useState(initialVerified || false)
    const [loading, setLoading] = useState(false)
    const [dnsRecords, setDnsRecords] = useState<any[]>([])

    // Busca as chaves DNS automaticamente se já tivermos um ID mas não tivermos as chaves
    useEffect(() => {
        if (resendId && dnsRecords.length === 0) {
            handleCheckStatus(true)
        }
    }, [resendId])

    const handleSetup = async () => {
        const cleanDomain = domain.trim().replace(/^@/, '')
        if (!cleanDomain) return
        setLoading(true)
        
        const result = await setupEmailDomain(tenantId, cleanDomain)
        
        if (result.success) {
            setDomain(cleanDomain) 
            setResendId(result.data.id)
            setStatus(result.data.status)
            
            // Combinar dkim e records
            let allRecords: any[] = []
            if (result.data.dkim && Array.isArray(result.data.dkim)) allRecords = [...result.data.dkim]
            
            if (result.data.spf) {
                const spf = Array.isArray(result.data.spf) ? result.data.spf : [result.data.spf]
                allRecords = [...allRecords, ...spf]
            }

            if (result.data.dmarc) {
                const dmarc = Array.isArray(result.data.dmarc) ? result.data.dmarc : [result.data.dmarc]
                allRecords = [...allRecords, ...dmarc]
            }

            if (result.data.records && Array.isArray(result.data.records)) {
                const existingValues = new Set(allRecords.map(r => r.value))
                const extra = result.data.records.filter((r: any) => !existingValues.has(r.value))
                allRecords = [...allRecords, ...extra]
            }

            // Injetar DMARC se faltar
            if (!allRecords.some(r => r.name?.includes('_dmarc'))) {
                allRecords.push({
                    record: 'DMARC',
                    type: 'TXT',
                    name: '_dmarc',
                    value: 'v=DMARC1; p=none;',
                    priority: null
                })
            }

            setDnsRecords(allRecords)
            
            toast.success('Domínio registrado! Configure os registros DNS abaixo.')
        } else {
            toast.error('Erro ao configurar domínio: ' + result.error)
        }
        setLoading(false)
    }

    const handleCheckStatus = async (silent = false) => {
        if (!resendId) return
        setLoading(true)
        
        const result = await checkEmailDomainStatus(tenantId, resendId)
        
        if (result.success) {
            setStatus(result.data.status)
            setVerified(result.data.status === 'verified')

            // Combinar todos os registros possíveis que o Resend pode retornar
            let allRecords: any[] = []
            
            // DKIM Records
            if (result.data.dkim && Array.isArray(result.data.dkim)) {
                allRecords = [...allRecords, ...result.data.dkim]
            }
            
            // SPF Record (pode vir como objeto único ou array)
            if (result.data.spf) {
                const spf = Array.isArray(result.data.spf) ? result.data.spf : [result.data.spf]
                allRecords = [...allRecords, ...spf]
            }

            // DMARC Record
            if (result.data.dmarc) {
                const dmarc = Array.isArray(result.data.dmarc) ? result.data.dmarc : [result.data.dmarc]
                allRecords = [...allRecords, ...dmarc]
            }
            
            // Garantir que o DMARC apareça (mesmo que a API não mande, ele é padrão do Resend)
            const hasDmarc = allRecords.some(r => r.name?.includes('_dmarc'))
            if (!hasDmarc) {
                allRecords.push({
                    record: 'DMARC',
                    type: 'TXT',
                    name: '_dmarc',
                    value: 'v=DMARC1; p=none;',
                    priority: null
                })
            }

            setDnsRecords(allRecords)
            
            if (!silent) {
                if (result.data.status === 'verified') {
                    toast.success('Domínio verificado com sucesso!')
                } else {
                    toast.info('O domínio ainda está pendente. A propagação DNS pode levar alguns minutos.')
                }
            }
        } else if (!silent) {
            toast.error('Erro ao verificar status: ' + result.error)
        }
        setLoading(false)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Copiado!')
    }

    const handleDelete = async () => {
        if (!resendId) return
        if (!confirm('Tem certeza que deseja excluir este domínio? Esta ação não pode ser desfeita.')) return
        
        setLoading(true)
        const result = await deleteEmailDomain(tenantId, resendId)
        
        if (result.success) {
            setResendId('')
            setDomain('')
            setDnsRecords([])
            setVerified(false)
            setStatus('not_started')
            toast.success('Domínio excluído com sucesso!')
        } else {
            toast.error('Erro ao excluir domínio: ' + result.error)
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div className="ml-1">
                <h3 className="text-lg font-bold text-foreground">Domínio de Envio</h3>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                <p className="text-sm font-bold text-foreground">Configure seu domínio para enviar e-mails profissionais e evitar SPAM.</p>

                {!resendId ? (
                    <div className="space-y-4">
                        <div className="max-w-xl">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Seu Domínio</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="ex: imobiliaria.com.br"
                                        className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleSetup}
                                    disabled={loading || !domain.trim()}
                                    className="px-6 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px] h-10 gap-2 text-sm"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Configurar'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-muted/10 border border-border rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="font-bold text-sm text-foreground">{domain}</div>
                                {verified ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold border border-green-500/20">
                                        <CheckCircle2 size={12} />
                                        VERIFICADO
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold border border-amber-500/20">
                                        <Clock size={12} />
                                        PENDENTE
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => handleCheckStatus()}
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground hover:border-secondary/50 flex items-center justify-center transition-all disabled:opacity-50 h-8 min-w-[140px]"
                                >
                                    {loading ? <Loader2 size={12} className="animate-spin" /> : 'ATUALIZAR STATUS'}
                                </button>
                                <button 
                                    onClick={() => {
                                        setResendId('')
                                        setDnsRecords([])
                                    }}
                                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold text-secondary/70 hover:text-secondary hover:border-secondary/50 flex items-center justify-center transition-all h-8 min-w-[140px]"
                                >
                                    ALTERAR DOMÍNIO
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold text-red-500/70 hover:text-red-500 hover:border-red-500/50 flex items-center justify-center transition-all disabled:opacity-50 h-8 min-w-[140px]"
                                >
                                    {loading ? <Loader2 size={12} className="animate-spin" /> : 'EXCLUIR DOMÍNIO'}
                                </button>
                            </div>
                        </div>

                        {!verified && dnsRecords.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                        Adicione os registros abaixo na configuração de DNS do seu domínio para ativar o envio:
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {dnsRecords.map((record, idx) => (
                                        <div key={idx} className="p-3 border border-border rounded-xl bg-background/50 group relative hover:border-secondary/30 transition-colors flex flex-col">
                                            <div className="flex items-center justify-between mb-3 border-b border-border/10 pb-1.5">
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded tracking-tighter">
                                                    Registro {record.record || 'DNS'}
                                                </span>
                                            </div>

                                            <div className="space-y-1.5 flex-1">
                                                <div className="flex items-center gap-4 group/row">
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-14">Tipo</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none">{record.type}</code>
                                                        <button onClick={() => copyToClipboard(record.type)} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                            <Copy size={10} className="text-muted-foreground/60" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 group/row">
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-14">Host</span>
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none truncate max-w-[150px]">{record.name}</code>
                                                        <button onClick={() => copyToClipboard(record.name)} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                            <Copy size={10} className="text-muted-foreground/60" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 group/row">
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-14">Valor</span>
                                                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                                                        <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none truncate max-w-[150px]">{record.value}</code>
                                                        <button onClick={() => copyToClipboard(record.value)} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded shrink-0">
                                                            <Copy size={10} className="text-muted-foreground/60" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {record.priority !== undefined && record.priority !== null && (
                                                    <div className="flex items-center gap-4 group/row">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-14">Prioridade</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none">{record.priority}</code>
                                                            <button onClick={() => copyToClipboard(record.priority.toString())} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                                <Copy size={10} className="text-muted-foreground/60" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 group/row">
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-14">TTL</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none">Auto</code>
                                                        <button onClick={() => copyToClipboard('Auto')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                            <Copy size={10} className="text-muted-foreground/60" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {verified && (
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                                <CheckCircle2 className="text-green-500" size={20} />
                                <div>
                                    <p className="text-sm font-bold text-green-700">Tudo pronto!</p>
                                    <p className="text-xs text-green-600/80">Seus e-mails agora são enviados diretamente via <strong>{domain}</strong>.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
