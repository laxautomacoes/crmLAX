'use client'

import { Edit2, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface RoadmapItem {
    id: string
    title: string
    description?: string
    type: 'feature' | 'fix' | 'roadmap'
    stage_id: string
    published_at: string
}

interface RoadmapCardProps {
    item: RoadmapItem
    isSuperAdmin: boolean
    isOverlay?: boolean
    onEdit?: (item: RoadmapItem) => void
    onDelete?: (itemId: string) => void
}

export function RoadmapCard({ item, isSuperAdmin, isOverlay, onEdit, onDelete }: RoadmapCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        disabled: !isSuperAdmin,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const typeBadge = {
        feature: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        fix: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        roadmap: 'bg-secondary/10 text-secondary border-secondary/20',
    }

    const typeLabel = {
        feature: 'Melhoria',
        fix: 'Correção',
        roadmap: 'Roadmap',
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...(isSuperAdmin ? listeners : {})}
            className={`
                bg-card rounded-xl border border-border p-4 shadow-sm 
                hover:shadow-md transition-shadow group
                ${isSuperAdmin ? 'cursor-grab active:cursor-grabbing' : ''}
                ${isOverlay ? 'shadow-xl ring-2 ring-secondary/30 rotate-2' : ''}
            `}
        >
            <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${typeBadge[item.type]}`}>
                    {typeLabel[item.type]}
                </span>
                {isSuperAdmin && !isOverlay && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            <h4 className="font-bold text-sm text-foreground mb-1">{item.title}</h4>
            {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 font-medium leading-relaxed">
                    {item.description}
                </p>
            )}
        </div>
    )
}
