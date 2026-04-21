'use client'

import { useState, useEffect } from 'react'
import { Globe, CheckCircle2, XCircle, Clock, Loader2, Copy, ExternalLink, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react'
import { setupEmailDomain, checkEmailDomainStatus, deleteEmailDomain } from '@/app/_actions/tenant'
import { Modal } from '@/components/shared/Modal'
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
    const [showDeleteModal, setShowDeleteModal] = useState(false)

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

            // Records array (Fallback para onde podem vir os registros DKIM/SPF)
            if (result.data.records && Array.isArray(result.data.records)) {
                const existingValues = new Set(allRecords.map(r => r.value))
                const extra = result.data.records.filter((r: any) => !existingValues.has(r.value))
                allRecords = [...allRecords, ...extra]
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
        
        setLoading(true)
        const result = await deleteEmailDomain(tenantId, resendId)
        
        if (result.success) {
            setResendId('')
            setDomain('')
            setDnsRecords([])
            setVerified(false)
            setStatus('not_started')
            setShowDeleteModal(false)
            toast.success('Domínio excluído com sucesso!')
        } else {
            toast.error('Erro ao excluir domínio: ' + result.error)
        }
        setLoading(false)
    }

    return (
        <div className="w-full">
            <h4 className="text-lg font-bold text-foreground text-center sm:text-left sm:ml-1 mb-6 sm:mb-3">
                Domínio de Envio
            </h4>

            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-6">
                <div className="space-y-6">
                    <p className="text-sm font-bold text-foreground text-center sm:text-left sm:ml-1 block">Configure seu domínio para enviar e-mails profissionais e evitar SPAM.</p>

                    {!resendId ? (
                        <div className="space-y-4">
                            <div className="max-w-xl">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Seu Domínio</label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <Globe className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <input 
                                            type="text"
                                            placeholder="ex: imobiliaria.com.br"
                                            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                                            value={domain}
                                            onChange={(e) => setDomain(e.target.value)}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleSetup}
                                        disabled={loading || !domain.trim()}
                                        className="w-full sm:w-auto px-6 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px] h-11 sm:h-10 gap-2 text-sm"
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Configurar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/10 border border-border rounded-xl gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex flex-row items-center justify-between sm:justify-start gap-4">
                                        <h4 className="text-xl font-black tracking-tight text-foreground">{domain}</h4>
                                        {verified && (
                                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                                <CheckCircle2 size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Verificado</span>
                                            </div>
                                        )}
                                    </div>
                                    {!verified && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold border border-amber-500/20">
                                            <Clock size={12} />
                                            PENDENTE
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={() => handleCheckStatus()}
                                        disabled={loading}
                                        className="w-full sm:w-auto px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground hover:border-secondary/50 flex items-center justify-center transition-all disabled:opacity-50 h-9 sm:h-8 min-w-[140px]"
                                    >
                                        {loading ? <Loader2 size={12} className="animate-spin" /> : 'ATUALIZAR STATUS'}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setResendId('')
                                            setDnsRecords([])
                                        }}
                                        className="w-full sm:w-auto px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold text-secondary/70 hover:text-secondary hover:border-secondary/50 flex items-center justify-center transition-all h-9 sm:h-8 min-w-[140px]"
                                    >
                                        ALTERAR DOMÍNIO
                                    </button>
                                    <button 
                                        onClick={() => setShowDeleteModal(true)}
                                        disabled={loading}
                                        className="w-full sm:w-auto px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold text-red-500/70 hover:text-red-500 hover:border-red-500/50 flex items-center justify-center transition-all disabled:opacity-50 h-9 sm:h-8 min-w-[140px]"
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
                                                            <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none truncate max-w-[120px] sm:max-w-[150px]">{record.name}</code>
                                                            <button onClick={() => copyToClipboard(record.name)} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                                <Copy size={10} className="text-muted-foreground/60" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 group/row">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-14">Valor</span>
                                                        <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                                                            <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none truncate max-w-[120px] sm:max-w-[150px]">{record.value}</code>
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
                                <div className="p-4 sm:p-6 bg-green-500/10 border border-green-500/20 rounded-xl space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                                    <div className="space-y-1 text-center w-full">
                                        <h4 className="text-base font-bold text-green-500">Tudo pronto!</h4>
                                        <p className="text-sm text-green-600/80 leading-relaxed">
                                            Seus e-mails agora são enviados diretamente via <strong className="text-green-600">{domain}</strong>.
                                        </p>
                                    </div>

                                    {/* Timeline Unificada - Mobile Optimized */}
                                    <div className="relative py-8 px-4 rounded-xl bg-black/20 overflow-hidden group border border-green-500/10">
                                        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                        <div className="relative flex flex-col sm:flex-row items-center sm:justify-between max-w-xl mx-auto gap-8 sm:gap-4">
                                            {/* Connection Line - Desktop Horizontal / Mobile Vertical */}
                                            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-green-500/10 -translate-x-1/2 sm:top-4 sm:bottom-auto sm:left-0 sm:w-full sm:h-[1px] sm:translate-x-0 sm:-translate-y-1/2"></div>
                                            
                                            <div className="relative flex flex-col items-center gap-3 z-10">
                                                <div className="w-8 h-8 rounded-lg border border-green-500/20 bg-background flex items-center justify-center text-green-500">
                                                    <Globe size={14} />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">Domínio adicionado</p>
                                                    <p className="text-[8px] text-green-600/40 font-medium">Processo iniciado</p>
                                                </div>
                                            </div>

                                            <div className="relative flex flex-col items-center gap-3 z-10">
                                                <div className="w-8 h-8 rounded-lg border border-green-500/20 bg-background flex items-center justify-center text-green-500">
                                                    <RefreshCw size={14} />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">DNS verificado</p>
                                                    <p className="text-[8px] text-green-600/40 font-medium">Verificado</p>
                                                </div>
                                            </div>

                                            <div className="relative flex flex-col items-center gap-3 z-10">
                                                <div className="w-8 h-8 rounded-lg border border-green-500/30 bg-green-500/10 flex items-center justify-center text-green-500">
                                                    <CheckCircle2 size={14} />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">Domínio ativado</p>
                                                    <p className="text-[8px] text-green-600/60 font-black">Ativado</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {resendId && !verified && (
                <div className="mt-8 space-y-4 animate-in fade-in duration-700">
                    <div className="relative py-10 px-6 rounded-2xl border border-border/40 bg-[#0A0A0A] overflow-hidden group">
                        <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                        
                        <div className="relative flex flex-col sm:flex-row items-center sm:justify-between max-w-2xl mx-auto gap-8 sm:gap-4">
                            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-border/20 -translate-x-1/2 sm:top-5 sm:bottom-auto sm:left-0 sm:w-full sm:h-[1px] sm:translate-x-0 sm:-translate-y-1/2"></div>
                            
                            <div className="relative flex flex-col items-center gap-4 z-10">
                                <div className="w-10 h-10 rounded-xl border border-border bg-background flex items-center justify-center text-foreground">
                                    <Globe size={18} />
                                </div>
                                <div className="text-center space-y-1.5">
                                    <p className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted/50 text-foreground">Domínio adicionado</p>
                                    <p className="text-[9px] text-muted-foreground/40 font-medium">Processo iniciado</p>
                                </div>
                            </div>

                            <div className="relative flex flex-col items-center gap-4 z-10">
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-700 ${status === 'verified' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-muted/5 border-border/10 text-muted-foreground/40'}`}>
                                    <RefreshCw size={18} className={status === 'pending' ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
                                </div>
                                <div className="text-center space-y-1.5">
                                    <p className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${status === 'verified' ? 'bg-blue-500/10 text-blue-500' : 'text-muted-foreground/40'}`}>DNS verificado</p>
                                    <p className="text-[9px] text-muted-foreground/40 font-medium">{status === 'verified' ? 'Verificado' : 'Aguardando'}</p>
                                </div>
                            </div>

                            <div className="relative flex flex-col items-center gap-4 z-10">
                                <div className="w-10 h-10 rounded-xl border border-border/10 bg-muted/5 flex items-center justify-center text-muted-foreground/40">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div className="text-center space-y-1.5">
                                    <p className="text-[10px] font-bold px-2.5 py-1 rounded-full text-muted-foreground/40">Domínio ativado</p>
                                    <p className="text-[9px] text-muted-foreground/40 font-medium">Pendente</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Modal 
                isOpen={showDeleteModal} 
                onClose={() => setShowDeleteModal(false)}
                title={
                    <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle size={20} />
                        <span>Excluir Domínio</span>
                    </div>
                }
                size="lg"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-sm font-bold text-white mb-2">Atenção!</p>
                        <p className="text-xs text-white/90 leading-relaxed">
                            Ao excluir o domínio <strong>{domain}</strong> do CRM, as chaves DNS abaixo continuarão no seu servidor. 
                            Recomendamos que você as remova manualmente no seu provedor de DNS para manter suas configurações limpas.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Registros para Remover:</p>
                        <div className="grid grid-cols-1 gap-2">
                            {dnsRecords.map((record, idx) => (
                                <div key={idx} className="p-3 border border-border rounded-xl bg-muted/20 flex items-center justify-between group">
                                    <div className="flex flex-col gap-1 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{record.type}</span>
                                            <span className="text-[10px] font-bold text-foreground truncate">{record.name}</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground truncate">{record.value}</span>
                                    </div>
                                    <button 
                                        onClick={() => copyToClipboard(`${record.name} ${record.value}`)}
                                        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border">
                        <button 
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg font-bold text-sm hover:bg-muted/80 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} /> Confirmar Exclusão</>}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
