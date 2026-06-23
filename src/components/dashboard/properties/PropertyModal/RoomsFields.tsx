'use client'

import type { Dispatch, SetStateAction } from 'react'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { FormInput } from '@/components/shared/forms/FormInput'


/** Campos de `details` usados apenas nestes blocos (o formulário completo pode ter mais chaves). */
interface RoomsDetailsSlice {
    quartos: string
    suites: string
    banheiros: string
    vagas: string
    vagas_numeracao: string
    torre_bloco: string
    nome_torre_bloco: string
    valor_condominio: string
    valor_iptu: string
    obs_dormitorios: string
    has_sacada_com_churrasqueira: boolean
    has_sacada_sem_churrasqueira: boolean
    has_lavabo: boolean
    has_escritorio: boolean
    has_dependencia_empregada: boolean
    has_despensa: boolean
    has_elevadores: boolean
    numero_elevadores: string
    hobby_box?: string
    hobby_box_numeracao?: string
}

type FormWithRoomsDetails = { details: RoomsDetailsSlice }

interface RoomsFieldsProps<T extends FormWithRoomsDetails> {
    formData: T
    setFormData: Dispatch<SetStateAction<T>>
    isEmpreendimento?: boolean
}

export function DormitoriosVagasFields<T extends FormWithRoomsDetails>({ formData, setFormData, isEmpreendimento }: RoomsFieldsProps<T>) {
    if (isEmpreendimento) return null

    return (
        <div className="space-y-4">
            <h4 className="text-base font-black text-foreground uppercase tracking-widest mb-4">
                Especificações
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-6">
                <FormInput
                    label="Dormitórios"
                    type="number"
                    value={formData.details.quartos}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, quartos: e.target.value } })}
                />
                <FormInput
                    label="Suítes"
                    type="number"
                    value={formData.details.suites}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, suites: e.target.value } })}
                />
                <FormInput
                    label="Banheiros"
                    type="number"
                    value={formData.details.banheiros}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, banheiros: e.target.value } })}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <FormCheckbox
                    label="Dependência empregada"
                    checked={formData.details.has_dependencia_empregada}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_dependencia_empregada: e.target.checked } })}
                />
                <FormCheckbox
                    label="Despensa"
                    checked={formData.details.has_despensa}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_despensa: e.target.checked } })}
                />
                <FormCheckbox
                    label="Escritório"
                    checked={formData.details.has_escritorio}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_escritorio: e.target.checked } })}
                />
                <FormCheckbox
                    label="Lavabo"
                    checked={formData.details.has_lavabo}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_lavabo: e.target.checked } })}
                />
                <FormCheckbox
                    label="Sacada"
                    checked={formData.details.has_sacada_sem_churrasqueira}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_sacada_sem_churrasqueira: e.target.checked } })}
                />
                <FormCheckbox
                    label="Sacada com churrasqueira"
                    checked={formData.details.has_sacada_com_churrasqueira}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_sacada_com_churrasqueira: e.target.checked } })}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-8 gap-x-3 gap-y-6 pt-2">
                <div className="sm:col-span-1">
                    <FormInput
                        label="Vagas"
                        type="number"
                        value={formData.details.vagas}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas: e.target.value } })}
                    />
                </div>
                <div className="sm:col-span-1">
                    <FormInput
                        label="Numeração"
                        type="text"
                        value={formData.details.vagas_numeracao}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas_numeracao: e.target.value } })}
                        placeholder="Ex: 12A, 12B"
                    />
                </div>
                <div className="sm:col-span-1">
                    <FormInput
                        label="Hobby box"
                        type="number"
                        value={formData.details.hobby_box || ''}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, hobby_box: e.target.value } })}
                    />
                </div>
                <div className="sm:col-span-1">
                    <FormInput
                        label="Numeração"
                        type="text"
                        value={formData.details.hobby_box_numeracao || ''}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, hobby_box_numeracao: e.target.value } })}
                        placeholder="Ex: 01, 02"
                    />
                </div>
                <div className="sm:col-span-4">
                    <FormInput
                        label="Observações"
                        type="text"
                        value={formData.details.obs_dormitorios}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, obs_dormitorios: e.target.value } })}
                        placeholder="Ex: sol da manhã, vista livre"
                    />
                </div>
            </div>

        </div>
    )
}
