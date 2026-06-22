'use client';

import { useState, useEffect } from 'react';
import { Rocket, Plus, Loader2, GripVertical } from 'lucide-react';
import {
    getRoadmap,
    createRoadmapItem,
    updateRoadmapItem,
    deleteRoadmapItem,
    updateRoadmapItemStage,
    createRoadmapStage,
    renameRoadmapStage,
    deleteRoadmapStage,
    updateRoadmapStagesOrder,
    duplicateRoadmapStage,
    updateRoadmapStageColor
} from '@/app/_actions/roadmap';
import { getProfile } from '@/app/_actions/profile';
import { useRouter } from 'next/navigation';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormTextarea } from '@/components/shared/forms/FormTextarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
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
import { 
    sortableKeyboardCoordinates,
    SortableContext,
    horizontalListSortingStrategy,
    arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { RoadmapColumn } from '@/components/roadmap/RoadmapColumn';
import { RoadmapCard } from '@/components/roadmap/RoadmapCard';
import { toast } from 'sonner';

// Wrapper sortável para cada coluna do Roadmap — mesmo padrão do PipelineBoard
function SortableRoadmapColumn({
    stage, items, isSuperAdmin,
    onAddItem, onEditItem, onDeleteItem,
    onRenameStage, onDeleteStage, onDuplicateStage, onUpdateColor
}: {
    stage: RoadmapStage
    items: RoadmapItem[]
    isSuperAdmin: boolean
    onAddItem: (stageId: string) => void
    onEditItem: (item: RoadmapItem) => void
    onDeleteItem: (id: string) => void
    onRenameStage: (stageId: string, name: string) => void
    onDeleteStage: (stageId: string) => void
    onDuplicateStage: (stageId: string) => void
    onUpdateColor: (stageId: string, color: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: stage.id, disabled: !isSuperAdmin })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className="group/stage relative h-full">
            {/* Drag handle — aparece no hover, fora e acima do card */}
            {isSuperAdmin && (
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing p-0.5 rounded opacity-0 group-hover/stage:opacity-100 transition-opacity"
                    title="Arrastar para reordenar"
                >
                    <GripVertical size={12} className="text-muted-foreground/50 rotate-90" />
                </div>
            )}
            <RoadmapColumn
                id={stage.id}
                title={stage.name}
                color={stage.color}
                items={items}
                count={items.length}
                isSuperAdmin={isSuperAdmin}
                onAddItem={onAddItem}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
                onRenameStage={onRenameStage}
                onDeleteStage={onDeleteStage}
                onDuplicateStage={onDuplicateStage}
                onUpdateColor={onUpdateColor}
            />
        </div>
    )
}

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
    color?: string;
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
    const [activeStage, setActiveStage] = useState<RoadmapStage | null>(null);
    const router = useRouter();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
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
        if (event.active.data.current?.type === 'Column') {
            const stage = stages.find(s => s.id === event.active.id);
            if (stage) setActiveStage(stage);
            return;
        }
        const item = items.find((i) => i.id === event.active.id);
        if (item) setActiveItem(item);
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveItem(null);
        setActiveStage(null);
        if (!over) return;

        if (active.data.current?.type === 'Column') {
            const activeId = active.id;
            const overId = over.id;

            if (activeId === overId) return;

            const oldIndex = stages.findIndex(s => s.id === activeId);
            const newIndex = stages.findIndex(s => s.id === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newStages = arrayMove(stages, oldIndex, newIndex);
                setStages(newStages);
                
                const updates = newStages.map((stage, index) => ({
                    id: stage.id,
                    order_index: index
                }));

                const res = await updateRoadmapStagesOrder(updates);
                if (!res.success) {
                    toast.error(res.error || 'Erro ao reordenar colunas');
                    setStages(stages); // revert
                }
            }
            return;
        }

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
            });
        } else {
            setEditingItem(null);
            setFormData({ title: '', description: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!formData.title.trim()) return;
        setActionLoading(true);

        // Para edição mantém stage_id existente; para novo, sempre o primeiro estágio
        const payload = editingItem
            ? { title: formData.title, description: formData.description, type: editingItem.type, stage_id: editingItem.stage_id }
            : { title: formData.title, description: formData.description, type: 'roadmap' as const, stage_id: stages[0]?.id || '' };

        let res;
        if (editingItem) {
            res = await updateRoadmapItem(editingItem.id, payload);
        } else {
            res = await createRoadmapItem(payload);
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

    const handleDuplicateStage = async (stageId: string) => {
        if (!isSuperAdmin) return;
        const res = await duplicateRoadmapStage(stageId);
        if (res.success) {
            toast.success('Coluna duplicada com sucesso');
            loadData();
        } else {
            toast.error(res.error || 'Erro ao duplicar coluna');
        }
    };

    const handleUpdateStageColor = async (stageId: string, color: string) => {
        if (!isSuperAdmin) return;
        const res = await updateRoadmapStageColor(stageId, color);
        if (res.success) {
            loadData();
        } else {
            toast.error(res.error || 'Erro ao atualizar cor');
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
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-120px)] md:h-[calc(100vh-100px)]">
            <PageHeader
                title="Roadmap"
                subtitle="Acompanhe as próximas funcionalidades e melhorias do CRM LAX"
            >
                {isSuperAdmin && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreateStage}
                            className="min-w-[130px] h-[34px] flex items-center justify-center gap-2 bg-card hover:bg-muted text-foreground border border-border px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-wider shadow-sm whitespace-nowrap"
                        >
                            <Plus size={14} strokeWidth={2} />
                            Nova Coluna
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="min-w-[130px] h-[34px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-wider shadow-sm whitespace-nowrap"
                        >
                            <Plus size={14} strokeWidth={2} />
                            Novo Item
                        </button>
                    </div>
                )}
            </PageHeader>

            <hr className="hidden md:block border-border -mt-2" />

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
                <div className="flex-1 min-h-0 flex flex-col">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 md:-mx-8 px-4 md:px-8 custom-scrollbar flex-1 min-h-0">
                        <SortableContext items={stages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                            {stages.map((stage) => (
                                <SortableRoadmapColumn
                                    key={stage.id}
                                    stage={stage}
                                    items={items.filter((i) => i.stage_id === stage.id)}
                                    isSuperAdmin={isSuperAdmin}
                                    onAddItem={(stageId) => handleOpenModal(null, stageId)}
                                    onEditItem={(item) => handleOpenModal(item)}
                                    onDeleteItem={handleDelete}
                                    onRenameStage={handleRenameStage}
                                    onDeleteStage={handleDeleteStage}
                                    onDuplicateStage={handleDuplicateStage}
                                    onUpdateColor={handleUpdateStageColor}
                                />
                            ))}
                        </SortableContext>
                    </div>

                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: { active: { opacity: '0.5' } },
                        }),
                    }}>
                        {activeStage ? (
                            <RoadmapColumn
                                id={activeStage.id}
                                title={activeStage.name}
                                items={items.filter(i => i.stage_id === activeStage.id)}
                                count={items.filter(i => i.stage_id === activeStage.id).length}
                                isSuperAdmin={isSuperAdmin}
                                onAddItem={() => {}}
                                onEditItem={() => {}}
                                onDeleteItem={() => {}}
                                onRenameStage={() => {}}
                                onDeleteStage={() => {}}
                                onDuplicateStage={() => {}}
                                onUpdateColor={() => {}}
                            />
                        ) : activeItem ? (
                            <div className="w-[310px] px-4">
                                <RoadmapCard item={activeItem} isSuperAdmin={false} isOverlay />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
                </div>
            )}

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={
                    <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                        {editingItem ? 'Editar Item' : 'Novo Item'}
                    </h3>
                }
                size="md"
                align="top"
                extraHeaderContent={
                    <button
                        type="button"
                        disabled={actionLoading || !formData.title.trim()}
                        onClick={() => handleSubmit()}
                        className="px-4 py-1.5 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 shadow-sm active:scale-[0.97] transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                        {actionLoading ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Adicionar Item')}
                    </button>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <FormInput
                        label="Título"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Novo dashboard de métricas"
                    />
                    <FormTextarea
                        label="Descrição"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descreva brevemente a funcionalidade..."
                    />
                </form>
            </Modal>
        </div>
    );
}
