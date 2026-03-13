'use client'

import { useState, useEffect } from 'react'
import { Globe, Loader2, CheckCircle2, AlertCircle, Copy, Info, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/app/_actions/profile'
import { updateTenantDomain, verifyTenantDomain } from '@/app/_actions/tenant'
import { checkPlanFeature } from '@/lib/utils/plan-guard' // Assumindo que exporta no cliente se necessário, mas usarei RSC se possível
import { toast } from 'sonner'

export function DomainTab() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [profile, setProfile] = useState<any>(null)
    const [tenant, setTenant] = useState<any>(null)
    const [domain, setDomain] = useState('')
    const [hasAccess, setHasAccess] = useState(false)

    useEffect(() => {
        async function loadData() {
            const { profile: userProfile } = await getProfile()
            setProfile(userProfile)

            if (userProfile?.tenant_id) {
                const supabase = createClient()
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('id', userProfile.tenant_id)
                    .single()

                setTenant(tenantData)
                if (tenantData?.custom_domain) {
                    setDomain(tenantData.custom_domain)
                }

                // Verificar acesso ao plano (PRO)
                // Como checkPlanFeature é server side, faremos uma verificação simples baseada no tenantData
                setHasAccess(tenantData?.plan_type === 'pro')
            }
            setLoading(false)
        }
        loadData()
    }, [])

    const handleSaveDomain = async () => {
        if (!profile?.tenant_id) return
        setSaving(true)

        const result = await updateTenantDomain(profile.tenant_id, domain || null)

        if (result.success) {
            toast.success('Configurações de domínio salvas!')
            setTenant({ ...tenant, custom_domain: domain, custom_domain_verified: false })
        } else {
            toast.error('Erro ao salvar: ' + result.error)
        }
        setSaving(false)
    }

    const handleVerifyDomain = async () => {
        if (!profile?.tenant_id) return
        setVerifying(true)

        const result = await verifyTenantDomain(profile.tenant_id)

        if (result.success) {
            toast.success('Domínio verificado com sucesso!')
            setTenant({ ...tenant, custom_domain_verified: true })
        } else {
            toast.error('Erro ao verificar: ' + result.error)
        }
        setVerifying(false)
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copiado!`)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!hasAccess) {
        return (
            <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                    <Globe size={32} />
                </div>
                <div className="max-w-md space-y-2">
                    <h3 className="text-xl font-bold text-foreground">Domínio Próprio (Whitelabel)</h3>
                    <p className="text-muted-foreground">
                        Remova o "crmlax.com" da sua URL e use seu próprio domínio. Disponível exclusivamente para assinantes do plano <strong className="text-secondary">PRO</strong>.
                    </p>
                </div>
                <button 
                    onClick={() => { /* Navegar para aba de assinatura ou checkout */ }}
                    className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
                >
                    Fazer Upgrade para PRO
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Configurações de Domínio</h3>
                        <p className="text-sm text-muted-foreground">Configure um domínio customizado para seu site vitrine e links.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="max-w-xl">
                        <label className="text-sm font-bold text-gray-800 ml-1 mb-2 block uppercase tracking-wider">
                            Seu Domínio
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Globe className="h-4 h-4 text-muted-foreground" />
                                </div>
                                <input
                                    type="text"
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value.toLowerCase())}
                                    placeholder="ex: imoveis.suaempresa.com.br"
                                    className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={handleSaveDomain}
                                disabled={saving || domain === tenant?.custom_domain}
                                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm whitespace-nowrap"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar'}
                            </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 italic">
                            Não use http:// ou https://. Apenas o domínio (ex: imoveis.meusite.com).
                        </p>
                    </div>

                    {tenant?.custom_domain && (
                        <div className="border border-border rounded-xl overflow-hidden bg-muted/10">
                            <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm text-foreground">Configuração de DNS</h4>
                                    {tenant.custom_domain_verified ? (
                                        <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                                            <CheckCircle2 size={12} />
                                            <span className="text-[10px] font-bold uppercase">Verificado</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                            <AlertCircle size={12} />
                                            <span className="text-[10px] font-bold uppercase">Pendência</span>
                                        </div>
                                    )}
                                </div>
                                {!tenant.custom_domain_verified && (
                                    <button
                                        onClick={handleVerifyDomain}
                                        disabled={verifying}
                                        className="text-xs font-bold text-secondary hover:underline disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {verifying && <Loader2 size={12} className="animate-spin" />}
                                        Verificar agora
                                    </button>
                                )}
                            </div>
                            
                            <div className="p-4 space-y-4">
                                <p className="text-xs text-muted-foreground">
                                    Para que seu domínio funcione, adicione os seguintes registros no seu provedor de DNS (GoDaddy, HostGator, Registro.br, etc):
                                </p>

                                <div className="space-y-3">
                                    {/* Registro A (para domínios raiz) ou CNAME */}
                                    <div className="bg-background border border-border rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</span>
                                            <span className="text-[10px] font-bold text-foreground">A</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Nome/Host</span>
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">@</code>
                                                <button onClick={() => copyToClipboard('@', 'Host')} className="text-muted-foreground hover:text-foreground">
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Valor</span>
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">76.76.21.21</code>
                                                <button onClick={() => copyToClipboard('76.76.21.21', 'IP')} className="text-muted-foreground hover:text-foreground">
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-background border border-border rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</span>
                                            <span className="text-[10px] font-bold text-foreground">CNAME</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Nome/Host</span>
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">www</code>
                                                <button onClick={() => copyToClipboard('www', 'Host')} className="text-muted-foreground hover:text-foreground">
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Valor</span>
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">cname.vercel-dns.com</code>
                                                <button onClick={() => copyToClipboard('cname.vercel-dns.com', 'Valor')} className="text-muted-foreground hover:text-foreground">
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-secondary/5 rounded-lg p-3">
                                    <Info size={16} className="text-secondary mt-0.5" />
                                    <p className="text-[11px] text-foreground leading-relaxed">
                                        As alterações de DNS podem levar de alguns minutos a até 24 horas para propagar. Recomendamos usar o <a href="https://dnschecker.org" target="_blank" className="text-secondary hover:underline inline-flex items-center gap-0.5">DNS Checker <ExternalLink size={10} /></a> para acompanhar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center gap-3">
                <Globe size={18} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground font-medium">
                    Após a verificação, seu site e todos os links de WhatsApp/E-mail usarão <strong className="text-foreground">{domain || 'seu domínio'}</strong>.
                </p>
            </div>
        </div>
    )
}
