'use client'

import { useState, useEffect } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
    SortableContext,
    horizontalListSortingStrategy,
    useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PipelineColumn } from './PipelineColumn'
import { LeadCard } from './LeadCard'
import { updateLeadStage } from '@/app/_actions/leads'
import { reorderStages } from '@/app/_actions/stages'
import { toast } from 'sonner'

export interface Lead {
    id: string
    name: string
    phone: string
    email: string
    interest?: string
    tags?: string[]
    notes?: string
    value?: number
    status: string
    assigned_to?: string
    broker_name?: string
    images?: string[]
    videos?: string[]
    documents?: { name: string; url: string }[]
    whatsapp_chat?: Array<{ fromMe?: boolean; message?: string; text?: string }>
    last_interaction_at?: string | null
}

interface Stage {
    id: string
    name: string
    order_index: number
    color?: string
}

interface PipelineBoardProps {
    initialStages: Stage[]
    initialLeads: Lead[]
    onRefresh: () => void
    onAddLead: (stageId?: string) => void
    onDeleteStage: (stageId: string) => void
    onDuplicateStage: (stageId: string) => void
    onRenameStage: (stageId: string, name: string) => void
    onUpdateStageColor: (stageId: string, color: string) => void
    onEditLead: (lead: Lead) => void
    onDeleteLead: (leadId: string) => void
    onArchiveLead: (leadId: string) => void
    onAddStage?: () => void
}

// Wrapper sortable para cada coluna de estágio
function SortableStageColumn({
    stage,
    leads,
    onAddLead,
    onDeleteStage,
    onDuplicateStage,
    onRenameStage,
    onUpdateStageColor,
    onEditLead,
    onDeleteLead,
    onArchiveLead,
}: {
    stage: Stage
    leads: Lead[]
    onAddLead: (stageId?: string) => void
    onDeleteStage: (stageId: string) => void
    onDuplicateStage: (stageId: string) => void
    onRenameStage: (stageId: string, name: string) => void
    onUpdateStageColor: (stageId: string, color: string) => void
    onEditLead: (lead: Lead) => void
    onDeleteLead: (leadId: string) => void
    onArchiveLead: (leadId: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `stage-${stage.id}` })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className="group/stage relative">
            {/* Drag handle - barra sutil no topo */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing p-0.5 rounded opacity-0 group-hover/stage:opacity-100 transition-opacity"
                title="Arrastar para reordenar"
            >
                <GripVertical size={12} className="text-muted-foreground/50 rotate-90" />
            </div>
            <PipelineColumn
                id={stage.id}
                title={stage.name}
                color={stage.color}
                leads={leads}
                count={leads.length}
                onAddLead={onAddLead}
                onDeleteStage={onDeleteStage}
                onDuplicateStage={onDuplicateStage}
                onRenameStage={onRenameStage}
                onUpdateColor={onUpdateStageColor}
                onEditLead={onEditLead}
                onDeleteLead={onDeleteLead}
                onArchiveLead={onArchiveLead}
            />
        </div>
    )
}

export function PipelineBoard({ initialStages, initialLeads, onRefresh, onAddLead, onDeleteStage, onDuplicateStage, onRenameStage, onUpdateStageColor, onEditLead, onDeleteLead, onArchiveLead, onAddStage }: PipelineBoardProps) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads)
    const [stages, setStages] = useState<Stage[]>(initialStages)
    const [activeLead, setActiveLead] = useState<Lead | null>(null)
    const [activeStage, setActiveStage] = useState<Stage | null>(null)

    useEffect(() => {
        setLeads(initialLeads)
    }, [initialLeads])

    useEffect(() => {
        setStages(initialStages)
    }, [initialStages])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    function handleDragStart(event: DragStartEvent) {
        const { active } = event
        const idStr = active.id.toString()

        if (idStr.startsWith('stage-')) {
            const stageId = idStr.replace('stage-', '')
            const stage = stages.find(s => s.id === stageId)
            if (stage) setActiveStage(stage)
        } else {
            const lead = leads.find((l) => l.id === active.id)
            if (lead) setActiveLead(lead)
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (!over) {
            setActiveLead(null)
            setActiveStage(null)
            return
        }

        const activeIdStr = active.id.toString()
        const overIdStr = over.id.toString()

        // --- Stage drag ---
        if (activeIdStr.startsWith('stage-')) {
            setActiveStage(null)
            if (activeIdStr === overIdStr) return

            if (!overIdStr.startsWith('stage-')) return

            const activeStageId = activeIdStr.replace('stage-', '')
            const overStageId = overIdStr.replace('stage-', '')

            const oldIndex = stages.findIndex(s => s.id === activeStageId)
            const newIndex = stages.findIndex(s => s.id === overStageId)

            if (oldIndex === -1 || newIndex === -1) return

            // Reordenar otimisticamente
            const newStages = [...stages]
            const [moved] = newStages.splice(oldIndex, 1)
            newStages.splice(newIndex, 0, moved)
            setStages(newStages)

            const result = await reorderStages(newStages.map(s => s.id))
            if (!result.success) {
                toast.error('Erro ao reordenar estágios')
                setStages(stages)
            } else {
                onRefresh()
            }
            return
        }

        // --- Lead drag ---
        setActiveLead(null)
        const activeId = active.id
        const overId = over.id

        const draggedLead = leads.find(l => l.id === activeId)
        if (!draggedLead) return

        let newStageId = overId.toString()
        const isOverStage = stages.some(s => s.id === overId)

        if (!isOverStage) {
            const overLead = leads.find(l => l.id === overId)
            if (overLead) newStageId = overLead.status
        }

        if (draggedLead.status !== newStageId) {
            const oldLeads = [...leads]
            setLeads(leads.map(l => l.id === activeId ? { ...l, status: newStageId } : l))

            const result = await updateLeadStage(activeId.toString(), newStageId)
            if (!result.success) {
                toast.error('Erro ao atualizar estágio do lead')
                setLeads(oldLeads)
            } else {
                onRefresh()
            }
        }
    }

    const stageIds = stages.map(s => `stage-${s.id}`)

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={stageIds} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 -mx-4 md:-mx-8 px-4 md:px-8 custom-scrollbar h-[calc(100vh-280px)] md:h-[calc(100vh-220px)]">
                    {stages.map((stage) => (
                        <SortableStageColumn
                            key={stage.id}
                            stage={stage}
                            leads={leads.filter((l) => l.status === stage.id)}
                            onAddLead={onAddLead}
                            onDeleteStage={onDeleteStage}
                            onDuplicateStage={onDuplicateStage}
                            onRenameStage={onRenameStage}
                            onUpdateStageColor={onUpdateStageColor}
                            onEditLead={onEditLead}
                            onDeleteLead={onDeleteLead}
                            onArchiveLead={onArchiveLead}
                        />
                    ))}
                    {onAddStage && (
                        <div className="shrink-0 w-[40px]">
                            <button
                                onClick={onAddStage}
                                className="w-full h-full flex items-center justify-center border border-secondary/20 hover:border-secondary/40 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-all group"
                                title="Novo Estágio"
                            >
                                <Plus size={22} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                            </button>
                        </div>
                    )}
                </div>
            </SortableContext>

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: '0.5',
                        },
                    },
                }),
            }}>
                {activeStage ? (
                    <div className="w-[280px] md:w-[310px] opacity-90 shadow-2xl">
                        <PipelineColumn
                            id={activeStage.id}
                            title={activeStage.name}
                            color={activeStage.color}
                            leads={leads.filter((l) => l.status === activeStage.id)}
                            count={leads.filter((l) => l.status === activeStage.id).length}
                            onAddLead={() => {}}
                            onDeleteStage={() => {}}
                            onDuplicateStage={() => {}}
                            onRenameStage={() => {}}
                            onUpdateColor={() => {}}
                            onEditLead={() => {}}
                            onDeleteLead={() => {}}
                            onArchiveLead={() => {}}
                        />
                    </div>
                ) : activeLead ? (
                    <div className="w-[280px] md:w-[310px] items-center px-4">
                        <LeadCard lead={activeLead} isOverlay />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
