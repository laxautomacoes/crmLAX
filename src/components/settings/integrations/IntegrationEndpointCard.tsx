import { ComponentType } from 'react';
import { useState, useEffect } from 'react';
import { 
    Copy, 
    Check, 
    ExternalLink, 
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
import { Modal } from '@/components/shared/Modal';

interface IntegrationEndpointCardProps {
    title: string;
    description: string;
    icon: ComponentType<{ size?: number; className?: string }>;
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isTokenFocused, setIsTokenFocused] = useState(false);
    
    useEffect(() => {
        if (tenantId) {
            setIsLoading(true);
            const providerName = title.toLowerCase();
            console.log(`IntegrationCard: Iniciando busca para ${providerName}...`);
            
            getIntegration(providerName).then(({ data, error }) => {
                if (error) {
                    console.error(`IntegrationCard: Erro ao buscar ${providerName}:`, error);
                }
                
                if (data?.credentials?.access_token) {
                    console.log(`IntegrationCard: Token encontrado para ${providerName}`);
                    setHasToken(true);
                    setAccessToken(data.credentials.access_token);
                } else {
                    console.log(`IntegrationCard: Nenhum token para ${providerName}`);
                    setHasToken(false);
                    setAccessToken('');
                }
                
                const active = data?.status === 'active';
                console.log(`IntegrationCard: ${providerName} status: ${active ? 'ATIVO' : 'INATIVO'}`);
                setIsActive(active);
                setIsLoading(false);
            }).catch(err => {
                console.error(`IntegrationCard: Falha fatal ao buscar ${providerName}:`, err);
                setIsLoading(false);
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
        let credentials: any = { access_token: accessToken };
        const providerName = title.toLowerCase();

        // Se for Facebook, tenta buscar o ID da Página para facilitar o webhook
        if (providerName.includes('facebook')) {
            try {
                // 1. Tenta pegar o ID direto (funciona se for Token de Página)
                const meResponse = await fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${accessToken}`);
                const meData = await meResponse.json();
                
                if (meData.id && !meData.error) {
                    // Verificamos se é uma página ou usuário (simplificado)
                    // Se o token for de página, o ID retornado aqui é o da página.
                    credentials.page_id = meData.id;
                    credentials.page_name = meData.name;
                    console.log(`IntegrationCard: Detectado ID direto (Página?): ${meData.name} (${meData.id})`);
                }

                // 2. Tenta listar as páginas (necessário se for Token de Usuário)
                const accountsResponse = await fetch(`https://graph.facebook.com/me/accounts?access_token=${accessToken}`);
                const accountsData = await accountsResponse.json();
                
                if (accountsData.data && Array.isArray(accountsData.data)) {
                    // Se houver páginas, pegamos a que o usuário provavelmente quer 
                    // (ou a primeira da lista se o token for restrito a ela)
                    const page = accountsData.data[0]; 
                    if (page) {
                        credentials.page_id = page.id;
                        credentials.page_name = page.name;
                        console.log(`IntegrationCard: Detectado via accounts: ${page.name} (${page.id})`);
                    }
                }

                if (!credentials.page_id) {
                    toast.error('Não foi possível identificar o ID da página. Verifique o token.');
                    setIsSaving(false);
                    return;
                }
            } catch (err) {
                console.error('IntegrationCard: Erro na chamada à Meta:', err);
            }
        }

        const { error } = await saveIntegration(providerName, credentials);
        setIsSaving(true);
        setIsSaving(false);
        
        if (error) {
            toast.error('Erro ao salvar token: ' + error);
        } else {
            toast.success(credentials.page_id 
                ? `Token de '${credentials.page_name}' salvo com sucesso!` 
                : 'Token salvo com sucesso!');
            setHasToken(true);
            setIsActive(true);
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

    const maskToken = (token: string) => {
        if (!token || token.length <= 8) return token;
        return `${token.substring(0, 4)}${'.'.repeat(120)}${token.substring(token.length - 4)}`;
    };

    const getDisplayToken = () => {
        if (!isTokenFocused && hasToken && accessToken) {
            return maskToken(accessToken);
        }
        return accessToken;
    };

    if (isLoading) {
        return (
            <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-4 animate-pulse">
                <div className="p-2.5 rounded-xl bg-muted/50 h-10 w-10" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted/50 rounded w-1/4" />
                    <div className="h-3 bg-muted/50 rounded w-1/2" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div 
                className="group bg-card hover:bg-muted/5 rounded-xl border border-border overflow-hidden transition-all duration-300 cursor-pointer select-none"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="p-5 bg-muted/30 flex flex-col gap-3">
                    <div className="flex items-start justify-between mb-1">
                        <div className={`p-2.5 rounded-xl ${iconColor} w-fit`}>
                            <Icon size={22} />
                        </div>
                        <span className={`flex h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">{title}</h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="lg"
                title={
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${iconColor}`}>
                            <Icon size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground">Configurar {title}</h3>
                            <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6 py-2">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                        <div>
                            <span className="text-xs font-bold text-foreground">Status da Integração</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Ative ou desative esta integração.</p>
                        </div>
                        <Switch 
                            checked={isActive} 
                            onChange={handleToggleStatus}
                            disabled={isUpdatingStatus}
                        />
                    </div>

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
                        
                        <div className="relative group/url w-full">
                            <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-xl border border-border group-hover/url:border-secondary/30 transition-colors">
                                <code className="text-[11px] text-foreground/80 break-all font-mono leading-relaxed max-w-full">
                                    {fullUrl}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-background border border-border hover:border-secondary hover:text-secondary rounded-lg transition-all active:scale-95 shadow-sm shrink-0 font-bold text-xs"
                                >
                                    {copied ? (
                                        <Check size={14} className="text-emerald-500" />
                                    ) : (
                                        <Copy size={14} />
                                    )}
                                    <span className="text-[11px] font-bold uppercase">Copiar Endpoint</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {title.includes('Facebook') && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                    Token de Acesso
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
                                    type="text"
                                    placeholder="Cole o Page Access Token aqui..."
                                    className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-secondary transition-colors"
                                    value={getDisplayToken()}
                                    onFocus={() => setIsTokenFocused(true)}
                                    onBlur={() => setIsTokenFocused(false)}
                                    onChange={(e) => {
                                        if (isTokenFocused || !hasToken) {
                                            setAccessToken(e.target.value);
                                        }
                                    }}
                                />
                                <button 
                                    disabled={isSaving}
                                    onClick={handleSaveToken}
                                    className="bg-[#FFE600] text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#F2DB00] transition-all active:scale-95 shrink-0"
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
                    </div>
                </div>
            </Modal>
        </>
    );
}
