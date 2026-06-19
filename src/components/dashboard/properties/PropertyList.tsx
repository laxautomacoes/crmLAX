'use client'

import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'
import { PropertyListItem } from './PropertyListItem'

interface PropertyListProps {
    properties: any[]
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
    onView: (prop: any) => void
    onSend: (prop: any) => void
    onApprove?: (id: string) => void
    onReject?: (prop: any) => void
    onArchive?: (id: string) => void
    onTogglePublish?: (id: string, isPublished: boolean) => void
    userRole?: string
    userId?: string | null
    sortColumn?: 'title' | 'type' | 'price' | null
    sortDirection?: 'asc' | 'desc'
    onSort?: (column: 'title' | 'type' | 'price') => void
}

function SortIcon({ column, activeColumn, direction }: { column: string, activeColumn?: string | null, direction?: 'asc' | 'desc' }) {
    if (activeColumn !== column) {
        return <ArrowUpDown size={12} className="text-muted-foreground/50" />
    }
    return direction === 'asc'
        ? <ChevronUp size={12} className="text-accent-icon" />
        : <ChevronDown size={12} className="text-accent-icon" />
}

export function PropertyList({ properties, onEdit, onDelete, onView, onSend, onApprove, onReject, onArchive, onTogglePublish, userRole, userId, sortColumn, sortDirection, onSort }: PropertyListProps) {
    if (properties.length === 0) {
        return (
            <div className="text-center py-20 bg-card rounded-2xl">
                <p className="text-foreground font-medium">Nenhum imóvel cadastrado.</p>
            </div>
        )
    }

    const sortableThClass = "px-6 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center cursor-pointer select-none hover:bg-muted/30 transition-colors group"
    const staticThClass = "px-6 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center"

    return (
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-muted/50">
                        <tr>
                            <th
                                className={`${sortableThClass} min-w-[250px] md:min-w-0`}
                                onClick={() => onSort?.('title')}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    Imóvel
                                    <SortIcon column="title" activeColumn={sortColumn} direction={sortDirection} />
                                </span>
                            </th>
                            <th
                                className={sortableThClass}
                                onClick={() => onSort?.('type')}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    Tipo
                                    <SortIcon column="type" activeColumn={sortColumn} direction={sortDirection} />
                                </span>
                            </th>
                            <th className={staticThClass}>Detalhes</th>
                            <th className={staticThClass}>Áreas</th>
                            <th
                                className={sortableThClass}
                                onClick={() => onSort?.('price')}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    Valores
                                    <SortIcon column="price" activeColumn={sortColumn} direction={sortDirection} />
                                </span>
                            </th>
                            <th className={staticThClass}>Status</th>
                            <th className={staticThClass}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {properties.map((prop) => (
                            <PropertyListItem
                                key={prop.id}
                                prop={prop}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onView={onView}
                                onSend={onSend}
                                onApprove={onApprove}
                                onReject={onReject}
                                onArchive={onArchive}
                                onTogglePublish={onTogglePublish}
                                userRole={userRole}
                                userId={userId}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
