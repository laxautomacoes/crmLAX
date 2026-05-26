'use client';
 
import { useState, useEffect } from 'react';
import { getLeadSources, createLeadSource, deleteLeadSource } from '@/app/_actions/leads';
import { FormInput } from '@/components/shared/forms/FormInput';
import { Plus, Trash2, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
 
interface LeadSource {
    id: string;
    name: string;
    created_at?: string;
}
 
interface SourcesTabProps {
    tenantId: string;
}
 
export function SourcesTab({ tenantId }: SourcesTabProps) {
    const [sources, setSources] = useState<LeadSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [newSourceName, setNewSourceName] = useState('');
 
    const loadSources = async () => {
        setLoading(true);
        const res = await getLeadSources(tenantId);
        if (res.success && res.data) {
            setSources(res.data as LeadSource[]);
        }
        setLoading(false);
    };
 
    useEffect(() => {
        loadSources();
    }, [tenantId]);
 
    const handleCreateSource = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newSourceName.trim();
        if (!name) return;
 
        setCreating(true);
        const res = await createLeadSource(tenantId, name);
        if (res.success) {
            toast.success('Origem criada com sucesso!');
            setNewSourceName('');
            // Recarregar a lista
            const sourcesRes = await getLeadSources(tenantId);
            if (sourcesRes.success && sourcesRes.data) {
                setSources(sourcesRes.data as LeadSource[]);
            }
        } else {
            toast.error('Erro ao criar origem: ' + res.error);
        }
        setCreating(false);
    };
 
    const handleDeleteSource = async (id: string, name: string) => {
        if (!confirm(`Deseja realmente excluir a origem "${name}"? leads existentes com essa origem não serão excluídos, mas a opção não aparecerá mais nos filtros e formulários.`)) {
            return;
        }
 
        setDeletingId(id);
        const res = await deleteLeadSource(id);
        if (res.success) {
            toast.success('Origem removida com sucesso!');
            setSources(prev => prev.filter(s => s.id !== id));
        } else {
            toast.error('Erro ao remover origem: ' + res.error);
        }
        setDeletingId(null);
    };
 
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Lado Esquerdo: Formulário de Cadastro */}
            <div className="col-span-1 bg-card dark:bg-muted/10 border border-border/40 p-6 rounded-2xl h-fit space-y-4">
                <div>
                    <h3 className="font-bold text-foreground text-base">Nova Origem</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Cadastre uma nova opção de origem de leads para sua imobiliária.
                    </p>
                </div>
 
                <form onSubmit={handleCreateSource} className="space-y-4">
                    <FormInput
                        label="Nome da Origem *"
                        value={newSourceName}
                        onChange={(e) => setNewSourceName(e.target.value)}
                        placeholder="Ex: Instagram, TikTok, etc."
                        required
                        disabled={creating}
                    />
 
                    <button
                        type="submit"
                        disabled={creating || !newSourceName.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-xs font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] dark:bg-[#FFE600] dark:text-[#404F4F] dark:hover:bg-[#F2DB00] rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                        {creating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Plus className="w-3.5 h-3.5" />
                        )}
                        Criar Origem
                    </button>
                </form>
 
                <div className="bg-muted/30 dark:bg-muted/10 border border-border/30 rounded-xl p-3.5 flex gap-2.5">
                    <Info className="text-accent-icon shrink-0 mt-0.5" size={14} />
                    <p className="text-[10px] text-muted-foreground leading-normal font-medium">
                        As origens cadastradas aqui estarão imediatamente disponíveis na criação e edição de leads para todos os corretores.
                    </p>
                </div>
            </div>
 
            {/* Lado Direito: Listagem */}
            <div className="col-span-1 md:col-span-2 bg-card dark:bg-muted/10 border border-border/40 p-6 rounded-2xl space-y-4">
                <div>
                    <h3 className="font-bold text-foreground text-base">Origens Cadastradas</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Visualize e gerencie as origens ativas no CRM.
                    </p>
                </div>
 
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                    </div>
                ) : sources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed border-border/40 rounded-xl gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider">Nenhuma origem cadastrada</p>
                        <p className="text-[10px] max-w-[240px]">
                            As origens padrões (Meta, Google, Portal, etc.) são exibidas por padrão no formulário caso nenhuma personalizada seja criada.
                        </p>
                    </div>
                ) : (
                    <div className="border border-border/20 rounded-xl overflow-hidden bg-background/30 dark:bg-background/10">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-border/20 text-muted-foreground font-bold uppercase tracking-wider bg-muted/20">
                                        <th className="py-3 px-4">Nome da Origem</th>
                                        <th className="py-3 px-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {sources.map((source) => (
                                        <tr key={source.id} className="hover:bg-muted/20 group transition-colors">
                                            <td className="py-3 px-4 font-bold text-foreground">
                                                {source.name}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteSource(source.id, source.name)}
                                                    disabled={deletingId === source.id}
                                                    className="text-muted-foreground hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all rounded hover:bg-red-500/10"
                                                    title="Excluir Origem"
                                                >
                                                    {deletingId === source.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
