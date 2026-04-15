'use client'

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
    id: string;
    children: React.ReactNode;
    disabled?: boolean;
}

export function SortableItem({ id, children, disabled }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full">
            {children}
        </div>
    );
}
