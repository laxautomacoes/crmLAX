'use client'

import { useState, useEffect } from 'react'
import {
    Globe,
    CheckCircle2,
    AlertCircle,
    Copy,
    Info,
    Loader2,
    Trash2,
    ShieldCheck,
    LayoutDashboard
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/app/_actions/profile'
import {
    updateTenantDomain,
    verifyTenantDomain,
    verifyTenantCRMSubdomain,
    getVercelDomainConfig
} from '@/app/_actions/tenant'
import { toast } from 'sonner'

export function DomainTab() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [verifyingCRM, setVerifyingCRM] = useState(false)
    const [profile, setProfile] = useState<any>(null)
    const [tenant, setTenant] = useState<any>(null)
    const [domain, setDomain] = useState('')
    const [vercelConfig, setVercelConfig] = useState<any>(null)

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

                if (tenantData) {
                    setTenant(tenantData)
                    if (tenantData.custom_domain) {
                        setDomain(tenantData.custom_domain)
                        // Buscar config real da Vercel
                        getVercelDomainConfig(tenantData.custom_domain).then(res => {
                            if (res.success) setVercelConfig(res.config)
                        })
                    }
                }
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
            setTenant({ ...tenant, custom_domain: domain, custom_domain_verified: false, custom_domain_crm_verified: false })

            // Buscar config da Vercel após salvar novo domínio
            if (domain) {
                getVercelDomainConfig(domain).then(res => {
                    if (res.success) setVercelConfig(res.config)
                })
            } else {
                setVercelConfig(null)
            }
        } else {
            toast.error('Erro ao salvar: ' + result.error)
        }
        setSaving(false)
    }

    const handleRemoveDomain = async () => {
        if (!profile?.tenant_id) return
        if (confirm('Deseja realmente remover o domínio customizado? Seu site voltará a usar o endereço padrão.')) {
            setSaving(true)
            const result = await updateTenantDomain(profile.tenant_id, null)
            if (result.success) {
                toast.success('Domínio removido com sucesso!')
                setDomain('')
                setTenant({ ...tenant, custom_domain: null, custom_domain_verified: false, custom_domain_crm_verified: false })
                setVercelConfig(null)
            } else {
                toast.error('Erro ao remover: ' + result.error)
            }
            setSaving(false)
        }
    }

    const handleVerifyDomain = async () => {
        if (!profile?.tenant_id) return
        setVerifying(true)

        const result = await verifyTenantDomain(profile.tenant_id)

        // Recarregar config da Vercel para mostrar o status mais recente/registros necessários
        if (tenant?.custom_domain) {
            getVercelDomainConfig(tenant.custom_domain).then(vRes => {
                if (vRes.success) setVercelConfig(vRes.config)
            })
        }

        if (result.success) {
            toast.success('Domínio verificado com sucesso!')
            setTenant({ ...tenant, custom_domain_verified: true })
        } else {
            toast.error('Erro ao verificar: ' + result.error)
        }
        setVerifying(false)
    }

    const handleVerifyCRM = async () => {
        if (!profile?.tenant_id) return
        setVerifyingCRM(true)

        const result = await verifyTenantCRMSubdomain(profile.tenant_id)

        if (result.success) {
            toast.success('Subdomínio CRM verificado com sucesso!')
            setTenant({ ...tenant, custom_domain_crm_verified: true })
        } else {
            toast.error('Erro ao verificar CRM: ' + result.error)
        }
        setVerifyingCRM(false)
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

    const isPro = tenant?.plan_type === 'pro'

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {!isPro ? (
                <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                        <Globe size={32} />
                    </div>
                    <div className="max-w-md space-y-2">
                        <h3 className="text-xl font-bold text-foreground">Domínio Próprio</h3>
                        <p className="text-muted-foreground">
                            Use seu próprio domínio (ex: properties.suaempresa.com.br). Disponível no plano <strong className="text-secondary">PRO</strong>.
                        </p>
                    </div>
                    <button className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity">
                        Fazer Upgrade para PRO
                    </button>
                </div>
            ) : !tenant?.custom_domain ? (
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="max-w-xl">
                        <h3 className="text-lg font-bold text-foreground mb-2">Seu Domínio</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-lg">
                            Configure um domínio próprio para que seus clientes acessem seu site diretamente pelo seu endereço personalizado.
                        </p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value.toLowerCase())}
                                    placeholder="ex: properties.suaempresa.com.br"
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    style={{ backgroundColor: 'var(--background)' }}
                                />
                            </div>
                            <button
                                onClick={domain !== tenant?.custom_domain ? handleSaveDomain : handleVerifyDomain}
                                disabled={saving || verifying || (tenant?.custom_domain_verified && domain === tenant?.custom_domain)}
                                className={`px-6 py-2 rounded-lg font-bold transition-all text-sm flex items-center justify-center min-w-[120px] h-10 gap-2 ${tenant?.custom_domain_verified && domain === tenant?.custom_domain
                                    ? 'bg-green-500 text-white cursor-default'
                                    : 'bg-secondary text-secondary-foreground hover:opacity-90'
                                    }`}
                            >
                                {saving || verifying ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Processando...</span>
                                    </>
                                ) : (
                                    <>
                                        {tenant?.custom_domain_verified && domain === tenant?.custom_domain && <CheckCircle2 size={18} />}
                                        {tenant?.custom_domain_verified && domain === tenant?.custom_domain ? 'Verificado' : 'Verificar'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                        <div className="lg:min-h-[80px]">
                            <h3 className="text-lg font-bold text-foreground mb-2">Seu Domínio</h3>
                            <p className="text-sm text-muted-foreground max-w-lg">
                                Configure um domínio próprio para que seus clientes acessem seu site diretamente pelo seu endereço personalizado.
                            </p>
                        </div>

                        <div className="max-w-xl">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value.toLowerCase())}
                                        placeholder="ex: properties.suaempresa.com.br"
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                        style={{ backgroundColor: 'var(--background)' }}
                                    />
                                </div>
                                <button
                                    onClick={domain !== tenant?.custom_domain ? handleSaveDomain : handleVerifyDomain}
                                    disabled={saving || verifying || (tenant?.custom_domain_verified && domain === tenant?.custom_domain)}
                                    className={`px-6 py-2 rounded-lg font-bold transition-all text-sm flex items-center justify-center min-w-[120px] h-10 gap-2 ${tenant?.custom_domain_verified && domain === tenant?.custom_domain
                                        ? 'bg-green-500 text-white cursor-default'
                                        : 'bg-secondary text-secondary-foreground hover:opacity-90'
                                        }`}
                                >
                                    {saving || verifying ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Processando...</span>
                                        </>
                                    ) : (
                                        <>
                                            {tenant?.custom_domain_verified && domain === tenant?.custom_domain && <CheckCircle2 size={18} />}
                                            {tenant?.custom_domain_verified && domain === tenant?.custom_domain ? 'Verificado' : 'Verificar'}
                                        </>
                                    )}
                                </button>
                                {tenant?.custom_domain && (
                                    <button
                                        onClick={handleRemoveDomain}
                                        disabled={saving || verifying}
                                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                        title="Remover Domínio"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                            <p className="text-[9px] text-muted-foreground/80 italic mt-1.5 ml-1">
                                A propagação do DNS pode levar até 24h.
                            </p>
                        </div>
                        
                        <hr className="border-border/30" />

                        <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">Configuração DNS</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-lg">Configure os seguintes registros no seu provedor de domínio para apontar para o nosso servidor.</p>
                                </div>

                                {(() => {
                                    const domain = tenant.custom_domain || '';
                                    const parts = domain.split('.').filter(Boolean);
                                    const compoundTlds = ['com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'ind.br', 'art.br', 'etc.br', 'mil.br', 'esp.br'];
                                    const lastTwoParts = parts.slice(-2).join('.');
                                    const isRoot = domain && !domain.startsWith('www.') && (compoundTlds.includes(lastTwoParts) ? parts.length === 3 : parts.length === 2);

                                    let records = [];

                                    if (vercelConfig?.verification && vercelConfig.verification.length > 0) {
                                        records = vercelConfig.verification.map((v: any) => ({
                                            type: v.type,
                                            host: v.domain.split('.')[0] === domain.split('.')[0] ? '@' : v.domain.split('.')[0],
                                            value: v.value,
                                            label: v.reason === 'pending' ? 'Verificação Pendente' : 'Registro Necessário'
                                        }));
                                    } else {
                                        records = isRoot
                                            ? [
                                                { type: 'A', host: '@', value: '76.76.21.21', label: 'IP Padrão' },
                                                { type: 'CNAME', host: 'www', value: 'cname.vercel-dns.com', label: 'Subdomínio WWW' }
                                            ]
                                            : [
                                                { type: 'CNAME', host: domain.split('.')[0], value: 'cname.vercel-dns.com', label: 'Registro Principal' }
                                            ];
                                    }

                                    return (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                                                {records.map((record: any, idx: number) => (
                                                    <div key={idx} className="p-3 border border-border rounded-xl bg-background/50 group relative hover:border-secondary/30 transition-colors">
                                                        <div className="flex items-center justify-between mb-3 border-b border-border/10 pb-1.5">
                                                            <span className="text-[8px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded tracking-tighter">
                                                                {record.label}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-6 group/row">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-8">Tipo</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none">{record.type}</code>
                                                                    <button onClick={() => copyToClipboard(record.type, 'Tipo')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-6 group/row">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-8">Host</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none">{record.host}</code>
                                                                    <button onClick={() => copyToClipboard(record.host, 'Host')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-6 group/row">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-8">Valor</span>
                                                                <div className="flex items-center gap-1.5 overflow-hidden max-w-[80%]">
                                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground truncate leading-none">{record.value}</code>
                                                                    <button onClick={() => copyToClipboard(record.value, 'Valor')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded shrink-0">
                                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-6 group/row">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-8">TTL</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none">3600</code>
                                                                    <button onClick={() => copyToClipboard('3600', 'TTL')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden group">
                        <div className="relative z-10 space-y-6">
                            <div className="lg:min-h-[80px]">
                                <h3 className="text-lg font-bold text-foreground mb-2">CRM White label</h3>
                                <p className="text-sm text-muted-foreground max-w-lg">
                                    Sua equipe também pode acessar o painel administrativo através do seu próprio domínio.
                                </p>
                            </div>

                            <div className="max-w-xl">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`crm.${tenant.custom_domain}`}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm outline-none transition-all pr-10"
                                            style={{ backgroundColor: 'var(--background)' }}
                                        />
                                        <button
                                            onClick={() => copyToClipboard(`crm.${tenant.custom_domain}`, 'URL do CRM')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                    
                                    <button
                                        onClick={handleVerifyCRM}
                                        disabled={verifyingCRM || tenant?.custom_domain_crm_verified}
                                        className={`px-6 py-2 rounded-lg font-bold transition-all text-sm flex items-center justify-center min-w-[120px] h-10 gap-2 ${tenant?.custom_domain_crm_verified
                                            ? 'bg-green-500 text-white cursor-default'
                                            : 'bg-secondary text-secondary-foreground hover:opacity-90'
                                            }`}
                                    >
                                        {verifyingCRM ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                <span>Processando...</span>
                                            </>
                                        ) : (
                                            <>
                                                {tenant?.custom_domain_crm_verified && <CheckCircle2 size={18} />}
                                                {tenant?.custom_domain_crm_verified ? 'Verificado' : 'Verificar'}
                                            </>
                                        )}
                                    </button>
                                    {tenant?.custom_domain && (
                                        <div className="w-9 h-10 shrink-0" aria-hidden="true" />
                                    )}
                                </div>
                                <p className="text-[9px] text-muted-foreground/80 italic mt-1.5 ml-1">
                                    A propagação do DNS pode levar até 24h.
                                </p>
                            </div>

                            <hr className="border-border/30" />

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">Configuração DNS</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-lg">Adicione o registro abaixo no seu provedor de domínio para apontar o endereço de acesso do CRM.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3 border border-border rounded-xl bg-background/50 group relative hover:border-secondary/30 transition-colors">
                                        <div className="flex items-center justify-between mb-3 border-b border-border/10 pb-1.5">
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded tracking-tighter">
                                                Subdomínio CRM
                                            </span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-6 group/row">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-8">Tipo</span>
                                                <div className="flex items-center gap-1.5">
                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none">CNAME</code>
                                                    <button onClick={() => copyToClipboard('CNAME', 'Tipo')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 group/row">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-8">Host</span>
                                                <div className="flex items-center gap-1.5">
                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none">crm</code>
                                                    <button onClick={() => copyToClipboard('crm', 'Host')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 group/row">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-8">Valor</span>
                                                <div className="flex items-center gap-1.5 overflow-hidden max-w-[80%]">
                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground truncate leading-none">cname.vercel-dns.com</code>
                                                    <button onClick={() => copyToClipboard('cname.vercel-dns.com', 'Valor')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded shrink-0">
                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 group/row">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-8">TTL</span>
                                                <div className="flex items-center gap-1.5">
                                                    <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px] font-bold text-foreground leading-none">3600</code>
                                                    <button onClick={() => copyToClipboard('3600', 'TTL')} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                                                        <Copy size={10} className="text-muted-foreground/60" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
