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
            setTenant({ ...tenant, custom_domain: domain, custom_domain_verified: false })
            
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
                setTenant({ ...tenant, custom_domain: null, custom_domain_verified: false })
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
                <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center space-y-6">
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
            ) : (
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-foreground">Domínio Customizado</h3>
                        <p className="text-sm text-muted-foreground">Configure um domínio oficial para seu site vitrine.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="max-w-xl">
                            <label className="text-sm font-bold text-gray-800 ml-1 mb-2 block uppercase tracking-wider">Seu Domínio</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <input
                                        type="text"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value.toLowerCase())}
                                        placeholder="ex: properties.suaempresa.com.br"
                                        className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
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
                        </div>

                        {tenant?.custom_domain && (
                            <div className="space-y-6">
                                <div className="border border-border rounded-xl overflow-hidden bg-muted/10">
                                    <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-sm text-foreground">Configuração de DNS</h4>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {(() => {
                                            const domain = tenant.custom_domain || '';
                                            const isRoot = domain && !domain.startsWith('www.') && domain.split('.').length === 2;

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
                                                    <div className="flex items-start gap-2 bg-secondary/10 border border-secondary/20 rounded-lg p-3">
                                                        <Info size={14} className="text-secondary mt-0.5 shrink-0" />
                                                        <p className="text-[10px] text-foreground/80 leading-tight">
                                                            A propagação do DNS pode levar até 24h.
                                                        </p>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* CRM WHITE-LABEL SECTION */}
                                <div className="bg-gradient-to-br from-[#404F4F]/5 to-transparent border border-[#404F4F]/10 rounded-2xl p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <LayoutDashboard size={80} className="text-[#404F4F]" />
                                    </div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-[#404F4F]/10 rounded-lg text-[#404F4F]">
                                                <ShieldCheck size={20} />
                                            </div>
                                            <div className="flex-1 flex items-center justify-between">
                                                <h3 className="text-lg font-bold text-[#404F4F]">CRM White-label</h3>
                                                {tenant?.custom_domain_crm_verified ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold border border-green-200">
                                                        <CheckCircle2 size={12} />
                                                        VERIFICADO
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={handleVerifyCRM}
                                                        disabled={verifyingCRM}
                                                        className="px-4 py-1.5 bg-[#404F4F] text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        {verifyingCRM ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                                        Verificar Subdomínio
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <p className="text-sm text-muted-foreground mb-6 max-w-lg">
                                            Sua equipe também pode acessar o painel administrativo através do seu próprio domínio. 
                                            Isso melhora a autoridade da sua marca e profissionaliza o acesso.
                                        </p>

                                        <div className="space-y-4">
                                            <div className="p-4 border border-[#404F4F]/10 bg-white/50 rounded-xl">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Endereço de Acesso</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <code className="text-sm font-bold text-[#404F4F]">crm.{tenant.custom_domain}</code>
                                                    <button 
                                                        onClick={() => copyToClipboard(`crm.${tenant.custom_domain}`, 'URL do CRM')}
                                                        className="text-[#404F4F] hover:text-[#404F4F]/70 transition-colors"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-4 border border-amber-100 bg-amber-50/30 rounded-xl">
                                                <div className="flex items-center gap-2 mb-2 text-amber-700">
                                                    <AlertCircle size={14} />
                                                    <span className="text-[10px] font-bold uppercase">Configuração Necessária</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-[10px]">
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">TIPO</p>
                                                        <p className="font-bold text-amber-900">CNAME</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">HOST</p>
                                                        <p className="font-bold text-amber-900">crm</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">VALOR</p>
                                                        <p className="font-bold text-amber-900">cname.vercel-dns.com</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center gap-3">
                <Globe size={18} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground font-medium">
                    Após a verificação, seu site e todos os links de WhatsApp/E-mail usarão <strong className="text-foreground">{domain || 'seu domínio'}</strong>.
                </p>
            </div>
        </div>
    )
}
