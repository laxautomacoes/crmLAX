'use client'

import { PropertyListItem } from './PropertyListItem'

interface PropertyListProps {
    properties: any[]
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
    onView: (prop: any) => void
    onSend: (prop: any) => void
}

export function PropertyList({ properties, onEdit, onDelete, onView, onSend }: PropertyListProps) {
    if (properties.length === 0) {
        return (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground font-medium">Nenhum imóvel cadastrado.</p>
            </div>
        )
    }

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Imóvel</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Detalhes</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Áreas</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valores</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lazer</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {properties.map((prop) => (
                            <PropertyListItem
                                key={prop.id}
                                prop={prop}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onView={onView}
                                onSend={onSend}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
