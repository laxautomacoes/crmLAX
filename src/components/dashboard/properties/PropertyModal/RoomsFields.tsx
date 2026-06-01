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
    has_elevadores: boolean
    numero_elevadores: string
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
                Dormitórios e Vagas
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 py-2 ml-1 items-center">
                <FormCheckbox
                    label="Sacada com churrasqueira"
                    checked={formData.details.has_sacada_com_churrasqueira}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_sacada_com_churrasqueira: e.target.checked } })}
                />
                <FormCheckbox
                    label="Sacada sem churrasqueira"
                    checked={formData.details.has_sacada_sem_churrasqueira}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_sacada_sem_churrasqueira: e.target.checked } })}
                />
                <div className="lg:justify-self-center lg:-translate-x-6">
                    <FormCheckbox
                        label="Lavabo"
                        checked={formData.details.has_lavabo}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_lavabo: e.target.checked } })}
                    />
                </div>
                <div className="lg:justify-self-center lg:-translate-x-6">
                    <FormCheckbox
                        label="Escritório"
                        checked={formData.details.has_escritorio}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_escritorio: e.target.checked } })}
                    />
                </div>
                <FormCheckbox
                    label="Dependência empregada"
                    checked={formData.details.has_dependencia_empregada}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_dependencia_empregada: e.target.checked } })}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-x-3 gap-y-6 pt-2">
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
                        label="Numeração Vagas"
                        type="text"
                        value={formData.details.vagas_numeracao}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas_numeracao: e.target.value } })}
                        placeholder="Ex: 12A, 12B"
                    />
                </div>
                <div className="sm:col-span-3">
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

export function EstruturaCustosFields<T extends FormWithRoomsDetails>({ formData, setFormData, isEmpreendimento }: RoomsFieldsProps<T>) {
    return (
        <div className="space-y-4">
            <h4 className="text-base font-black text-foreground uppercase tracking-widest mb-4">
                Estrutura
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-x-3 gap-y-6">
                {!isEmpreendimento && (
                    <>
                        <div className="lg:col-span-2">
                            <FormInput
                                label="Número de Torre | Bloco"
                                type="text"
                                value={formData.details.torre_bloco}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, torre_bloco: e.target.value } })}
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <FormInput
                                label="Nome Torre | Bloco"
                                type="text"
                                value={formData.details.nome_torre_bloco}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, nome_torre_bloco: e.target.value } })}
                            />
                        </div>
                    </>
                )}

                <div className="flex items-center justify-center pt-6 ml-1">
                    <FormCheckbox
                        label="Elevadores"
                        checked={formData.details.has_elevadores}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, has_elevadores: e.target.checked } })}
                    />
                </div>
                <div className="lg:col-span-2">
                    <FormInput
                        label="Número de elevadores"
                        type="number"
                        disabled={!formData.details.has_elevadores}
                        value={formData.details.numero_elevadores}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, numero_elevadores: e.target.value } })}
                    />
                </div>
            </div>
        </div>
    )
}
