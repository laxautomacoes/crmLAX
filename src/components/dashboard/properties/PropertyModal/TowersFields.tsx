'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { Building2, Plus, Trash2, Layers } from 'lucide-react'

interface TowersFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

function getEmptyTipologia() {
    return {
        tipo: 'apartment',
        dormitorios: '',
        suites: '',
        area_privativa: '',
        vagas: '',
        preco_a_partir: '',
        unidades_por_andar: ''
    }
}

function getEmptyTorre(index: number) {
    return {
        nome: `Torre ${index + 1}`,
        tipologias: [getEmptyTipologia()]
    }
}

export function TowersFields({ formData, setFormData }: TowersFieldsProps) {
    const torres = formData.details.empreendimento?.torres || []

    const updateTorres = (newTorres: typeof torres) => {
        setFormData({
            ...formData,
            details: {
                ...formData.details,
                empreendimento: {
                    ...formData.details.empreendimento,
                    torres: newTorres
                }
            }
        })
    }

    const addTorre = () => {
        updateTorres([...torres, getEmptyTorre(torres.length)])
    }

    const removeTorre = (torreIndex: number) => {
        updateTorres(torres.filter((_: any, i: number) => i !== torreIndex))
    }

    const updateTorre = (torreIndex: number, field: string, value: string) => {
        const updated = [...torres]
        updated[torreIndex] = { ...updated[torreIndex], [field]: value }
        updateTorres(updated)
    }

    const addTipologia = (torreIndex: number) => {
        const updated = [...torres]
        updated[torreIndex] = {
            ...updated[torreIndex],
            tipologias: [...updated[torreIndex].tipologias, getEmptyTipologia()]
        }
        updateTorres(updated)
    }

    const removeTipologia = (torreIndex: number, tipIndex: number) => {
        const updated = [...torres]
        updated[torreIndex] = {
            ...updated[torreIndex],
            tipologias: updated[torreIndex].tipologias.filter((_: any, i: number) => i !== tipIndex)
        }
        updateTorres(updated)
    }

    const updateTipologia = (torreIndex: number, tipIndex: number, field: string, value: string) => {
        const updated = [...torres]
        const tipologias = [...updated[torreIndex].tipologias]
        tipologias[tipIndex] = { ...tipologias[tipIndex], [field]: value }
        updated[torreIndex] = { ...updated[torreIndex], tipologias }
        updateTorres(updated)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={14} />
                    Torres e Tipologias
                </h4>
                <button
                    type="button"
                    onClick={addTorre}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-secondary text-secondary-foreground hover:opacity-90 transition-all shadow-sm"
                >
                    <Plus size={14} />
                    Torre
                </button>
            </div>

            {torres.length === 0 && (
                <button
                    type="button"
                    onClick={addTorre}
                    className="w-full flex flex-col items-center justify-center gap-2 p-8 rounded-xl bg-foreground/5 border border-dashed border-border/60 hover:bg-foreground/10 transition-all cursor-pointer text-muted-foreground"
                >
                    <Building2 size={24} />
                    <span className="text-sm font-medium">Clique para adicionar a primeira torre</span>
                </button>
            )}

            {torres.map((torre: any, torreIndex: number) => (
                <div key={torreIndex} className="rounded-xl border border-border/60 overflow-hidden">
                    {/* Torre Header */}
                    <div className="flex items-center justify-between gap-3 p-4 bg-foreground/5 border-b border-border/40">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground font-black text-sm shadow-sm">
                                {torreIndex + 1}
                            </div>
                            <FormInput
                                value={torre.nome}
                                onChange={(e) => updateTorre(torreIndex, 'nome', e.target.value)}
                                placeholder="Nome da Torre"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => removeTorre(torreIndex)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            title="Remover torre"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    {/* Tipologias */}
                    <div className="p-4 space-y-4">
                        {torre.tipologias?.map((tip: any, tipIndex: number) => (
                            <div key={tipIndex} className="space-y-4 p-4 rounded-xl bg-foreground/5 border border-border/30 relative">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <Layers size={12} />
                                        Tipologia {tipIndex + 1}
                                    </span>
                                    {torre.tipologias.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeTipologia(torreIndex, tipIndex)}
                                            className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                            title="Remover tipologia"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-4">
                                    <FormSelect
                                        label="Tipo"
                                        value={tip.tipo}
                                        onChange={(e) => updateTipologia(torreIndex, tipIndex, 'tipo', e.target.value)}
                                        options={[
                                            { value: 'apartment', label: 'Apartamento' },
                                            { value: 'penthouse', label: 'Cobertura' },
                                            { value: 'studio', label: 'Studio' },
                                            { value: 'house', label: 'Casa' },
                                            { value: 'commercial', label: 'Comercial' }
                                        ]}
                                    />
                                    <FormInput
                                        label="Dormitórios"
                                        type="number"
                                        value={tip.dormitorios}
                                        onChange={(e) => updateTipologia(torreIndex, tipIndex, 'dormitorios', e.target.value)}
                                    />
                                    <FormInput
                                        label="Suítes"
                                        type="number"
                                        value={tip.suites}
                                        onChange={(e) => updateTipologia(torreIndex, tipIndex, 'suites', e.target.value)}
                                    />
                                    <FormInput
                                        label="Área Priv. (m²)"
                                        type="number"
                                        value={tip.area_privativa}
                                        onChange={(e) => updateTipologia(torreIndex, tipIndex, 'area_privativa', e.target.value)}
                                    />
                                    <FormInput
                                        label="Vagas"
                                        type="number"
                                        value={tip.vagas}
                                        onChange={(e) => updateTipologia(torreIndex, tipIndex, 'vagas', e.target.value)}
                                    />
                                    <FormInput
                                        label="Preço a partir (R$)"
                                        type="number"
                                        value={tip.preco_a_partir}
                                        onChange={(e) => updateTipologia(torreIndex, tipIndex, 'preco_a_partir', e.target.value)}
                                    />
                                    <FormInput
                                        label="Unidades/Andar"
                                        type="number"
                                        value={tip.unidades_por_andar}
                                        onChange={(e) => updateTipologia(torreIndex, tipIndex, 'unidades_por_andar', e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => addTipologia(torreIndex)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-muted-foreground border border-dashed border-border/60 hover:bg-foreground/5 hover:text-foreground transition-all"
                        >
                            <Plus size={14} />
                            Tipologia
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}
