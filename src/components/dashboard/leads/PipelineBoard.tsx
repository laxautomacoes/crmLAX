'use client'

import { useState, useEffect } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { PipelineColumn } from './PipelineColumn'
import { LeadCard } from './LeadCard'
import { updateLeadStage } from '@/app/_actions/leads'
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
}

interface Stage {
    id: string
    name: string
    order_index: number
}

interface PipelineBoardProps {
    initialStages: Stage[]
    initialLeads: Lead[]
    onRefresh: () => void
    onAddLead: (stageId?: string) => void
    onDeleteStage: (stageId: string) => void
    onDuplicateStage: (stageId: string) => void
    onRenameStage: (stageId: string, name: string) => void
    onEditLead: (lead: Lead) => void
    onDeleteLead: (leadId: string) => void
}

export function PipelineBoard({ initialStages, initialLeads, onRefresh, onAddLead, onDeleteStage, onDuplicateStage, onRenameStage, onEditLead, onDeleteLead }: PipelineBoardProps) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads)
    const [activeLead, setActiveLead] = useState<Lead | null>(null)

    // Sincronizar estado local quando os props mudam
    useEffect(() => {
        setLeads(initialLeads)
    }, [initialLeads])

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
        const lead = leads.find((l) => l.id === active.id)
        if (lead) setActiveLead(lead)
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveLead(null)

        if (!over) return

        const activeId = active.id
        const overId = over.id

        const activeLead = leads.find(l => l.id === activeId)
        if (!activeLead) return

        // Identificar se soltou sobre um estágio ou outro card
        let newStageId = overId.toString()
        const isOverStage = initialStages.some(s => s.id === overId)

        if (!isOverStage) {
            const overLead = leads.find(l => l.id === overId)
            if (overLead) newStageId = overLead.status
        }

        // Se mudou de estágio, persistir no banco
        if (activeLead.status !== newStageId) {
            // Update otimista
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

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 md:-mx-8 px-4 md:px-8 custom-scrollbar h-[calc(100vh-220px)]">
                {initialStages.map((stage) => (
                    <PipelineColumn
                        key={stage.id}
                        id={stage.id}
                        title={stage.name}
                        leads={leads.filter((l) => l.status === stage.id)}
                        count={leads.filter((l) => l.status === stage.id).length}
                        onAddLead={onAddLead}
                        onDeleteStage={onDeleteStage}
                        onDuplicateStage={onDuplicateStage}
                        onRenameStage={onRenameStage}
                        onEditLead={onEditLead}
                        onDeleteLead={onDeleteLead}
                    />
                ))}
            </div>

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: '0.5',
                        },
                    },
                }),
            }}>
                {activeLead ? (
                    <div className="w-[310px] items-center px-4">
                        <LeadCard lead={activeLead} isOverlay />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
