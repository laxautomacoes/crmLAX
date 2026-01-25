'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'

interface BasicInfoFieldsProps {
    formData: any
    setFormData: (data: any) => void
    userRole?: string
}

export function BasicInfoFields({ formData, setFormData, userRole }: BasicInfoFieldsProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'

    return (
        <div className="space-y-4">
            <FormInput
                label="Imóvel | Empreendimento *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Apartamento 3 suítes Beira Mar"
            />

            <FormTextarea
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva os principais detalhes do imóvel..."
                rows={4}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4">
                <FormInput
                    label="Preço (R$)"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />

                <FormSelect
                    label="Tipo"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    options={[
                        { value: 'house', label: 'Casa' },
                        { value: 'apartment', label: 'Apartamento' },
                        { value: 'land', label: 'Terreno' },
                        { value: 'commercial', label: 'Comercial' },
                        { value: 'penthouse', label: 'Cobertura' },
                        { value: 'studio', label: 'Studio' },
                        { value: 'rural', label: 'Rural' },
                        { value: 'warehouse', label: 'Galpão' },
                        { value: 'office', label: 'Sala/Escritório' },
                        { value: 'store', label: 'Loja' }
                    ]}
                />

                <FormSelect
                    label="Situação"
                    value={formData.details.situacao}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, situacao: e.target.value } })}
                    options={[
                        { value: 'lançamento', label: 'Lançamento' },
                        { value: 'em construção', label: 'Em construção' },
                        { value: 'novo', label: 'Novo' },
                        { value: 'revenda', label: 'Revenda' }
                    ]}
                />

                <FormSelect
                    label="Status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    options={[
                        { value: 'Disponível', label: 'Disponível' },
                        { value: 'Vendido', label: 'Vendido' },
                        { value: 'Reservado', label: 'Reservado' },
                        { value: 'Suspenso', label: 'Suspenso' }
                    ]}
                />

                <div className="sm:col-span-2 lg:col-span-2">
                    <FormSelect
                        label="Aprovação"
                        value={formData.approval_status}
                        onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                        disabled={!isAdmin}
                        options={[
                            { value: 'pending', label: 'Pendente' },
                            { value: 'approved', label: 'Aprovado' },
                            { value: 'rejected', label: 'Rejeitado' }
                        ]}
                    />
                </div>
            </div>
        </div>
    )
}
