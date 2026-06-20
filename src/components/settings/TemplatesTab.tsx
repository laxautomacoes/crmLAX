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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Lado Esquerdo: Listagem de Templates */}
            <TemplateList 
                templates={templates} 
                loading={loading} 
                onDelete={handleDelete} 
            />

            {/* Lado Direito: Formulário com IA */}
            <TemplateForm 
                tenantId={tenantId} 
                onSuccess={loadTemplates} 
            />
        </div>
    );
}
export default TemplatesTab;
