'use client';

import { useState, useEffect } from 'react';
import { Rocket, Plus, Edit2, Trash2, CheckCircle2, Circle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { getRoadmap, createRoadmapItem, updateRoadmapItem, deleteRoadmapItem } from '@/app/_actions/roadmap';
import { getProfile } from '@/app/_actions/profile';
import { useRouter } from 'next/navigation';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { FormTextarea } from '@/components/shared/forms/FormTextarea';

export const dynamic = 'force-dynamic';

export default function RoadmapPage() {
    const [items, setItems] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const router = useRouter();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'roadmap' as 'feature' | 'fix' | 'roadmap',
        status: 'planned'
    });

    const loadData = async () => {
        setLoading(true);
        const [roadmapRes, profileRes] = await Promise.all([
            getRoadmap(),
            getProfile()
        ]);

        if (profileRes.profile) {
            // Regra: Rodmap não visível para 'user'
            if (profileRes.profile.role === 'user') {
                router.push('/dashboard');
                return;
            }
            setProfile(profileRes.profile);
        }

        if (roadmapRes.items) {
            setItems(roadmapRes.items);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const isSuperAdmin = profile?.role === 'superadmin';

    const handleOpenModal = (item: any = null) => {
        if (!isSuperAdmin) return;
        if (item) {
            setEditingItem(item);
            setFormData({
                title: item.title,
                description: item.description || '',
                type: item.type as any,
                status: item.status
            });
        } else {
            setEditingItem(null);
            setFormData({
                title: '',
                description: '',
                type: 'roadmap',
                status: 'planned'
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);

        let res;
        if (editingItem) {
            res = await updateRoadmapItem(editingItem.id, formData);
        } else {
            res = await createRoadmapItem(formData);
        }

        if (res.success) {
            setShowModal(false);
            loadData();
        } else {
            alert(res.error || 'Erro ao salvar item');
        }
        setActionLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!isSuperAdmin || !confirm('Tem certeza que deseja excluir este item?')) return;
        setActionLoading(true);
        const res = await deleteRoadmapItem(id);
        if (res.success) {
            loadData();
        } else {
            alert(res.error || 'Erro ao excluir');
        }
        setActionLoading(false);
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Roadmap do Produto</h1>
                    <p className="text-muted-foreground text-sm">Acompanhe as próximas funcionalidades e melhorias do CRM LAX</p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-2.5 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                    >
                        <Plus size={20} />
                        Novo Item
                    </button>
                )}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.length === 0 ? (
                    <div className="col-span-full bg-card p-12 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center">
                        <Rocket className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-lg font-bold text-foreground">Nenhum item no Roadmap</h3>
                        <p className="text-muted-foreground max-w-sm text-sm">
                            {isSuperAdmin
                                ? 'Comece adicionando o primeiro item para compartilhar os planos com sua equipe.'
                                : 'Aguarde as novidades que o time está preparando.'}
                        </p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                            <div className="flex items-start justify-between mb-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${item.type === 'feature' ? 'bg-blue-100 text-blue-600' :
                                        item.type === 'fix' ? 'bg-orange-100 text-orange-600' :
                                            'bg-secondary/10 text-secondary'
                                    }`}>
                                    {item.type}
                                </span>
                                {isSuperAdmin && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(item)}
                                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <h3 className="font-bold text-lg text-foreground mb-1.5">{item.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-1 font-medium">
                                {item.description}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                                <div className="flex items-center gap-2">
                                    {item.status === 'completed' ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    ) : item.status === 'in_progress' ? (
                                        <Clock className="w-4 h-4 text-yellow-500" />
                                    ) : (
                                        <Circle className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <span className="text-xs font-bold text-muted-foreground uppercase">
                                        {item.status === 'completed' ? 'Concluído' :
                                            item.status === 'in_progress' ? 'Em Progresso' : 'Planejado'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden ring-1 ring-black/5">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-xl font-bold text-foreground">
                                {editingItem ? 'Editar Item' : 'Novo Item do Roadmap'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <FormInput
                                label="Título"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ex: Novo dashboard de métricas"
                            />

                            <FormTextarea
                                label="Descrição"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descreva brevemente a funcionalidade..."
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormSelect
                                    label="Tipo"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    options={[
                                        { value: 'roadmap', label: 'Roadmap' },
                                        { value: 'feature', label: 'Melhoria' },
                                        { value: 'fix', label: 'Correção' }
                                    ]}
                                />
                                <FormSelect
                                    label="Status"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    options={[
                                        { value: 'planned', label: 'Planejado' },
                                        { value: 'in_progress', label: 'Em Progresso' },
                                        { value: 'completed', label: 'Concluído' }
                                    ]}
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-[2] py-2.5 bg-secondary hover:opacity-90 text-secondary-foreground font-bold rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingItem ? 'Salvar Alterações' : 'Adicionar Item')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
