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
        const digitsOnly = formattedCep.replace(/\D/g, '')

        // Se o CEP for apagado ou alterado (menos de 8 dígitos), limpa os campos de endereço
        if (digitsOnly.length < 8) {
            setFormData({
                ...formData,
                details: {
                    ...formData.details,
                    endereco: {
                        ...formData.details.endereco,
                        cep: formattedCep,
                        rua: '',
                        bairro: '',
                        cidade: '',
                        estado: '',
                        complemento: '',
                        numero: ''
                    }
                }
            })
        } else {
            setFormData({
                ...formData,
                details: {
                    ...formData.details,
                    endereco: { ...formData.details.endereco, cep: formattedCep }
                }
            })
        }

        if (digitsOnly.length === 8) {
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
                    label={
                        <div className="flex items-center gap-1">
                            CEP <span className="text-[9px] lowercase font-normal opacity-70">(digite para buscar endereço)</span>
                        </div>
                    }
                    type="text"
                    value={formData.details.endereco.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    disabled={loading}
                />
                <div className="sm:col-span-2 lg:col-span-2">
                    <FormInput
                        label="Avenida | Rua"
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
                    label="Complemento"
                    type="text"
                    value={formData.details.endereco.complemento}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, complemento: e.target.value } } })}
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
                    maxLength={2}
                />
            </div>
        </div>
    )
}
