'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { BedDouble, Building2, DollarSign } from 'lucide-react'

interface RoomsFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

export function RoomsFields({ formData, setFormData }: RoomsFieldsProps) {
    return (
        <div className="space-y-6 pt-2">
            <div className="space-y-4">
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <BedDouble size={14} className="text-foreground" />
                    Cômodos e Vagas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4">
                    <FormInput
                        label="Dormitórios"
                        type="number"
                        value={formData.details.quartos}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, quartos: e.target.value } })}
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
                    <FormInput
                        label="Numeração Vagas"
                        type="text"
                        value={formData.details.vagas_numeracao}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas_numeracao: e.target.value } })}
                        placeholder="Ex: 12A, 12B"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={14} className="text-foreground" />
                    Estrutura e Custos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4">
                    <div className="sm:col-span-2 lg:col-span-2">
                        <FormInput
                            label="Torre/Bloco"
                            type="text"
                            value={formData.details.torre_bloco}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, torre_bloco: e.target.value } })}
                        />
                    </div>
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
