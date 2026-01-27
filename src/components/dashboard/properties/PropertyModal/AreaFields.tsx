'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { Maximize2 } from 'lucide-react'

interface AreaFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

export function AreaFields({ formData, setFormData }: AreaFieldsProps) {
    return (
        <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Maximize2 size={14} className="text-primary" />
                Áreas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4">
            <FormInput
                label="Área Privativa (m²)"
                type="number"
                value={formData.details.area_privativa}
                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_privativa: e.target.value } })}
            />
            <FormInput
                label="Área Total (m²)"
                type="number"
                value={formData.details.area_total}
                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_total: e.target.value } })}
            />
            <FormInput
                label="Área Terreno (m²)"
                type="number"
                value={formData.details.area_terreno}
                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_terreno: e.target.value } })}
            />
            <FormInput
                label="Área Construção (m²)"
                type="number"
                value={formData.details.area_construida}
                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_construida: e.target.value } })}
            />
        </div>
    </div>
    )
}
