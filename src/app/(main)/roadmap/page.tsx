'use client';

import { useState, useEffect } from 'react';
import { Rocket, Plus, Loader2 } from 'lucide-react';
import {
    getRoadmap,
    createRoadmapItem,
    updateRoadmapItem,
    deleteRoadmapItem,
    updateRoadmapItemStage,
    createRoadmapStage,
    renameRoadmapStage,
    deleteRoadmapStage
} from '@/app/_actions/roadmap';
import { getProfile } from '@/app/_actions/profile';
import { useRouter } from 'next/navigation';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { FormTextarea } from '@/components/shared/forms/FormTextarea';
import { PageHeader } from '@/components/shared/PageHeader';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { RoadmapColumn } from '@/components/roadmap/RoadmapColumn';
import { RoadmapCard } from '@/components/roadmap/RoadmapCard';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

interface RoadmapItem {
    id: string;
    title: string;
    description?: string;
    type: 'feature' | 'fix' | 'roadmap';
    stage_id: string;
    published_at: string;
}

interface RoadmapStage {
    id: string;
    name: string;
    order_index: number;
}

export default function RoadmapPage() {
    const [items, setItems] = useState<RoadmapItem[]>([]);
    const [stages, setStages] = useState<RoadmapStage[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
    const [activeItem, setActiveItem] = useState<RoadmapItem | null>(null);
    const router = useRouter();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'roadmap' as 'feature' | 'fix' | 'roadmap',
        stage_id: ''
    });

    const loadData = async () => {
        setLoading(true);
        const [roadmapRes, profileRes] = await Promise.all([
            getRoadmap(),
            getProfile()
        ]);

        if (profileRes.profile) {
            if (profileRes.profile.role === 'user') {
                router.push('/dashboard');
                return;
            }
            setProfile(profileRes.profile);
        }

        if (roadmapRes.stages) {
            setStages(roadmapRes.stages);
        }

        if (roadmapRes.items) {
            setItems(roadmapRes.items);
        }
        setLoading(false);
    };

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            setLoading(true);
            const [roadmapRes, profileRes] = await Promise.all([
                getRoadmap(),
                getProfile()
            ]);

            if (!isMounted) return;

            if (profileRes.profile) {
                if (profileRes.profile.role === 'user') {
                    router.push('/dashboard');
                    return;
                }
                setProfile(profileRes.profile);
            }

            if (roadmapRes.stages) {
                setStages(roadmapRes.stages);
            }

            if (roadmapRes.items) {
                setItems(roadmapRes.items);
            }
            setLoading(false);
        };

        void loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [router]);

    const isSuperAdmin = profile?.role === 'superadmin';

    // ─── DnD ──────────────────────────────────────────────────────

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragStart(event: DragStartEvent) {
        const item = items.find((i) => i.id === event.active.id);
        if (item) setActiveItem(item);
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveItem(null);
        if (!over) return;

        const draggedItem = items.find(i => i.id === active.id);
        if (!draggedItem) return;

        let newStageId = over.id.toString();
        const isOverStage = stages.some(s => s.id === over.id);

        if (!isOverStage) {
            const overItem = items.find(i => i.id === over.id);
            if (overItem) newStageId = overItem.stage_id;
        }

        if (draggedItem.stage_id !== newStageId) {
            const oldItems = [...items];
            setItems(items.map(i => i.id === active.id ? { ...i, stage_id: newStageId } : i));

            const result = await updateRoadmapItemStage(active.id.toString(), newStageId);
            if (!result.success) {
                toast.error(result.error || 'Erro ao mover item');
                setItems(oldItems);
            }
        }
    }

    // ─── Item CRUD ────────────────────────────────────────────────

    const handleOpenModal = (item: RoadmapItem | null = null, stageId?: string) => {
        if (!isSuperAdmin) return;
        if (item) {
            setEditingItem(item);
            setFormData({
                title: item.title,
                description: item.description || '',
                type: item.type,
                stage_id: item.stage_id
            });
        } else {
            setEditingItem(null);
            setFormData({
                title: '',
                description: '',
                type: 'roadmap',
                stage_id: stageId || stages[0]?.id || ''
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
            toast.error(res.error || 'Erro ao salvar item');
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
            toast.error(res.error || 'Erro ao excluir');
        }
        setActionLoading(false);
    };

    // ─── Stage CRUD ───────────────────────────────────────────────

    const handleCreateStage = async () => {
        if (!isSuperAdmin) return;
        const name = prompt('Nome da nova coluna:');
        if (!name?.trim()) return;

        const res = await createRoadmapStage(name.trim());
        if (res.success) {
            loadData();
        } else {
            toast.error(res.error || 'Erro ao criar coluna');
        }
    };

    const handleRenameStage = async (stageId: string, currentName: string) => {
        if (!isSuperAdmin) return;
        const result = await renameRoadmapStage(stageId, currentName);
        if (result.success) {
            loadData();
        } else {
            toast.error(result.error || 'Erro ao renomear coluna');
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        if (!isSuperAdmin) return;
        if (!confirm('Tem certeza que deseja excluir esta coluna?')) return;

        const res = await deleteRoadmapStage(stageId);
        if (res.success) {
            loadData();
        } else {
            toast.error(res.error || 'Erro ao excluir coluna');
        }
    };

    // ─── Render ───────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Roadmap do Produto"
                subtitle="Acompanhe as próximas funcionalidades e melhorias do CRM LAX"
            >
                {isSuperAdmin && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreateStage}
                            className="border border-border hover:bg-muted text-foreground text-sm font-bold px-4 py-3 md:py-2 rounded-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <Plus size={18} />
                            Nova Coluna
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-secondary hover:opacity-90 text-secondary-foreground text-sm font-bold px-4 py-3 md:py-2 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                        >
                            <Plus size={20} />
                            Novo Item
                        </button>
                    </div>
                )}
            </PageHeader>

            {stages.length === 0 ? (
                <div className="bg-card p-12 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center">
                    <Rocket className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-lg font-bold text-foreground">Nenhuma coluna no Roadmap</h3>
                    <p className="text-muted-foreground max-w-sm text-sm">
                        {isSuperAdmin
                            ? 'Comece criando a primeira coluna para organizar seu roadmap.'
                            : 'Aguarde as novidades que o time está preparando.'}
                    </p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 md:-mx-8 px-4 md:px-8 custom-scrollbar h-[calc(100vh-220px)]">
                        {stages.map((stage) => (
                            <RoadmapColumn
                                key={stage.id}
                                id={stage.id}
                                title={stage.name}
                                items={items.filter((i) => i.stage_id === stage.id)}
                                count={items.filter((i) => i.stage_id === stage.id).length}
                                isSuperAdmin={isSuperAdmin}
                                onAddItem={(stageId) => handleOpenModal(null, stageId)}
                                onEditItem={(item) => handleOpenModal(item)}
                                onDeleteItem={handleDelete}
                                onRenameStage={handleRenameStage}
                                onDeleteStage={handleDeleteStage}
                            />
                        ))}
                    </div>

                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: { active: { opacity: '0.5' } },
                        }),
                    }}>
                        {activeItem ? (
                            <div className="w-[310px] px-4">
                                <RoadmapCard item={activeItem} isSuperAdmin={false} isOverlay />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

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
                                    label="Coluna"
                                    value={formData.stage_id}
                                    onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                                    options={stages.map(s => ({ value: s.id, label: s.name }))}
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-border bg-muted text-sm font-bold text-foreground hover:bg-muted/80 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 py-2.5 bg-secondary hover:opacity-90 text-secondary-foreground font-bold rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
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
