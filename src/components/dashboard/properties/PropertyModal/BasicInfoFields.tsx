'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { Building2, Home } from 'lucide-react'

interface BasicInfoFieldsProps {
    formData: any
    setFormData: (data: any) => void
    userRole?: string
    brokers?: any[]
    currentProfile?: any
}

export function BasicInfoFields({ formData, setFormData, userRole, brokers = [], currentProfile }: BasicInfoFieldsProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'
    const isEmpreendimento = formData.details?.is_empreendimento || false

    const toggleEmpreendimento = () => {
        setFormData({
            ...formData,
            details: {
                ...formData.details,
                is_empreendimento: !isEmpreendimento
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                        <Home size={14} className="text-foreground" />
                        {isEmpreendimento ? 'Empreendimento' : 'Imóvel'}
                        <span className="ml-1 text-[10px] font-normal italic normal-case text-muted-foreground">
                            ({isEmpreendimento ? 'nome do empreendimento' : 'título do imóvel'})
                        </span>
                    </h4>
                    <button
                        type="button"
                        onClick={toggleEmpreendimento}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${
                            isEmpreendimento
                                ? 'bg-secondary text-secondary-foreground border-secondary shadow-sm'
                                : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50'
                        }`}
                    >
                        Empreendimento
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-x-3 gap-y-6">
                    <FormInput
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder={isEmpreendimento ? 'Ex: WOA SKY Towers' : 'Ex: Apartamento 3 suítes Beira Mar'}
                    />
                </div>
            </div>

            {/* Campos extras de empreendimento */}
            {isEmpreendimento && (
                <div className="space-y-4 p-4 rounded-xl bg-foreground/5 border border-border/40">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                        <Building2 size={12} />
                        Dados do Empreendimento
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-6">
                        <FormInput
                            label="Construtora / Incorporadora"
                            value={formData.details.empreendimento?.construtora || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                details: {
                                    ...formData.details,
                                    empreendimento: {
                                        ...formData.details.empreendimento,
                                        construtora: e.target.value
                                    }
                                }
                            })}
                            placeholder="Ex: WOA Empreendimentos"
                        />
                        <FormInput
                            label="Previsão de Entrega"
                            type="month"
                            value={formData.details.empreendimento?.previsao_entrega || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                details: {
                                    ...formData.details,
                                    empreendimento: {
                                        ...formData.details.empreendimento,
                                        previsao_entrega: e.target.value
                                    }
                                }
                            })}
                        />
                    </div>
                </div>
            )}


            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-6 pt-4">
                {!isEmpreendimento && (
                    <FormInput
                        label="Preço (R$)"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-6">
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

                {isAdmin && (
                    <FormSelect
                        label="Status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        options={[
                            { value: 'Pending', label: 'Pendente' },
                            { value: 'Available', label: 'Disponível' },
                            { value: 'Vendido', label: 'Vendido' },
                            { value: 'Reservado', label: 'Reservado' },
                            { value: 'Suspenso', label: 'Suspenso' }
                        ]}
                    />
                )}
            </div>
        </div>
    )
}
