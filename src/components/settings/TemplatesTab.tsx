'use client';

import { useState, useEffect } from 'react';
import { getProposalTemplates, deleteProposalTemplate } from '@/app/_actions/proposals';
import { TemplateList } from './templates/TemplateList';
import { TemplateForm } from './templates/TemplateForm';
import { toast } from 'sonner';

interface ProposalTemplate {
    id: string;
    name: string;
    file_path: string;
    created_at: string;
    template_type?: string;
}

interface TemplatesTabProps {
    tenantId: string;
}

export function TemplatesTab({ tenantId }: TemplatesTabProps) {
    const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const res = await getProposalTemplates(tenantId);
            if (res.success && res.data) {
                setTemplates(res.data as ProposalTemplate[]);
            } else {
                toast.error('Erro ao carregar templates.');
            }
        } catch (error) {
            console.error('Erro no fetch de templates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, [tenantId]);

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm('Deseja realmente excluir este template de proposta?')) return;

        try {
            const res = await deleteProposalTemplate(id);
            if (res.success) {
                toast.success('Template excluído com sucesso.');
                loadTemplates();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            console.error('Erro ao deletar template:', error);
            toast.error('Erro ao excluir template: ' + (error.message || error));
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Lado Esquerdo: Listagem de Templates */}
            <div className="col-span-1 flex flex-col space-y-3">
                <div className="px-1 space-y-1">
                    <div className="flex justify-between items-start w-full">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-foreground">Modelos Ativos</h3>
                            <p className="text-sm text-muted-foreground">Visualize e gerencie os modelos de formulários comerciais cadastrados.</p>
                        </div>
                        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold shrink-0 ml-4">
                            {templates.length} {templates.length === 1 ? 'modelo' : 'modelos'}
                        </span>
                    </div>
                </div>
                <TemplateList 
                    templates={templates} 
                    loading={loading} 
                    onDelete={handleDelete} 
                />
            </div>

            {/* Lado Direito: Formulário com IA */}
            <div className="col-span-1 flex flex-col space-y-3">
                <div className="px-1 space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Novo Modelo</h3>
                    <p className="text-sm text-muted-foreground">Envie e mapeie um novo modelo de formulário com ajuda da nossa inteligência artificial.</p>
                </div>
                <TemplateForm 
                    tenantId={tenantId} 
                    onSuccess={loadTemplates} 
                />
            </div>
        </div>
    );
}
export default TemplatesTab;
