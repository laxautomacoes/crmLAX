'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { Switch } from '@/components/ui/Switch'
import { formatCurrencyBRL } from '@/lib/utils/currency'

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
                <div className="flex gap-3 items-end">
                    <div className="flex-1 min-w-0">
                        <FormInput
                            label="Nome"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder={isEmpreendimento ? 'Ex: WOA SKY Towers' : 'Ex: Apartamento 3 suítes Beira Mar'}
                        />
                    </div>
                    {!isEmpreendimento && (
                        <div className="w-[100px] shrink-0">
                            <FormInput
                                label="Apartamento"
                                value={formData.details?.endereco?.apto || ''}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, apto: e.target.value } } })}
                                placeholder="Apto"
                            />
                        </div>
                    )}
                    {isAdmin && brokers.length > 0 ? (
                        <div className="shrink-0 min-w-[180px]">
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
                            <div className="shrink-0 min-w-[140px]">
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
            )}

            {isEmpreendimento && detailsChildren}

            {!isEmpreendimento && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6">
                        <FormInput
                            label="Preço (R$)"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: formatCurrencyBRL(e.target.value) })}
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
                        <FormInput
                            label="Idade do Imóvel (anos)"
                            type="number"
                            value={formData.details.idade_imovel || ''}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, idade_imovel: e.target.value } })}
                            placeholder="Ex: 5"
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
                </>
            )}
        </div>
    )
}
