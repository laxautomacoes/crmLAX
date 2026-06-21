'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { formatCurrencyBRL } from '@/lib/utils/currency'

interface Field {
    name: string
    label: string
    type: 'text' | 'number' | 'date' | 'boolean'
    crm_binding?: string
}

interface ProposalDynamicFormProps {
    fields: Field[]
    responses: Record<string, string>
    onChange: (name: string, value: string) => void
}

export function ProposalDynamicForm({ fields, responses, onChange }: ProposalDynamicFormProps) {
    if (!fields || fields.length === 0) return null

    const isCurrencyField = (field: Field) => {
        const binding = field.crm_binding || ''
        const label = field.label.toLowerCase()
        const name = field.name.toLowerCase()
        return (
            binding.includes('value') ||
            binding.includes('down_payment') ||
            binding.includes('financing') ||
            binding.includes('price') ||
            label.includes('valor') ||
            label.includes('sinal') ||
            label.includes('entrada') ||
            name.includes('valor')
        )
    }

    const handleInputChange = (field: Field, val: string) => {
        if (isCurrencyField(field)) {
            onChange(field.name, formatCurrencyBRL(val))
        } else {
            onChange(field.name, val)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/30">
            <div className="col-span-1 md:col-span-2">
                <h4 className="text-[10px] font-bold text-accent-icon dark:text-[#FFE600] uppercase tracking-wider mb-2">
                    Dados Específicos da Ficha de Proposta
                </h4>
            </div>

            {fields.map((field) => {
                const value = responses[field.name] || ''
                const isFullWidth = field.type === 'text' && (
                    field.label.toLowerCase().includes('obs') ||
                    field.label.toLowerCase().includes('nota') ||
                    field.label.toLowerCase().includes('condic') ||
                    field.label.toLowerCase().includes('detalhe') ||
                    field.label.toLowerCase().includes('descricao')
                )

                if (isFullWidth) {
                    return (
                        <div key={field.name} className="col-span-1 md:col-span-2">
                            <FormTextarea
                                label={field.label}
                                value={value}
                                onChange={(e) => handleInputChange(field, e.target.value)}
                                placeholder={`Preencha o campo ${field.label.toLowerCase()}...`}
                                rows={2}
                            />
                        </div>
                    )
                }

                return (
                    <div key={field.name} className="col-span-1">
                        <FormInput
                            label={field.label}
                            type={field.type === 'date' ? 'date' : 'text'}
                            value={value}
                            onChange={(e) => handleInputChange(field, e.target.value)}
                            placeholder={isCurrencyField(field) ? '0,00' : `Preencha ${field.label.toLowerCase()}...`}
                        />
                    </div>
                )
            })}
        </div>
    )
}
