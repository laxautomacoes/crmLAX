'use client'

import { FormRichTextarea } from '@/components/shared/forms/FormRichTextarea'
import { Info } from 'lucide-react'

interface DescriptionFieldProps {
    formData: any
    setFormData: (data: any) => void
}

export function DescriptionField({ formData, setFormData }: DescriptionFieldProps) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">
                DESCRIÇÃO
                <span className="ml-1 text-[10px] font-normal italic normal-case text-muted-foreground">
                    (detalhes do imóvel)
                </span>
            </h4>
            <FormRichTextarea
                value={formData.description || ''}
                onChange={(val) => setFormData({ ...formData, description: val })}
                placeholder="Descreva os principais detalhes do imóvel..."
            />
        </div>
    )
}
