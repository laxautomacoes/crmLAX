'use client'

import { FormInput } from '@/components/shared/forms/FormInput'

interface AddressFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

export function AddressFields({ formData, setFormData }: AddressFieldsProps) {
    return (
        <div className="col-span-2 pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Endereço</h4>
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <FormInput
                        label="Rua"
                        type="text"
                        value={formData.details.endereco.rua}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, rua: e.target.value } } })}
                    />
                </div>
                <FormInput
                    label="Nº"
                    type="text"
                    value={formData.details.endereco.numero}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, numero: e.target.value } } })}
                />
                <FormInput
                    label="Bairro"
                    type="text"
                    value={formData.details.endereco.bairro}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, bairro: e.target.value } } })}
                />
                <FormInput
                    label="Cidade"
                    type="text"
                    value={formData.details.endereco.cidade}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, cidade: e.target.value } } })}
                />
                <FormInput
                    label="CEP"
                    type="text"
                    value={formData.details.endereco.cep}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, cep: e.target.value } } })}
                />
            </div>
        </div>
    )
}
