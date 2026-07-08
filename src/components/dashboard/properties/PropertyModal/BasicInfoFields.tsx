'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { Switch } from '@/components/ui/Switch'
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency'
import { propertyTypeOptions } from '@/utils/property-translations'

interface BasicInfoFieldsProps {
    formData: any
    setFormData: (data: any) => void
    userRole?: string
    brokers?: any[]
    currentProfile?: any
    imagesChildren?: React.ReactNode
    detailsChildren?: React.ReactNode
}

function calculateMonthsRemaining(previsaoEntrega: string): string {
    if (!previsaoEntrega) return ''
    const [year, month] = previsaoEntrega.split('-').map(Number)
    if (!year || !month) return ''
    
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    const totalMonths = (year - currentYear) * 12 + (month - currentMonth)
    
    if (totalMonths < 0) {
        const absMonths = Math.abs(totalMonths)
        return `Entregue há ${absMonths} ${absMonths === 1 ? 'mês' : 'meses'}`
    }
    
    if (totalMonths === 0) {
        return 'Entregue este mês'
    }
    
    return `${totalMonths} ${totalMonths === 1 ? 'mês' : 'meses'}`
}

export function BasicInfoFields({ 
    formData, 
    setFormData, 
    userRole, 
    brokers = [], 
    currentProfile,
    imagesChildren,
    detailsChildren
}: BasicInfoFieldsProps) {
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

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value
        const formatted = formatCurrencyBRL(rawValue)
        
        let novoValorProp = formData.details.valor_proprietario || ''
        let novaComissaoR$ = formData.details.valor_comissao || ''
        let novaComissaoPerc = formData.commission_rate || ''

        const p = parseCurrencyBRL(formatted)
        const comPerc = parseFloat((formData.commission_rate || '').toString().replace(',', '.'))
        const comVal = parseCurrencyBRL(formData.details.valor_comissao || '0')
        const vp = parseCurrencyBRL(formData.details.valor_proprietario || '0')
        
        if (!isNaN(p) && p > 0) {
            if (!isNaN(comPerc) && comPerc > 0) {
                // Preço mudou, mas Comissão % é fixa.
                // P = VP * (1 + C_Perc / 100)  =>  VP = P / (1 + C_Perc / 100)
                const calculatedVp = p / (1 + comPerc / 100)
                const vc = p - calculatedVp
                novaComissaoR$ = formatCurrencyBRL(Math.round(vc * 100).toString())
                novoValorProp = formatCurrencyBRL(Math.round(calculatedVp * 100).toString())
            } else if (!isNaN(comVal) && comVal > 0) {
                const calculatedVp = p - comVal
                if (calculatedVp > 0) {
                    const calculatedPerc = (comVal / calculatedVp) * 100
                    novaComissaoPerc = calculatedPerc.toFixed(2).replace('.', ',')
                    novoValorProp = formatCurrencyBRL(Math.round(calculatedVp * 100).toString())
                }
            } else if (!isNaN(vp) && vp > 0 && p > vp) {
                const vc = p - vp
                const calculatedPerc = (vc / vp) * 100
                novaComissaoPerc = calculatedPerc.toFixed(2).replace('.', ',')
                novaComissaoR$ = formatCurrencyBRL(Math.round(vc * 100).toString())
            }
        }

        setFormData({ 
            ...formData, 
            price: formatted,
            commission_rate: novaComissaoPerc,
            details: { ...formData.details, valor_proprietario: novoValorProp, valor_comissao: novaComissaoR$ }
        })
    }

    const handleCommissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value
        const formatted = rawValue.replace(/[^0-9,]/g, '')
        
        let novoPreco = formData.price || ''
        let novoValorProp = formData.details.valor_proprietario || ''
        let novaComissaoR$ = formData.details.valor_comissao || ''

        const comPerc = parseFloat(formatted.replace(',', '.'))
        const p = parseCurrencyBRL(formData.price || '0')
        const vp = parseCurrencyBRL(formData.details.valor_proprietario || '0')
        
        if (!isNaN(comPerc) && comPerc > 0) {
            if (!isNaN(vp) && vp > 0) {
                // Se temos Valor Proprietário, mantemos ele fixo e alteramos o Preço (prioridade na lógica de Markup)
                const vc = vp * (comPerc / 100)
                const calculatedP = vp + vc
                novoPreco = formatCurrencyBRL(Math.round(calculatedP * 100).toString())
                novaComissaoR$ = formatCurrencyBRL(Math.round(vc * 100).toString())
            } else if (!isNaN(p) && p > 0) {
                // Se não temos VP, mas temos Preço
                const calculatedVp = p / (1 + comPerc / 100)
                const vc = p - calculatedVp
                novaComissaoR$ = formatCurrencyBRL(Math.round(vc * 100).toString())
                novoValorProp = formatCurrencyBRL(Math.round(calculatedVp * 100).toString())
            }
        } else if (formatted === '' || comPerc === 0) {
            if (!isNaN(p) && p > 0) novoValorProp = formData.price
            novaComissaoR$ = ''
        }

        setFormData({ 
            ...formData, 
            price: novoPreco,
            commission_rate: formatted,
            details: { ...formData.details, valor_proprietario: novoValorProp, valor_comissao: novaComissaoR$ }
        })
    }

    const handleValorComissaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value
        const formatted = formatCurrencyBRL(rawValue)

        let novaComissaoPerc = formData.commission_rate || ''
        let novoPreco = formData.price || ''
        let novoValorProp = formData.details.valor_proprietario || ''

        const comVal = parseCurrencyBRL(formatted)
        const p = parseCurrencyBRL(formData.price || '0')
        const vp = parseCurrencyBRL(formData.details.valor_proprietario || '0')

        if (!isNaN(comVal) && comVal > 0) {
            if (!isNaN(vp) && vp > 0) {
                const calculatedP = vp + comVal
                const perc = (comVal / vp) * 100
                novoPreco = formatCurrencyBRL(Math.round(calculatedP * 100).toString())
                novaComissaoPerc = perc.toFixed(2).replace('.', ',')
            } else if (!isNaN(p) && p > comVal) {
                const calculatedVp = p - comVal
                const perc = (comVal / calculatedVp) * 100
                novaComissaoPerc = perc.toFixed(2).replace('.', ',')
                novoValorProp = formatCurrencyBRL(Math.round(calculatedVp * 100).toString())
            }
        }

        setFormData({
            ...formData,
            price: novoPreco,
            commission_rate: novaComissaoPerc,
            details: { ...formData.details, valor_proprietario: novoValorProp, valor_comissao: formatted }
        })
    }

    const handleValorProprietarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value
        const formatted = formatCurrencyBRL(rawValue)
        
        let novaComissaoPerc = formData.commission_rate || ''
        let novoPreco = formData.price || ''
        let novaComissaoR$ = formData.details.valor_comissao || ''

        const vp = parseCurrencyBRL(formatted)
        const comPerc = parseFloat((formData.commission_rate || '').toString().replace(',', '.'))
        const comVal = parseCurrencyBRL(formData.details.valor_comissao || '0')
        const p = parseCurrencyBRL(formData.price || '0')
        
        if (!isNaN(vp) && vp > 0) {
            if (!isNaN(comPerc) && comPerc > 0) {
                const vc = vp * (comPerc / 100)
                const calculatedP = vp + vc
                novoPreco = formatCurrencyBRL(Math.round(calculatedP * 100).toString())
                novaComissaoR$ = formatCurrencyBRL(Math.round(vc * 100).toString())
            } else if (!isNaN(comVal) && comVal > 0) {
                const calculatedP = vp + comVal
                const calculatedPerc = (comVal / vp) * 100
                novoPreco = formatCurrencyBRL(Math.round(calculatedP * 100).toString())
                novaComissaoPerc = calculatedPerc.toFixed(2).replace('.', ',')
            } else if (!isNaN(p) && p > vp) {
                const vc = p - vp
                const calculatedPerc = (vc / vp) * 100
                novaComissaoPerc = calculatedPerc.toFixed(2).replace('.', ',')
                novaComissaoR$ = formatCurrencyBRL(Math.round(vc * 100).toString())
            }
        }

        setFormData({ 
            ...formData, 
            price: novoPreco,
            commission_rate: novaComissaoPerc,
            details: { ...formData.details, valor_proprietario: formatted, valor_comissao: novaComissaoR$ }
        })
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                        {isEmpreendimento ? 'Empreendimento' : 'Imóvel'}
                    </h4>
                    <div className="flex items-center gap-4">
                        <Switch
                            checked={isEmpreendimento}
                            onChange={toggleEmpreendimento}
                            label="Empreendimento"
                        />
                        {isAdmin && (
                            <Switch
                                checked={formData.is_published || false}
                                onChange={(checked) => setFormData({ ...formData, is_published: checked })}
                                label="SITE"
                            />
                        )}
                        {isAdmin && (
                            <Switch
                                checked={formData.is_featured || false}
                                onChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                                label="DESTAQUE"
                            />
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-6 items-end">
                    <div className="sm:col-span-2">
                        <FormInput
                            label="Nome"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder={isEmpreendimento ? 'Ex: WOA SKY Towers' : 'Ex: Apartamento 3 suítes Beira Mar'}
                        />
                    </div>
                    {isAdmin && brokers.length > 0 ? (
                        <div>
                            <FormSelect
                                label="Responsável"
                                value={formData.created_by || 'all'}
                                onChange={(e) => setFormData({ ...formData, created_by: e.target.value === 'all' ? null : e.target.value })}
                                options={[
                                    { value: 'all', label: 'Todos' },
                                    ...brokers.map(broker => ({ value: broker.id, label: broker.full_name }))
                                ]}
                            />
                        </div>
                    ) : (
                        currentProfile?.full_name && (
                            <div>
                                <FormInput
                                    label="Responsável"
                                    value={currentProfile.full_name}
                                    onChange={() => {}}
                                    readOnly
                                />
                            </div>
                        )
                    )}
                </div>
                {!isEmpreendimento && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-x-3 gap-y-6 mt-4 items-end">
                        <div className="grid grid-cols-2 gap-3">
                            <FormInput
                                label="Apartamento"
                                value={formData.details?.endereco?.apto || ''}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, apto: e.target.value } } })}
                                placeholder="Apto"
                            />
                            <FormInput
                                label="Nº Torre"
                                value={formData.details?.torre_bloco || ''}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, torre_bloco: e.target.value } })}
                                placeholder="Nº"
                            />
                        </div>
                        <FormInput
                            label="Nome Torre"
                            value={formData.details?.nome_torre_bloco || ''}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, nome_torre_bloco: e.target.value } })}
                            placeholder="Nome"
                        />
                        <FormInput
                            label="Idade (anos)"
                            type="number"
                            value={formData.details.idade_imovel || ''}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, idade_imovel: e.target.value } })}
                            placeholder="Ex: 5"
                        />
                    </div>
                )}
                {imagesChildren && (
                    <div className="pt-2">
                        {imagesChildren}
                    </div>
                )}
            </div>

            {/* Campos extras de empreendimento */}
            {isEmpreendimento && (
                <div className="space-y-4 border-t border-border/60 pt-6">
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                        Dados do Empreendimento
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-6">
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
                        <FormInput
                            label="Tempo para Entrega"
                            value={calculateMonthsRemaining(formData.details.empreendimento?.previsao_entrega || '')}
                            onChange={() => {}}
                            readOnly
                            placeholder="Preencha a previsão"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-6">
                        <FormInput
                            label="Condomínio (R$)"
                            value={formData.details.valor_condominio}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, valor_condominio: formatCurrencyBRL(e.target.value) } })}
                            placeholder="0,00"
                        />
                        <FormInput
                            label="IPTU (R$)"
                            value={formData.details.valor_iptu}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, valor_iptu: formatCurrencyBRL(e.target.value) } })}
                            placeholder="0,00"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-6">
                        <FormSelect
                            label="Tipo"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            options={propertyTypeOptions}
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
                                    { value: 'Em Proposta', label: 'Em Proposta' },
                                    { value: 'Vendido', label: 'Vendido' },
                                    { value: 'Reservado', label: 'Reservado' },
                                    { value: 'Suspenso', label: 'Suspenso' }
                                ]}
                            />
                        )}
                    </div>
                </div>
            )}

            {isEmpreendimento && detailsChildren}

            {!isEmpreendimento && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-6 mb-6">
                        <FormInput
                            label="Preço (R$)"
                            value={formData.price}
                            onChange={handlePriceChange}
                            placeholder="0,00"
                        />
                        <FormInput
                            label="Condomínio (R$)"
                            value={formData.details.valor_condominio}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, valor_condominio: formatCurrencyBRL(e.target.value) } })}
                            placeholder="0,00"
                        />
                        <FormInput
                            label="IPTU (R$)"
                            value={formData.details.valor_iptu}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, valor_iptu: formatCurrencyBRL(e.target.value) } })}
                            placeholder="0,00"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-6 mb-6">
                        <FormInput
                            label="Comissão (%)"
                            value={formData.commission_rate || ''}
                            onChange={handleCommissionChange}
                            placeholder="Ex: 6"
                        />
                        <FormInput
                            label="Comissão (R$)"
                            value={formData.details.valor_comissao || ''}
                            onChange={handleValorComissaoChange}
                            placeholder="0,00"
                        />
                        <FormInput
                            label="Valor Proprietário (R$)"
                            value={formData.details.valor_proprietario || ''}
                            onChange={handleValorProprietarioChange}
                            placeholder="0,00"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-6">
                        <FormSelect
                            label="Tipo"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            options={propertyTypeOptions}
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
                                    { value: 'Em Proposta', label: 'Em Proposta' },
                                    { value: 'Vendido', label: 'Vendido' },
                                    { value: 'Reservado', label: 'Reservado' },
                                    { value: 'Suspenso', label: 'Suspenso' }
                                ]}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
