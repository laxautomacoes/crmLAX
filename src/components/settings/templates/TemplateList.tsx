'use client';

import { useState } from 'react';
import { FileText, Trash2, Loader2, ChevronDown } from 'lucide-react';

interface ProposalTemplate {
    id: string;
    name: string;
    file_path: string;
    created_at: string;
    template_type?: string;
    mapped_fields?: any[];
}

interface TemplateListProps {
    templates: ProposalTemplate[];
    loading: boolean;
    onDelete: (id: string, filePath: string) => void;
}

export function TemplateList({ templates, loading, onDelete }: TemplateListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    return (
        <div className="bg-card rounded-lg p-6 border border-border shadow-sm space-y-4 flex-1">

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                </div>
            ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                    <FileText size={32} className="opacity-40" />
                    <p className="text-xs font-bold uppercase tracking-wider">Nenhum template cadastrado</p>
                    <p className="text-[11px] max-w-[280px]">
                        Envie o modelo PDF de proposta da sua imobiliária ao lado para disponibilizar aos corretores.
                    </p>
                </div>
            ) : (
                <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1">
                    {templates.map((tpl) => (
                        <div key={tpl.id} className="flex flex-col py-3 px-2 hover:bg-muted/30 rounded-lg transition-colors group">
                            <div 
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted/50 text-muted-foreground rounded-lg shrink-0">
                                        <FileText size={16} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">{tpl.name}</h4>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                tpl.template_type === 'agenciamento' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                tpl.template_type === 'generico' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>
                                                {tpl.template_type === 'agenciamento' ? 'Agenciamento' :
                                                 tpl.template_type === 'generico' ? 'Genérico' : 'Proposta'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                            Adicionado em {new Date(tpl.created_at).toLocaleDateString('pt-BR')} • {tpl.mapped_fields?.length || 0} campos mapeados
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <a
                                        href={tpl.file_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-secondary-foreground dark:text-secondary hover:underline px-2.5 py-1 bg-secondary/20 dark:bg-secondary/10 hover:bg-secondary/30 dark:hover:bg-secondary/20 rounded transition-all"
                                    >
                                        Ver PDF
                                    </a>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(tpl.id, tpl.file_path); }}
                                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Excluir"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button 
                                        className="p-1 text-muted-foreground hover:bg-muted rounded"
                                        onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === tpl.id ? null : tpl.id); }}
                                    >
                                        <ChevronDown size={18} className={`transition-transform duration-200 ${expandedId === tpl.id ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            
                            {expandedId === tpl.id && tpl.mapped_fields && tpl.mapped_fields.length > 0 && (
                                <div className="mt-3 bg-muted/20 border border-border/40 rounded-lg p-3 space-y-2 max-h-[250px] overflow-y-auto cursor-default" onClick={(e) => e.stopPropagation()}>
                                    {tpl.mapped_fields.map((field: any, idx: number) => (
                                        <div key={idx} className="flex flex-col p-2 bg-card border border-border/20 rounded-lg gap-1 leading-normal shadow-sm">
                                            <div className="flex justify-between font-bold text-foreground">
                                                <span className="text-xs truncate max-w-[200px]">{field.label}</span>
                                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">{field.type}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                                                <span className="font-mono">ID: {field.name}</span>
                                                <span>
                                                    {field.crm_binding ? (
                                                        <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                                                            ➔ {field.crm_binding.split('.')[1] || field.crm_binding}
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">
                                                            Manual
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
