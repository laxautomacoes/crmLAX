'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'

interface OwnerFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

export function OwnerFields({ formData, setFormData }: OwnerFieldsProps) {
    return (
        <div className="col-span-2 pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Proprietário</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                    <FormInput
                        label="Nome"
                        value={formData.details.proprietario.nome}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, nome: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Telefone/WhatsApp"
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
            </div>
        </div>
    )
}
