'use client'

import { useState, useEffect } from 'react'
import { getEmailDomains, addEmailDomain, verifyEmailDomain, deleteEmailDomain } from '@/app/_actions/email-domains'
import { Loader2, Globe, CheckCircle2, AlertCircle, Plus, Trash2, RefreshCw, Copy } from 'lucide-react'
import { toast } from 'sonner'

export function EmailDomainsTab({ tenantId }: { tenantId: string }) {
    const [domains, setDomains] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newDomain, setNewDomain] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    useEffect(() => {
        loadDomains()
    }, [])

    const loadDomains = async () => {
        setLoading(true)
        const res = await getEmailDomains(tenantId)
        if (res.success && res.data) {
            setDomains(res.data)
        }
        setLoading(false)
    }

    const handleAdd = async () => {
        if (!newDomain.includes('.')) {
            toast.error('Insira um domínio válido (ex: minaimobiliaria.com.br)')
            return
        }
        setIsAdding(true)
        const res = await addEmailDomain(tenantId, newDomain.toLowerCase().trim())
        if (res.success) {
            toast.success('Domínio adicionado! Agora configure o DNS.')
            setNewDomain('')
            await loadDomains()
        } else {
            toast.error(res.error)
        }
        setIsAdding(false)
    }

    const handleVerify = async (domainId: string, resendDomainId: string) => {
        toast.info('Verificando status do DNS...')
        const res = await verifyEmailDomain(domainId, resendDomainId)
        if (res.success) {
            toast.success('Status atualizado.')
            await loadDomains()
        } else {
            toast.error(res.error)
        }
    }

    const handleDelete = async (domainId: string, resendDomainId: string) => {
        if (!confirm('Deseja realmente remover este domínio de envio?')) return
        const res = await deleteEmailDomain(domainId, resendDomainId)
        if (res.success) {
            toast.success('Domínio removido.')
            setDomains(prev => prev.filter(d => d.id !== domainId))
        } else {
            toast.error(res.error)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Copiado!')
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                    <div className="p-2.5 bg-foreground/5 rounded-xl">
                        <Globe className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-foreground">Domínios de Envio de E-mail</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Configure os domínios da sua imobiliária para envio das campanhas.</p>
                    </div>
                </div>

                {/* Add domain form */}
                <div className="flex items-end gap-3 pt-2">
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Novo Domínio (sem www)</label>
                        <input 
                            type="text" 
                            value={newDomain} 
                            onChange={e => setNewDomain(e.target.value)} 
                            placeholder="exemplo.com.br"
                            className="w-full h-10 px-3 bg-foreground/5 border border-border/40 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                        />
                    </div>
                    <button 
                        onClick={handleAdd}
                        disabled={isAdding || !newDomain}
                        className="h-10 px-6 bg-secondary text-secondary-foreground font-bold rounded-lg flex items-center gap-2 hover:bg-secondary/90 transition-all disabled:opacity-50"
                    >
                        {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Adicionar
                    </button>
                </div>
            </div>

            {/* List domains */}
            <div className="space-y-4">
                {domains.map(domain => (
                    <div key={domain.id} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                        <div className="p-4 bg-foreground/[0.02] border-b border-border/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {domain.status === 'verified' ? (
                                    <CheckCircle2 className="text-green-500 h-5 w-5" />
                                ) : (
                                    <AlertCircle className="text-amber-500 h-5 w-5" />
                                )}
                                <h3 className="font-bold text-foreground">{domain.domain}</h3>
                                <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${
                                    domain.status === 'verified' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                }`}>
                                    {domain.status === 'verified' ? 'Verificado' : 'Pendente DNS'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleVerify(domain.id, domain.resend_domain_id)}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                                >
                                    <RefreshCw size={14} /> Verificar
                                </button>
                                <button 
                                    onClick={() => handleDelete(domain.id, domain.resend_domain_id)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Mostrar registros DNS caso não esteja verificado */}
                        {domain.status === 'pending' && domain.dns_records && domain.dns_records.length > 0 && (
                            <div className="p-4 space-y-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-xs">
                                    <strong>Atenção:</strong> Adicione estes registros no painel DNS do seu domínio (Registro.br, HostGator, Cloudflare, etc.). A verificação pode levar algumas horas para propagar.
                                </div>
                                <div className="overflow-x-auto border border-border/40 rounded-lg">
                                    <table className="w-full text-left text-xs text-muted-foreground">
                                        <thead className="bg-foreground/5 text-foreground font-bold uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="p-3">Tipo</th>
                                                <th className="p-3">Nome / Host</th>
                                                <th className="p-3">Valor / Destino</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {domain.dns_records.map((record: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-foreground/[0.02]">
                                                    <td className="p-3 font-bold">{record.type}</td>
                                                    <td className="p-3">
                                                        <div className="flex items-center justify-between gap-2 group">
                                                            <span className="truncate">{record.name}</span>
                                                            <button onClick={() => copyToClipboard(record.name)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-foreground"><Copy size={12}/></button>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center justify-between gap-2 group">
                                                            <span className="truncate max-w-[200px] inline-block" title={record.value}>{record.value}</span>
                                                            <button onClick={() => copyToClipboard(record.value)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-foreground"><Copy size={12}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {domains.length === 0 && (
                    <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border/50 text-muted-foreground text-sm">
                        Nenhum domínio configurado. Use <strong className="text-foreground">notificacoes@laxperience.online</strong> ou adicione o seu.
                    </div>
                )}
            </div>
        </div>
    )
}
