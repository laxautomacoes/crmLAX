'use client';

import { useState, useEffect } from 'react';
import { getProposalTemplates, createProposalTemplate, deleteProposalTemplate } from '@/app/_actions/proposals';
import { FileText, Upload, Trash2, Loader2, Plus, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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
    const [uploading, setUploading] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const loadTemplates = async () => {
        setLoading(true);
        const res = await getProposalTemplates(tenantId);
        if (res.success && res.data) {
            setTemplates(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadTemplates();
    }, [tenantId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                toast.error('Por favor, envie um arquivo PDF.');
                return;
            }
            setFile(selectedFile);
            if (!name) {
                // Sugerir o nome do próprio arquivo
                setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !name.trim()) {
            toast.error('Preencha o nome do template e selecione um arquivo.');
            return;
        }

        setUploading(true);
        const supabase = createClient();

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `templates/${tenantId}/${fileName}`;

            // Enviar para o bucket crm-attachments
            const { error: uploadError } = await supabase.storage
                .from('crm-attachments')
                .upload(filePath, file, { cacheControl: '3600' });

            if (uploadError) throw uploadError;

            // Obter URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('crm-attachments')
                .getPublicUrl(filePath);

            // Gravar no banco
            const res = await createProposalTemplate(tenantId, name.trim(), publicUrl);

            if (res.success) {
                toast.success('Template enviado com sucesso!');
                setName('');
                setFile(null);
                loadTemplates();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            console.error('Erro no upload de template:', error);
            toast.error('Erro ao enviar o template: ' + (error.message || error));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm('Deseja realmente excluir este template de proposta?')) return;

        try {
            // Deletar do banco
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lista de Templates */}
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
                        <p className="text-[11px] max-w-[280px]">Envie o modelo PDF de proposta da sua imobiliária ao lado para disponibilizar aos corretores.</p>
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
                                        onClick={() => handleDelete(tpl.id, tpl.file_path)}
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

            {/* Upload de Novo Template */}
            <div className="col-span-1 bg-card rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="pb-2 border-b border-gray-100">
                        <h3 className="text-base font-bold text-[#404F4F]">Novo Modelo</h3>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800 ml-1">Nome do Template *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Proposta Padrão CRM LAX"
                            required
                            disabled={uploading}
                            className="w-full bg-gray-50 border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800 ml-1">Arquivo PDF *</label>
                        {!file ? (
                            <label className="border-[0.5px] border-dashed border-border/40 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/10 hover:border-accent-icon/50 transition-all cursor-pointer">
                                <Upload size={18} className="text-muted-foreground" />
                                <span className="text-[11px] font-bold text-muted-foreground text-center">Clique para selecionar PDF</span>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={uploading}
                                />
                            </label>
                        ) : (
                            <div className="flex items-center justify-between p-3.5 rounded-lg bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={16} className="text-red-500 shrink-0" />
                                    <span className="text-xs font-medium truncate">{file.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="text-[10px] font-bold text-red-500 hover:underline"
                                    disabled={uploading}
                                >
                                    Remover
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={uploading || !file || !name.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap mt-4"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Plus size={14} />
                                Salvar Template
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-4 bg-[#404F4F]/5 rounded-xl p-3 border border-[#404F4F]/10 flex gap-2">
                    <AlertCircle className="text-[#404F4F] shrink-0 mt-0.5" size={14} />
                    <p className="text-[10px] text-foreground/80 leading-relaxed">
                        Este PDF será disponibilizado aos corretores como modelo base. Eles preencherão os dados da proposta do lead e o sistema vinculará o documento gerado diretamente ao histórico da negociação.
                    </p>
                </div>
            </div>
        </div>
    );
}
