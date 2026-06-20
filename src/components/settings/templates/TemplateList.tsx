'use client';

import { FileText, Trash2, Loader2 } from 'lucide-react';

interface ProposalTemplate {
    id: string;
    name: string;
    file_path: string;
    created_at: string;
}

interface TemplateListProps {
    templates: ProposalTemplate[];
    loading: boolean;
    onDelete: (id: string, filePath: string) => void;
}

export function TemplateList({ templates, loading, onDelete }: TemplateListProps) {
    return (
        <div className="col-span-1 md:col-span-2 bg-card rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-[#404F4F]">Modelos de Proposta Ativos</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                    {templates.length} {templates.length === 1 ? 'modelo' : 'modelos'}
                </span>
            </div>

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
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto pr-1">
                    {templates.map((tpl) => (
                        <div key={tpl.id} className="flex items-center justify-between py-3.5 group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#404F4F]/5 text-[#404F4F] rounded-lg">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 leading-tight">{tpl.name}</h4>
                                    <span className="text-[10px] text-muted-foreground">
                                        Adicionado em {new Date(tpl.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={tpl.file_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-secondary-foreground hover:underline px-2.5 py-1 bg-secondary/10 hover:bg-secondary/20 rounded transition-all"
                                >
                                    Ver PDF
                                </a>
                                <button
                                    onClick={() => onDelete(tpl.id, tpl.file_path)}
                                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Excluir"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
