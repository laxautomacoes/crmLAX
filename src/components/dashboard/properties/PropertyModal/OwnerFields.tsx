'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { fetchAddressByCep, formatCEP } from '@/lib/utils/cep'
import { useState } from 'react'

interface OwnerFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

export function OwnerFields({ formData, setFormData }: OwnerFieldsProps) {
    const [cepLoading, setCepLoading] = useState(false)

    const handleCepChange = async (cep: string) => {
        const formattedCep = formatCEP(cep)
        const digitsOnly = formattedCep.replace(/\D/g, '')

        // Se o CEP for apagado ou alterado (menos de 8 dígitos), limpa os campos de endereço
        if (digitsOnly.length < 8) {
            setFormData({
                ...formData,
                details: {
                    ...formData.details,
                    proprietario: {
                        ...formData.details.proprietario,
                        endereco_cep: formattedCep,
                        endereco_rua: '',
                        endereco_bairro: '',
                        endereco_cidade: '',
                        endereco_estado: '',
                        endereco_complemento: '',
                        endereco_numero: ''
                    }
                }
            })
        } else {
            setFormData({
                ...formData,
                details: {
                    ...formData.details,
                    proprietario: { ...formData.details.proprietario, endereco_cep: formattedCep }
                }
            })
        }

        if (digitsOnly.length === 8) {
            setCepLoading(true)
            try {
                const address = await fetchAddressByCep(formattedCep)
                if (address) {
                    setFormData((prev: any) => ({
                        ...prev,
                        details: {
                            ...prev.details,
                            proprietario: {
                                ...prev.details.proprietario,
                                endereco_rua: address.logradouro || prev.details.proprietario.endereco_rua,
                                endereco_bairro: address.bairro || prev.details.proprietario.endereco_bairro,
                                endereco_cidade: address.localidade || prev.details.proprietario.endereco_cidade,
                                endereco_estado: address.uf || prev.details.proprietario.endereco_estado,
                                endereco_cep: formattedCep
                            }
                        }
                    }))
                }
            } finally {
                setCepLoading(false)
            }
        }
    }

    return (
        <div className="pt-2">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                <User size={14} className="text-foreground" />
                Proprietário | Construtora
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-2">
                    <FormInput
                        label="Nome"
                        value={formData.details.proprietario.nome}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, nome: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Responsável"
                        value={formData.details.proprietario.responsavel}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, responsavel: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Telefone | WhatsApp"
                        value={formData.details.proprietario.telefone}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, telefone: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Email"
                        type="email"
                        value={formData.details.proprietario.email}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, email: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="CPF"
                        value={formData.details.proprietario.cpf}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, cpf: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormSelect
                        label="Estado Civil"
                        value={formData.details.proprietario.estado_civil}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, estado_civil: e.target.value } } })}
                        options={[
                            { value: '', label: 'Selecione...' },
                            { value: 'solteiro', label: 'Solteiro(a)' },
                            { value: 'casado', label: 'Casado(a)' },
                            { value: 'divorciado', label: 'Divorciado(a)' },
                            { value: 'viuvo', label: 'Viúvo(a)' },
                            { value: 'uniao_estavel', label: 'União Estável' }
                        ]}
                    />
                </div>
                <div>
                    <FormInput
                        label="Data Nascimento"
                        type="date"
                        value={formData.details.proprietario.data_nascimento}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, data_nascimento: e.target.value } } })}
                    />
                </div>

                <div className="lg:col-start-1">
                    <FormInput
                        label={
                            <div className="flex items-center gap-1">
                                CEP <span className="text-[9px] lowercase font-normal opacity-70">(digite para buscar endereço)</span>
                            </div>
                        }
                        value={formData.details.proprietario.endereco_cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        disabled={cepLoading}
                    />
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                    <FormInput
                        label="Avenida | Rua"
                        value={formData.details.proprietario.endereco_rua}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_rua: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="nº"
                        value={formData.details.proprietario.endereco_numero}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_numero: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Complemento"
                        value={formData.details.proprietario.endereco_complemento}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_complemento: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Bairro"
                        value={formData.details.proprietario.endereco_bairro}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_bairro: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Cidade"
                        value={formData.details.proprietario.endereco_cidade}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_cidade: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Estado"
                        value={formData.details.proprietario.endereco_estado}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_estado: e.target.value } } })}
                        maxLength={2}
                    />
                </div>
            </div>
        </div>
    )
}
