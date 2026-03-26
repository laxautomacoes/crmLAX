'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getIntegration, saveIntegration, updateIntegrationStatus } from '@/app/_actions/integrations';
import { useEffect } from 'react';
import { Switch } from '@/components/ui/Switch';

interface IntegrationEndpointCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    iconColor: string;
    endpoint: string;
    docsUrl?: string;
    tenantId: string;
    slug?: string;
    customDomain?: string;
}

export function IntegrationEndpointCard({
    title,
    description,
    icon: Icon,
    iconColor,
    endpoint,
    docsUrl,
    tenantId,
    slug,
    customDomain
}: IntegrationEndpointCardProps) {
    const [copied, setCopied] = useState(false);
    const [accessToken, setAccessToken] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasToken, setHasToken] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    
    useEffect(() => {
        if (tenantId) {
            getIntegration(title.toLowerCase()).then(({ data }) => {
                if (data?.credentials?.access_token) {
                    setHasToken(true);
                    setAccessToken(data.credentials.access_token);
                }
                setIsActive(data?.status === 'active');
            });
        }
    }, [tenantId, title]);

    const handleToggleStatus = async (checked: boolean) => {
        setIsUpdatingStatus(true);
        const { error } = await updateIntegrationStatus(title.toLowerCase(), checked ? 'active' : 'inactive');
        
        if (error) {
            toast.error('Erro ao atualizar status: ' + error);
        } else {
            setIsActive(checked);
            toast.success(`Integração ${checked ? 'ativada' : 'desativada'} com sucesso!`);
        }
        setIsUpdatingStatus(false);
    };

    const handleSaveToken = async () => {
        setIsSaving(true);
        const { error } = await saveIntegration(title.toLowerCase(), { access_token: accessToken });
        setIsSaving(false);
        
        if (error) {
            toast.error('Erro ao salvar token: ' + error);
        } else {
            toast.success('Token salvo com sucesso!');
            setHasToken(true);
            setShowConfig(false);
        }
    };
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    // Construção inteligente da URL base
    let effectiveBaseUrl = baseUrl;
    if (customDomain) {
        effectiveBaseUrl = `https://${customDomain}`;
    } else if (slug && !baseUrl.includes('localhost')) {
        // Em produção, tenta manter o domínio principal mas trocar o subdomínio pelo slug do tenant
        const parts = baseUrl.replace('https://', '').replace('http://', '').split('.');
        const domain = parts.length > 2 ? parts.slice(1).join('.') : parts.join('.');
        effectiveBaseUrl = `https://${slug}.${domain}`;
    } else if (slug && baseUrl.includes('localhost')) {
        // Se for localhost, mantém localhost para testes mas o ideal seria mostrar o slug no futuro
        effectiveBaseUrl = baseUrl;
    }

    const fullUrl = `${effectiveBaseUrl}${endpoint}?tenant_id=${tenantId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        toast.success('URL copiada para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="group bg-card hover:bg-muted/30 rounded-2xl border border-border hover:border-secondary/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-secondary/5 hover:-translate-y-1">
            <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black text-foreground tracking-tight">{title}</h3>
                            <div className="flex items-center gap-2">
                                <Switch 
                                    checked={isActive} 
                                    onChange={handleToggleStatus}
                                    disabled={isUpdatingStatus}
                                    className="scale-90"
                                />
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>
                                    {isActive ? 'Ativo' : 'Desativado'}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-full">{description}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                Endpoint de Conexão
                            </label>
                        </div>
                        
                        <div className="relative group/url">
                            <div className="flex items-center gap-2 p-3.5 bg-muted/50 rounded-xl border border-border group-hover/url:border-secondary/30 transition-colors">
                                <code className="text-[13px] text-foreground/80 break-all flex-1 font-mono leading-none truncate">
                                    {fullUrl}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border hover:border-secondary hover:text-secondary rounded-lg transition-all active:scale-95 shadow-sm"
                                >
                                    {copied ? (
                                        <Check size={14} className="text-emerald-500" />
                                    ) : (
                                        <Copy size={14} />
                                    )}
                                    <span className="text-[11px] font-bold uppercase">Copiar</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {title.includes('Facebook') && (
                        <div className="space-y-3 pt-2">
                            <button 
                                onClick={() => setShowConfig(!showConfig)}
                                className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] hover:underline"
                            >
                                {hasToken ? '✓ Token de Acesso Configurado' : '+ Configurar Token de Acesso'}
                            </button>

                            {showConfig && (
                                <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <input 
                                        type="password"
                                        placeholder="Cole o Page Access Token aqui..."
                                        className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-secondary transition-colors"
                                        value={accessToken}
                                        onChange={(e) => setAccessToken(e.target.value)}
                                    />
                                    <button 
                                        disabled={isSaving}
                                        onClick={handleSaveToken}
                                        className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        {isSaving ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground/60 font-medium">
                        Webhook v1.0
                    </span>
                    {docsUrl && (
                        <a
                            href={docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/doc text-xs font-bold text-secondary flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        >
                            Documentação 
                            <ExternalLink size={12} className="transition-transform group-hover/doc:translate-x-0.5 group-hover/doc:-translate-y-0.5" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
