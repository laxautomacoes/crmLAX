'use client';

import { useState, useEffect } from 'react';
import { 
    Copy, 
    Check, 
    ExternalLink, 
    LucideIcon, 
    ChevronDown, 
    Key, 
    BookOpen 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    getIntegration, 
    saveIntegration, 
    updateIntegrationStatus 
} from '@/app/_actions/integrations';
import { Switch } from '@/components/ui/Switch';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [isActive, setIsActive] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
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
        }
    };
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    let effectiveBaseUrl = baseUrl;
    if (customDomain) {
        effectiveBaseUrl = `https://${customDomain}`;
    } else if (slug && !baseUrl.includes('localhost')) {
        const parts = baseUrl.replace('https://', '').replace('http://', '').split('.');
        const domain = parts.length > 2 ? parts.slice(1).join('.') : parts.join('.');
        effectiveBaseUrl = `https://${slug}.${domain}`;
    } else if (slug && baseUrl.includes('localhost')) {
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
        <div className="group bg-card hover:bg-muted/5 rounded-2xl border border-border overflow-hidden transition-all duration-300">
            <div 
                className="px-6 py-4 border-b border-border bg-muted/30 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className={`p-2.5 rounded-xl ${iconColor}`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-foreground">{title}</h3>
                                <span className={`flex h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            </div>
                            <p className="text-xs text-muted-foreground max-w-xl line-clamp-1">{description}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleToggleStatus(!isActive)}>
                            <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${isActive ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>
                                {isActive ? 'Ativo' : 'Desativado'}
                            </span>
                            <Switch 
                                checked={isActive} 
                                onChange={handleToggleStatus}
                                disabled={isUpdatingStatus}
                                className="scale-75"
                            />
                        </div>

                        <div className="h-6 w-px bg-border hidden sm:block" />

                        <button 
                            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ChevronDown size={20} />
                            </motion.div>
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 border-t border-border/50">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                            Endpoint de Conexão
                                        </label>
                                        {docsUrl && (
                                            <a 
                                                href={docsUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] hover:underline flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <BookOpen size={10} />
                                                Documentação
                                            </a>
                                        )}
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
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                                Token de Acesso (Facebook)
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {hasToken && (
                                                    <div className="flex items-center gap-1.5 text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
                                                        <div className="h-1 w-1 bg-emerald-500 rounded-full animate-pulse" />
                                                        Configurado
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
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
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                    <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wider uppercase">
                                        Webhook v1.0
                                    </span>
                                    {isActive && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                                            <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                            Sincronizando
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
