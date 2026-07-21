'use client';

import { useState, useEffect } from 'react';
import { getLeadFinancials, invoiceLeadCommission } from '@/app/_actions/leads-finance';
import { getBrokers } from '@/app/_actions/profile';
import { createClient } from '@/lib/supabase/client';
import { getPartners } from '@/app/_actions/partners';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { DollarSign, Loader2, Calendar, Check, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency';

interface Installment {
    id: string;
    valor: number;
    tipo: 'Receita' | 'Despesa';
    categoria: string;
    descricao: string;
    data_transacao: string;
    status: 'pago' | 'pendente';
    profile_id?: string;
    created_at?: string;
    updated_at?: string;
}

interface Broker {
    id: string;
    full_name: string;
}

interface LeadFinanceTabProps {
    leadId: string;
    tenantId: string;
    assignedToId?: string; // Corretor atual do lead para sugerir no repasse
    onSuccess?: () => void;
    isEditing?: boolean;
    onCancelEdit?: () => void;
}

export function LeadFinanceTab({ leadId, tenantId, assignedToId, onSuccess, isEditing, onCancelEdit }: LeadFinanceTabProps) {
    const [financials, setFinancials] = useState<Installment[]>([]);
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [leadData, setLeadData] = useState<any>(null);

    // Formulário de faturamento
    const [saleValue, setSaleValue] = useState('');
    const [commissionRate, setCommissionRate] = useState('6.00'); // Padrão 6%
    const [commissionValue, setCommissionValue] = useState('');
    const [installmentsCount, setInstallmentsCount] = useState('1');
    const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [brokerId, setBrokerId] = useState(assignedToId || '');
    const [brokerRate, setBrokerRate] = useState('30.00'); // Padrão 30% do corretor

    // Parcerias
    const [partners, setPartners] = useState<any[]>([]);
    const [hasPartner, setHasPartner] = useState(false);
    const [partnerId, setPartnerId] = useState('');
    const [partnerRate, setPartnerRate] = useState('50.00'); // Padrão 50%

    // Impostos Individuais
    const [agencyTaxType, setAgencyTaxType] = useState<'percent' | 'fixed'>('percent');
    const [agencyTaxValue, setAgencyTaxValue] = useState('');

    const [brokerTaxType, setBrokerTaxType] = useState<'percent' | 'fixed'>('percent');
    const [brokerTaxValue, setBrokerTaxValue] = useState('');

    const [partnerTaxType, setPartnerTaxType] = useState<'percent' | 'fixed'>('percent');
    const [partnerTaxValue, setPartnerTaxValue] = useState('');

    const loadFinancialData = async () => {
        setLoading(true);
        const supabase = createClient();
        const [finRes, brokerRes, partnerRes, leadRes] = await Promise.all([
            getLeadFinancials(leadId),
            getBrokers(tenantId),
            getPartners(tenantId),
            supabase.from('leads').select('partner_id, partner_split, sale_value, final_commission_rate, property_interest, created_at, last_interaction_at, properties(title, details), proposals(value, status, created_at)').eq('id', leadId).single()
        ]);

        if (partnerRes.success && partnerRes.data) {
            setPartners(partnerRes.data);
        }

        let initialSaleValue = 0;
        let initialCommissionRate = 6.00;

        if (leadRes.data) {
            const lead = leadRes.data;
            setLeadData(lead);
            if (lead.partner_id) {
                setPartnerId(lead.partner_id);
                setHasPartner(true);
            }
            if (lead.partner_split) {
                setPartnerRate(Number(lead.partner_split).toFixed(2));
            }
            
            // Tenta pegar o valor da proposta aprovada ou a mais recente
            let proposedValue = 0;
            if (lead.proposals && lead.proposals.length > 0) {
                const acceptedProposal = lead.proposals.find((p: any) => p.status === 'Aceito' || p.status === 'accepted' || p.status === 'Ganho');
                const proposalToUse = acceptedProposal || [...lead.proposals].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                if (proposalToUse && proposalToUse.value) {
                    proposedValue = Number(proposalToUse.value);
                }
            }

            if (lead.sale_value && Number(lead.sale_value) > 0) {
                initialSaleValue = Number(lead.sale_value);
                setSaleValue(formatCurrencyBRL((initialSaleValue * 100).toString()));
            } else if (proposedValue > 0) {
                initialSaleValue = proposedValue;
                setSaleValue(formatCurrencyBRL((initialSaleValue * 100).toString()));
            }

            if (lead.final_commission_rate) {
                initialCommissionRate = Number(lead.final_commission_rate);
                setCommissionRate(initialCommissionRate.toFixed(2));
            }
        }

        if (finRes.success && finRes.data) {
            const data = finRes.data as Installment[];
            setFinancials(data);
            
            // Se já tiver transações faturadas, preencher os campos do formulário com base nelas
            const receitaTrans = data.filter(t => t.tipo === 'Receita');
            if (receitaTrans.length > 0) {
                const totalComm = receitaTrans.reduce((acc: number, curr) => acc + Number(curr.valor), 0);
                setCommissionValue(formatCurrencyBRL((totalComm * 100).toString()));

                const count = receitaTrans.length;
                setInstallmentsCount(count.toString());
                setFirstDueDate(new Date(receitaTrans[0].data_transacao).toISOString().split('T')[0]);
                
                // Buscar despesas de repasse para estimar o corretor e ignorar o parceiro
                const despesaBroker = data.filter(t => t.categoria === 'Repasse de Comissão');
                const despesaPartner = data.filter(t => t.categoria === 'Repasse de Comissão Parceria');
                
                if (despesaBroker.length > 0) {
                    const totalBroker = despesaBroker.reduce((acc: number, curr) => acc + Number(curr.valor), 0);
                    const totalPartner = despesaPartner.reduce((acc: number, curr) => acc + Number(curr.valor), 0);
                    const baseBrokerComm = totalComm - totalPartner;
                    
                    const rate = baseBrokerComm > 0 ? (totalBroker / baseBrokerComm) * 100 : 30;
                    setBrokerRate(rate.toFixed(2));
                    setBrokerId(despesaBroker[0].profile_id || '');
                }
            } else if (initialSaleValue > 0) {
                const cents = Math.round(initialSaleValue * initialCommissionRate);
                setCommissionValue(formatCurrencyBRL(cents.toString()));
            }
        } else if (initialSaleValue > 0) {
            const cents = Math.round(initialSaleValue * initialCommissionRate);
            setCommissionValue(formatCurrencyBRL(cents.toString()));
        }

        if (brokerRes.success && brokerRes.data) {
            setBrokers(brokerRes.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadFinancialData();
    }, [leadId, tenantId]);

    const handleSaleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = formatCurrencyBRL(e.target.value);
        setSaleValue(val);
        const numSale = parseCurrencyBRL(val);
        const rate = parseFloat(commissionRate) || 0;
        const cents = Math.round(numSale * rate);
        setCommissionValue(formatCurrencyBRL(cents.toString()));
    };

    const handleCommissionRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCommissionRate(val);
        const numSale = parseCurrencyBRL(saleValue);
        const rate = parseFloat(val) || 0;
        const cents = Math.round(numSale * rate);
        setCommissionValue(formatCurrencyBRL(cents.toString()));
    };

    const handleInvoiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!saleValue || parseCurrencyBRL(saleValue) <= 0) {
            toast.error('Informe o valor final de venda.');
            return;
        }

        const commValNum = parseCurrencyBRL(commissionValue);
        if (commValNum <= 0) {
            toast.error('O valor da comissão deve ser maior que zero.');
            return;
        }

        setSaving(true);
        const res = await invoiceLeadCommission(leadId, tenantId, {
            saleValue: parseCurrencyBRL(saleValue),
            commissionRate: parseFloat(commissionRate),
            commissionValue: commValNum,
            installmentsCount: parseInt(installmentsCount),
            firstDueDate,
            brokerId: brokerId || undefined,
            brokerRate: brokerId ? parseFloat(brokerRate) : undefined,
            partnerId: hasPartner && partnerId ? partnerId : undefined,
            partnerRate: hasPartner && partnerId ? parseFloat(partnerRate) : undefined,
            agencyTaxType,
            agencyTaxValue: agencyTaxType === 'percent' ? (parseFloat(agencyTaxValue) || 0) : parseCurrencyBRL(agencyTaxValue),
            brokerTaxType,
            brokerTaxValue: brokerTaxType === 'percent' ? (parseFloat(brokerTaxValue) || 0) : parseCurrencyBRL(brokerTaxValue),
            partnerTaxType,
            partnerTaxValue: partnerTaxType === 'percent' ? (parseFloat(partnerTaxValue) || 0) : parseCurrencyBRL(partnerTaxValue),
        });

        if (res.success) {
            toast.success('Faturamento de comissão gerado no financeiro com sucesso!');
            loadFinancialData();
            if (onSuccess) onSuccess();
        } else {
            toast.error('Erro ao gerar faturamento: ' + res.error);
        }
        setSaving(false);
    };

    // Cálculos em tempo real
    const valVenda = parseCurrencyBRL(saleValue);
    const valComissao = parseCurrencyBRL(commissionValue);
    const taxaComm = parseFloat(commissionRate) || 0;
    
    // TotalComm agora se baseia puramente no valor da comissão preenchido (ou calculado)
    const totalComm = valComissao > 0 ? valComissao : (valVenda * taxaComm) / 100;
    
    // Valor Produção: O valor base invertido a partir da comissão e da taxa
    const valorProducao = (taxaComm > 0 && valComissao > 0) ? (valComissao / (taxaComm / 100)) : 0;

    const numParcelas = parseInt(installmentsCount) || 1;
    const valorParcela = totalComm / numParcelas;

    const taxaPartner = parseFloat(partnerRate) || 0;
    const totalPartnerBruto = hasPartner && partnerId ? (totalComm * taxaPartner) / 100 : 0;

    const taxaBroker = parseFloat(brokerRate) || 0;
    const baseBrokerComm = (hasPartner && partnerId) ? (totalComm - totalPartnerBruto) : totalComm;
    const totalBrokerBruto = brokerId ? (baseBrokerComm * taxaBroker) / 100 : 0;

    const totalAgencyBruto = totalComm - totalBrokerBruto - totalPartnerBruto;

    // Impostos e Valores Líquidos
    const valAgencyTax = agencyTaxType === 'percent' ? (parseFloat(agencyTaxValue) || 0) : parseCurrencyBRL(agencyTaxValue);
    const agencyTaxDeduction = agencyTaxType === 'percent' ? (totalAgencyBruto * valAgencyTax) / 100 : valAgencyTax;
    const totalAgencyNet = totalAgencyBruto - agencyTaxDeduction;

    const valBrokerTax = brokerTaxType === 'percent' ? (parseFloat(brokerTaxValue) || 0) : parseCurrencyBRL(brokerTaxValue);
    const brokerTaxDeduction = brokerTaxType === 'percent' ? (totalBrokerBruto * valBrokerTax) / 100 : valBrokerTax;
    const totalBrokerNet = totalBrokerBruto - brokerTaxDeduction;

    const valPartnerTax = partnerTaxType === 'percent' ? (parseFloat(partnerTaxValue) || 0) : parseCurrencyBRL(partnerTaxValue);
    const partnerTaxDeduction = partnerTaxType === 'percent' ? (totalPartnerBruto * valPartnerTax) / 100 : valPartnerTax;
    const totalPartnerNet = totalPartnerBruto - partnerTaxDeduction;

    const propertyName = leadData?.properties?.title || leadData?.property_interest || 'Imóvel não especificado';
    const details = leadData?.properties?.details || {};
    const apto = details.endereco?.apto || details.apto;
    const vagas = details.vagas;
    const hobbyBox = details.hobby_box_numeracao || (details.hobby_box === 'Sim' ? 'Sim' : details.hobby_box);
    
    const unitParts: string[] = [];
    if (apto) unitParts.push(`Apto ${apto}`);
    if (vagas) unitParts.push(`${vagas} Vaga(s)`);
    if (hobbyBox) unitParts.push(`Hobby Box ${hobbyBox === 'Sim' ? '' : hobbyBox}`.trim());
    const unitInfoString = unitParts.length > 0 ? unitParts.join(' • ') : '—';

    let createdAt = '—';
    let updatedAt = '—';
    if (financials.length > 0) {
        const earliest = [...financials].sort((a, b) => new Date(a.created_at || a.data_transacao).getTime() - new Date(b.created_at || b.data_transacao).getTime())[0];
        const latest = [...financials].sort((a, b) => new Date(b.updated_at || b.created_at || b.data_transacao).getTime() - new Date(a.updated_at || a.created_at || a.data_transacao).getTime())[0];
        
        if (earliest?.created_at) createdAt = new Date(earliest.created_at).toLocaleDateString('pt-BR');
        if (latest?.updated_at) updatedAt = new Date(latest.updated_at).toLocaleDateString('pt-BR');
    }

    const isReadOnly = financials.length > 0 && !isEditing;

    return (
        <div className="space-y-6">
            {/* Grid Principal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Formulário de Cálculo e Emissão */}
                <div className="col-span-1 md:col-span-2 bg-card dark:bg-muted/10 rounded-xl border border-border/40 p-4 space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">
                        {isReadOnly ? 'Faturamento Gerado' : isEditing ? 'Editar Faturamento' : 'Gerar Faturamento'}
                    </h4>
                    
                    <form onSubmit={handleInvoiceSubmit} className="space-y-3.5">
                        <div className="grid grid-cols-2 gap-3">
                            <FormInput
                                label="Valor Venda (R$)"
                                value={saleValue}
                                onChange={handleSaleValueChange}
                                placeholder="0,00"
                                required
                                disabled={isReadOnly}
                            />
                            <FormInput
                                label="Comissão (%)"
                                type="number"
                                value={commissionRate}
                                onChange={handleCommissionRateChange}
                                placeholder="6.00"
                                step="0.01"
                                required
                                disabled={isReadOnly}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <FormInput
                                label="Valor Produção (R$)"
                                value={valorProducao > 0 ? formatCurrencyBRL((valorProducao * 100).toString()) : '0,00'}
                                disabled
                                title="Calculado sobre a porcentagem da comissão e o valor da comissão informados"
                            />
                            <FormInput
                                label="Valor Comissão (R$)"
                                value={commissionValue}
                                onChange={(e) => setCommissionValue(formatCurrencyBRL(e.target.value))}
                                placeholder="0,00"
                                required
                                disabled={isReadOnly}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <FormSelect
                                label="Parcelas"
                                value={installmentsCount}
                                onChange={(e) => setInstallmentsCount(e.target.value)}
                                disabled={isReadOnly}
                                options={[
                                    { value: '1', label: '1x (À vista)' },
                                    { value: '2', label: '2x' },
                                    { value: '3', label: '3x' },
                                    { value: '4', label: '4x' },
                                    { value: '5', label: '5x' },
                                    { value: '6', label: '6x' }
                                ]}
                            />
                            <FormInput
                                label="1º Vencimento"
                                type="date"
                                value={firstDueDate}
                                onChange={(e) => setFirstDueDate(e.target.value)}
                                required
                                disabled={isReadOnly}
                            />
                        </div>

                        {/* Desconto NF Imobiliária */}
                        <div className="grid grid-cols-2 gap-3">
                            <FormSelect
                                label="Desconto NF Admin"
                                value={agencyTaxType}
                                onChange={(e) => setAgencyTaxType(e.target.value as 'percent' | 'fixed')}
                                disabled={isReadOnly}
                                options={[
                                    { value: 'percent', label: 'Porcentagem (%)' },
                                    { value: 'fixed', label: 'Valor Fixo (R$)' }
                                ]}
                            />
                            <FormInput
                                label={`Valor do Desconto (${agencyTaxType === 'percent' ? '%' : 'R$'})`}
                                type={agencyTaxType === 'percent' ? 'number' : 'text'}
                                step={agencyTaxType === 'percent' ? '0.01' : undefined}
                                value={agencyTaxValue}
                                onChange={(e) => setAgencyTaxValue(agencyTaxType === 'percent' ? e.target.value : formatCurrencyBRL(e.target.value))}
                                placeholder={agencyTaxType === 'percent' ? '6.00' : '0,00'}
                                disabled={isReadOnly}
                            />
                        </div>

                        <div className="border-t border-dashed border-border/40 pt-3 grid grid-cols-2 gap-3">
                            <FormSelect
                                label="Corretor"
                                value={brokerId}
                                onChange={(e) => setBrokerId(e.target.value)}
                                disabled={isReadOnly}
                                options={[
                                    { value: '', label: 'Nenhum' },
                                    ...brokers.map(b => ({ value: b.id, label: b.full_name }))
                                ]}
                            />
                            <FormInput
                                label="Comissão (%)"
                                type="number"
                                value={brokerRate}
                                disabled={!brokerId || isReadOnly}
                                onChange={(e) => setBrokerRate(e.target.value)}
                                placeholder="30.00"
                                step="0.1"
                            />
                        </div>
                        
                        {/* Desconto NF Corretor */}
                        {brokerId && (
                            <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                <FormSelect
                                    label="Desconto NF Corretor"
                                    value={brokerTaxType}
                                    onChange={(e) => setBrokerTaxType(e.target.value as 'percent' | 'fixed')}
                                    disabled={isReadOnly}
                                    options={[
                                        { value: 'percent', label: 'Porcentagem (%)' },
                                        { value: 'fixed', label: 'Valor Fixo (R$)' }
                                    ]}
                                />
                                <FormInput
                                    label={`Valor do Desconto (${brokerTaxType === 'percent' ? '%' : 'R$'})`}
                                    type={brokerTaxType === 'percent' ? 'number' : 'text'}
                                    step={brokerTaxType === 'percent' ? '0.01' : undefined}
                                    value={brokerTaxValue}
                                    onChange={(e) => setBrokerTaxValue(brokerTaxType === 'percent' ? e.target.value : formatCurrencyBRL(e.target.value))}
                                    placeholder={brokerTaxType === 'percent' ? '6.00' : '0,00'}
                                    disabled={isReadOnly}
                                />
                            </div>
                        )}

                        {/* Parceria Comercial */}
                        <div className="border-t border-dashed border-border/40 pt-3 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="hasPartnerCheckbox"
                                checked={hasPartner}
                                onChange={(e) => setHasPartner(e.target.checked)}
                                disabled={isReadOnly}
                                className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary cursor-pointer disabled:opacity-50"
                            />
                            <label htmlFor="hasPartnerCheckbox" className="text-xs font-bold text-foreground cursor-pointer select-none">
                                Adicionar Repasse Parceria
                            </label>
                        </div>

                        {hasPartner && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                                    <FormSelect
                                        label="Parceiro Comercial"
                                        value={partnerId}
                                        onChange={(e) => setPartnerId(e.target.value)}
                                        disabled={isReadOnly}
                                        options={[
                                            { value: '', label: 'Selecione um parceiro' },
                                            ...partners.map(p => ({ 
                                                value: p.id, 
                                                label: p.company ? `${p.name} (${p.company})` : p.name 
                                            }))
                                        ]}
                                    />
                                    <FormInput
                                        label="Comissão Parceria (%)"
                                        type="number"
                                        value={partnerRate}
                                        onChange={(e) => setPartnerRate(e.target.value)}
                                        placeholder="50.00"
                                        step="0.1"
                                        required={hasPartner}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                {partnerId && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                        <FormSelect
                                            label="Desconto NF Parceiro"
                                            value={partnerTaxType}
                                            onChange={(e) => setPartnerTaxType(e.target.value as 'percent' | 'fixed')}
                                            disabled={isReadOnly}
                                            options={[
                                                { value: 'percent', label: 'Porcentagem (%)' },
                                                { value: 'fixed', label: 'Valor Fixo (R$)' }
                                            ]}
                                        />
                                        <FormInput
                                            label={`Valor do Desconto (${partnerTaxType === 'percent' ? '%' : 'R$'})`}
                                            type={partnerTaxType === 'percent' ? 'number' : 'text'}
                                            step={partnerTaxType === 'percent' ? '0.01' : undefined}
                                            value={partnerTaxValue}
                                            onChange={(e) => setPartnerTaxValue(partnerTaxType === 'percent' ? e.target.value : formatCurrencyBRL(e.target.value))}
                                            placeholder={partnerTaxType === 'percent' ? '6.00' : '0,00'}
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
 
                        {!isReadOnly && (
                            <div className="flex gap-3 mt-4">
                                {isEditing && onCancelEdit && (
                                    <button
                                        type="button"
                                        onClick={onCancelEdit}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-xs font-bold bg-muted text-foreground hover:bg-muted/90 rounded-lg shadow-sm transition-all border border-border"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={saving || valVenda <= 0}
                                    className={`${isEditing ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all disabled:opacity-50`}
                                >
                                    {saving ? (
                                        <><Loader2 size={14} className="animate-spin" /> Processando...</>
                                    ) : (
                                        <>{isEditing ? 'Atualizar Faturamento' : 'Faturar Venda'}</>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Resumo da Transação */}
                <div className="col-span-1 bg-card dark:bg-muted/10 rounded-xl border border-border/40 p-4 space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Resumo Financeiro</h4>
                        <div className="space-y-3.5 text-xs">
                        <div className="bg-background dark:bg-muted/10 rounded-xl p-3.5 border border-border/40 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Comissão Total</p>
                                <p className="text-base font-black text-foreground mt-0.5">
                                    R$ {totalComm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                                    {numParcelas}x de R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <ArrowUpRight className="text-emerald-500 shrink-0" size={24} />
                        </div>
                        <div className="bg-background dark:bg-muted/10 rounded-xl p-3.5 border border-border/40 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Comissão Imobiliária</p>
                                <p className="text-base font-black text-foreground mt-0.5">
                                    R$ {totalAgencyNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                                    Bruto: R$ {totalAgencyBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {agencyTaxDeduction > 0 && `| NF: -R$ ${agencyTaxDeduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                </p>
                            </div>
                            <ArrowUpRight className="text-emerald-500 shrink-0" size={24} />
                        </div>
 
                        {brokerId && (
                            <div className="bg-background dark:bg-muted/10 rounded-xl p-3.5 border border-border/40 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Comissão Corretor</p>
                                    <p className="text-base font-black text-foreground mt-0.5">
                                        R$ {totalBrokerNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                                        Bruto: R$ {totalBrokerBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {brokerTaxDeduction > 0 && `| NF: -R$ ${brokerTaxDeduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    </p>
                                </div>
                                <ArrowDownRight className="text-red-500 shrink-0" size={24} />
                            </div>
                        )}

                        {hasPartner && partnerId && (
                            <div className="bg-background dark:bg-muted/10 rounded-xl p-3.5 border border-border/40 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Comissão Parceiro</p>
                                    <p className="text-base font-black text-foreground mt-0.5">
                                        R$ {totalPartnerNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                                        Bruto: R$ {totalPartnerBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {partnerTaxDeduction > 0 && `| NF: -R$ ${partnerTaxDeduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    </p>
                                </div>
                                <ArrowDownRight className="text-red-500 shrink-0" size={24} />
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Listagem das Parcelas Lançadas */}
            <div className="bg-card dark:bg-muted/10 rounded-xl border border-border/40 p-4 space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Fluxo de Caixa Lançado</h4>
                
                {loading ? (
                    <div className="flex justify-center items-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                    </div>
                ) : financials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-1.5">
                        <DollarSign size={20} className="opacity-40" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">Nenhum faturamento lançado</p>
                        <p className="text-[9px] max-w-[220px]">Os lançamentos financeiros parcelados aparecerão aqui assim que a venda for faturada acima.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-border/20 text-muted-foreground font-bold uppercase tracking-wider">
                                    <th className="py-2.5 px-3 text-center">Vencimento</th>
                                    <th className="py-2.5 px-3 text-center">Descrição</th>
                                    <th className="py-2.5 px-3 text-center">Tipo</th>
                                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Valor (R$)</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {financials.map((f) => (
                                    <tr key={f.id} className="hover:bg-muted/30">
                                        <td className="py-2.5 px-3 font-medium text-muted-foreground text-center">
                                            {new Date(f.data_transacao).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="py-2.5 px-3 font-semibold text-foreground text-center">{f.descricao}</td>
                                        <td className="py-2.5 px-3 font-bold text-center">
                                            <span className={f.tipo === 'Receita' ? 'text-emerald-600' : 'text-red-600'}>
                                                {f.tipo}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 font-black text-foreground text-center">
                                            {Number(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                f.status === 'pago' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
                                            }`}>
                                                {f.status === 'pago' ? 'Pago' : 'Pendente'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
// HMR Trigger
}
