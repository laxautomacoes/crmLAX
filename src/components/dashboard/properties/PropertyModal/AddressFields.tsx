'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { fetchAddressByCep, formatCEP } from '@/lib/utils/cep'
import { useState } from 'react'

interface AddressFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

export function AddressFields({ formData, setFormData }: AddressFieldsProps) {
    const [loading, setLoading] = useState(false)

    const handleCepChange = async (cep: string) => {
        const formattedCep = formatCEP(cep)
        setFormData({
            ...formData,
            details: {
                ...formData.details,
                endereco: { ...formData.details.endereco, cep: formattedCep }
            }
        })

        if (formattedCep.replace(/\D/g, '').length === 8) {
            setLoading(true)
            try {
                const address = await fetchAddressByCep(formattedCep)
                if (address) {
                    setFormData((prev: any) => ({
                        ...prev,
                        details: {
                            ...prev.details,
                            endereco: {
                                ...prev.details.endereco,
                                rua: address.logradouro || prev.details.endereco.rua,
                                bairro: address.bairro || prev.details.endereco.bairro,
                                cidade: address.localidade || prev.details.endereco.cidade,
                                estado: address.uf || prev.details.endereco.estado,
                                cep: formattedCep
                            }
                        }
                    }))
                }
            } finally {
                setLoading(false)
            }
        }
    }

    return (
        <div className="pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Endereço</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormInput
                    label="CEP"
                    type="text"
                    value={formData.details.endereco.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    disabled={loading}
                />
                <div className="sm:col-span-2 lg:col-span-2">
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
                    label="Estado"
                    type="text"
                    value={formData.details.endereco.estado || ''}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, estado: e.target.value } } })}
                    placeholder="UF"
                    maxLength={2}
                />
            </div>
        </div>
    )
}
