'use client'

import { useState, useEffect } from 'react'
import { Globe, CheckCircle2, XCircle, Clock, Loader2, Copy, ExternalLink, RefreshCw, AlertTriangle, Trash2, ChevronDown } from 'lucide-react'
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
            const data = result.data as any;
            setDomain(cleanDomain) 
            setResendId(data.id)
            setStatus(data.status)
            
            // Combinar dkim e records
            let allRecords: any[] = []
            if (data.dkim && Array.isArray(data.dkim)) allRecords = [...data.dkim]
            
            if (data.spf) {
                const spf = Array.isArray(data.spf) ? data.spf : [data.spf]
                allRecords = [...allRecords, ...spf]
            }

            if (data.dmarc) {
                const dmarc = Array.isArray(data.dmarc) ? data.dmarc : [data.dmarc]
                allRecords = [...allRecords, ...dmarc]
            }

            if (data.records && Array.isArray(data.records)) {
                const existingValues = new Set(allRecords.map(r => r.value))
                const extra = data.records.filter((r: any) => !existingValues.has(r.value))
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
            const data = result.data as any;
            setStatus(data.status)
            setVerified(data.status === 'verified')

            // Combinar todos os registros possíveis que o Resend pode retornar
            let allRecords: any[] = []
            
            // DKIM Records
            if (data.dkim && Array.isArray(data.dkim)) {
                allRecords = [...allRecords, ...data.dkim]
            }
            
            // SPF Record (pode vir como objeto único ou array)
            if (data.spf) {
                const spf = Array.isArray(data.spf) ? data.spf : [data.spf]
                allRecords = [...allRecords, ...spf]
            }

            // DMARC Record
            if (data.dmarc) {
                const dmarc = Array.isArray(data.dmarc) ? data.dmarc : [data.dmarc]
                allRecords = [...allRecords, ...dmarc]
            }

            // Records array (Fallback para onde podem vir os registros DKIM/SPF)
            if (data.records && Array.isArray(data.records)) {
                const existingValues = new Set(allRecords.map(r => r.value))
                const extra = data.records.filter((r: any) => !existingValues.has(r.value))
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
                if (data.status === 'verified') {
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
        <div className="flex flex-col space-y-3 w-full">
            <div className="px-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-foreground">
                        Domínio de Envio
                    </h3>
                </div>
            </div>

            <div className="space-y-8">
                <p className="text-sm text-muted-foreground px-1 -mt-2">Configure seu domínio para enviar e-mails profissionais e evitar SPAM.</p>
                    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                        <div className="space-y-6">


                            {!resendId ? (
                                <div className="max-w-xl">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={domain}
                                                onChange={(e) => setDomain(e.target.value)}
                                                placeholder="ex: suaempresa.com.br"
                                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                                style={{ backgroundColor: 'var(--background)' }}
                                            />
                                        </div>
                                        <button
                                            onClick={handleSetup}
                                            disabled={loading || !domain.trim()}
                                            className="px-6 py-2 rounded-lg font-bold transition-all text-sm flex items-center justify-center min-w-[120px] h-10 gap-2 bg-secondary text-secondary-foreground hover:opacity-90 disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    <span>Processando...</span>
                                                </>
                                            ) : (
                                                'Configurar'
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground/80 italic mt-1.5 ml-1">
                                        A propagação do DNS pode levar até 24h.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="max-w-xl">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={domain}
                                                    readOnly
                                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm outline-none transition-all"
                                                    style={{ backgroundColor: 'var(--background)' }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleCheckStatus()}
                                                disabled={loading || verified}
                                                className={`px-6 py-2 rounded-lg font-bold transition-all text-sm flex items-center justify-center min-w-[120px] h-10 gap-2 ${verified
                                                    ? 'bg-green-500 text-white cursor-default'
                                                    : 'bg-secondary text-secondary-foreground hover:opacity-90'
                                                    }`}
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 size={18} className="animate-spin" />
                                                        <span>Processando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        {verified && <CheckCircle2 size={18} />}
                                                        {verified ? 'Verificado' : 'Verificar'}
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteModal(true)}
                                                disabled={loading}
                                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                                title="Excluir Domínio"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground/80 italic mt-1.5 ml-1">
                                            A propagação do DNS pode levar até 24h.
                                        </p>
                                    </div>

                                    <hr className="border-border/30" />

                                    {dnsRecords.length > 0 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground mb-2">Configuração DNS</h3>
                                                <p className="text-sm text-muted-foreground mb-6 max-w-lg">
                                                    {verified 
                                                        ? "Abaixo estão os registros DNS configurados no seu provedor de domínio para apontar para o nosso servidor."
                                                        : "Configure os seguintes registros no seu provedor de domínio para apontar para o nosso servidor."}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                                                {dnsRecords.map((record, idx) => (
                                                    <div key={idx} className="p-3 border border-border rounded-lg bg-background/50 group relative hover:border-secondary/30 transition-colors flex flex-col">
                                                        <div className="flex items-center justify-between mb-3 border-b border-border/10 pb-1.5">
                                                            <span className="text-[8px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded tracking-tighter">
                                                                Registro {record.record || 'DNS'}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-1.5 flex-1">
                                                            <div className="flex items-start gap-4 group/row">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-20 mt-1">Tipo</span>
                                                                <div className="flex items-start gap-1.5">
                                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-relaxed break-all">{record.type}</code>
                                                                    <button onClick={() => copyToClipboard(record.type)} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded mt-0.5">
                                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-start gap-4 group/row">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-20 mt-1">Host</span>
                                                                <div className="flex items-start gap-1.5 flex-1">
                                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-relaxed break-all">{record.name}</code>
                                                                    <button onClick={() => copyToClipboard(record.name)} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded mt-0.5">
                                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-start gap-4 group/row">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-20 mt-1">Valor</span>
                                                                <div className="flex items-start gap-1.5 flex-1">
                                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-relaxed break-all">{record.value}</code>
                                                                    <button onClick={() => copyToClipboard(record.value)} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded shrink-0 mt-0.5">
                                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {record.priority !== undefined && record.priority !== null && (
                                                                <div className="flex items-start gap-4 group/row">
                                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-20 mt-1">Prioridade</span>
                                                                    <div className="flex items-start gap-1.5">
                                                                        <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-relaxed break-all">{record.priority}</code>
                                                                        <button onClick={() => copyToClipboard(record.priority.toString())} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded mt-0.5">
                                                                            <Copy size={10} className="text-muted-foreground/60" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex items-start gap-4 group/row">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-20 mt-1">TTL</span>
                                                                <div className="flex items-start gap-1.5">
                                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-relaxed break-all">Auto</code>
                                                                    <button onClick={() => copyToClipboard('Auto')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded mt-0.5">
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

                                </div>
                            )}
                        </div>
                    </div>
                </div>


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
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">Atenção!</p>
                        <p className="text-xs text-red-600/90 dark:text-red-400/90 leading-relaxed">
                            Ao excluir o domínio <strong>{domain}</strong> do CRM, as chaves DNS abaixo continuarão no seu servidor. 
                            Recomendamos que você as remova manualmente no seu provedor de DNS para manter suas configurações limpas.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Registros para Remover:</p>
                        <div className="grid grid-cols-1 gap-2">
                            {dnsRecords.map((record, idx) => (
                                <div key={idx} className="p-3 border border-border rounded-lg bg-muted/20 flex items-center justify-between group">
                                    <div className="flex flex-col gap-1 overflow-hidden">
                                        <div className="flex items-start gap-2">
                                            <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">{record.type}</span>
                                            <span className="text-[10px] font-bold text-foreground break-all leading-relaxed">{record.name}</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground break-all leading-relaxed">{record.value}</span>
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
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Exclusão'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
