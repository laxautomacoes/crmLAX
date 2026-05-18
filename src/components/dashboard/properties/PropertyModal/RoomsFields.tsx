'use client'

import type { Dispatch, SetStateAction } from 'react'
import { FormInput } from '@/components/shared/forms/FormInput'

/** Campos de `details` usados apenas neste bloco (o formulário completo pode ter mais chaves). */
interface RoomsDetailsSlice {
    quartos: string
    suites: string
    banheiros: string
    vagas: string
    vagas_numeracao: string
    torre_bloco: string
    valor_condominio: string
    valor_iptu: string
    obs_dormitorios: string
}

type FormWithRoomsDetails = { details: RoomsDetailsSlice }

interface RoomsFieldsProps<T extends FormWithRoomsDetails> {
    formData: T
    setFormData: Dispatch<SetStateAction<T>>
    isEmpreendimento?: boolean
}

export function RoomsFields<T extends FormWithRoomsDetails>({ formData, setFormData, isEmpreendimento }: RoomsFieldsProps<T>) {
    return (
        <div className="space-y-8">
            {/* Dormitórios e Vagas - só aparece quando NÃO é empreendimento (pois tipologias já cobrem isso) */}
            {!isEmpreendimento && (
                <div className="space-y-4">
                    <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">
                        Dormitórios e Vagas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6">
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
                        <FormInput
                            label="Vagas"
                            type="number"
                            value={formData.details.vagas}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas: e.target.value } })}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-6 pt-2">
                        <FormInput
                            label="Numeração Vagas"
                            type="text"
                            value={formData.details.vagas_numeracao}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas_numeracao: e.target.value } })}
                            placeholder="Ex: 12A, 12B"
                        />
                        <FormInput
                            label="Obs. Dormitórios"
                            type="text"
                            value={formData.details.obs_dormitorios}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, obs_dormitorios: e.target.value } })}
                            placeholder="Ex: 1 suíte + 2 demi-suítes"
                        />
                    </div>
                </div>
            )}

            <div className="border-t border-border/40 my-2" />

            <div className="space-y-4">
                <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">
                    Estrutura e Custos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6">
                    {!isEmpreendimento && (
                        <div className="sm:col-span-2 lg:col-span-2">
                            <FormInput
                                label="Torre/Bloco"
                                type="text"
                                value={formData.details.torre_bloco}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, torre_bloco: e.target.value } })}
                            />
                        </div>
                    )}
                    <FormInput
                        label="Condomínio (R$)"
                        type="number"
                        value={formData.details.valor_condominio}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, valor_condominio: e.target.value } })}
                    />
                    <FormInput
                        label="IPTU (R$)"
                        type="number"
                        value={formData.details.valor_iptu}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, valor_iptu: e.target.value } })}
                    />
                </div>
            </div>
        </div>
    )
}
