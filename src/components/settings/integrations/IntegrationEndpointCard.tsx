'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

interface IntegrationEndpointCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    iconColor: string;
    endpoint: string;
    docsUrl?: string;
    tenantId: string;
}

export function IntegrationEndpointCard({
    title,
    description,
    icon: Icon,
    iconColor,
    endpoint,
    docsUrl,
    tenantId
}: IntegrationEndpointCardProps) {
    const [copied, setCopied] = useState(false);
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${baseUrl}${endpoint}?tenant_id=${tenantId}`;

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
                    <div className="flex items-center gap-4">
                        <div className={`p-3.5 rounded-2xl ${iconColor} shadow-sm transition-transform duration-500 group-hover:rotate-12`}>
                            <Icon size={26} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-black text-foreground tracking-tight">{title}</h3>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Ativo</span>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px]">{description}</p>
                        </div>
                    </div>
                </div>

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
