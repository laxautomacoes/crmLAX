'use client'

import { PropertyCard } from './PropertyCard'

interface PropertyGalleryProps {
    properties: any[]
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
    onView: (prop: any) => void
    onSend: (prop: any) => void
    userRole?: string
    userId?: string | null
}

export function PropertyGallery({ properties, onEdit, onDelete, onView, onSend, userRole, userId }: PropertyGalleryProps) {
    if (properties.length === 0) {
        return (
            <div className="text-center py-20 bg-card rounded-2xl">
                <p className="text-foreground font-medium">Nenhum imóvel cadastrado.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop) => (
                <PropertyCard
                    key={prop.id}
                    prop={prop}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onView={onView}
                    onSend={onSend}
                    userRole={userRole}
                    userId={userId}
                />
            ))}
        </div>
    )
}
