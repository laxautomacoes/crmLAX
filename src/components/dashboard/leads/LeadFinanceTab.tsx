'use client';

import { useState, useEffect } from 'react';
import { getLeadFinancials, invoiceLeadCommission } from '@/app/_actions/leads-finance';
import { getBrokers } from '@/app/_actions/profile';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { DollarSign, Loader2, Calendar, Check, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

interface Installment {
    id: string;
    valor: number;
    tipo: 'Receita' | 'Despesa';
    categoria: string;
    descricao: string;
    data_transacao: string;
    status: 'pago' | 'pendente';
    profile_id?: string;
}

interface Broker {
    id: string;
    full_name: string;
}

interface LeadFinanceTabProps {
    leadId: string;
    tenantId: string;
    assignedToId?: string; // Corretor atual do lead para sugerir no repasse
}

export function LeadFinanceTab({ leadId, tenantId, assignedToId }: LeadFinanceTabProps) {
    const [financials, setFinancials] = useState<Installment[]>([]);
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Formulário de faturamento
    const [saleValue, setSaleValue] = useState('');
    const [commissionRate, setCommissionRate] = useState('6.00'); // Padrão 6%
    const [installmentsCount, setInstallmentsCount] = useState('1');
    const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [brokerId, setBrokerId] = useState(assignedToId || '');
    const [brokerRate, setBrokerRate] = useState('30.00'); // Padrão 30% do corretor

    const loadFinancialData = async () => {
        setLoading(true);
        const [finRes, brokerRes] = await Promise.all([
            getLeadFinancials(leadId),
            getBrokers(tenantId)
        ]);

        if (finRes.success && finRes.data) {
            const data = finRes.data as Installment[];
            setFinancials(data);
            
            // Se já tiver transações faturadas, preencher os campos do formulário com base nelas
            const receitaTrans = data.filter(t => t.tipo === 'Receita');
            if (receitaTrans.length > 0) {
                const totalComm = receitaTrans.reduce((acc: number, curr) => acc + Number(curr.valor), 0);
                const count = receitaTrans.length;
                setInstallmentsCount(count.toString());
                setFirstDueDate(new Date(receitaTrans[0].data_transacao).toISOString().split('T')[0]);
                
                // Buscar despesas de repasse para estimar o broker
                const despesaTrans = data.filter(t => t.tipo === 'Despesa');
                if (despesaTrans.length > 0) {
                    const totalBroker = despesaTrans.reduce((acc: number, curr) => acc + Number(curr.valor), 0);
                    const rate = totalComm > 0 ? (totalBroker / totalComm) * 100 : 30;
                    setBrokerRate(rate.toFixed(2));
                    setBrokerId(despesaTrans[0].profile_id || '');
                }
            }
        }

        if (brokerRes.success && brokerRes.data) {
            setBrokers(brokerRes.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadFinancialData();
    }, [leadId, tenantId]);

    const handleInvoiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!saleValue || parseFloat(saleValue) <= 0) {
            toast.error('Informe o valor final de venda.');
            return;
        }

        setSaving(true);
        const res = await invoiceLeadCommission(leadId, tenantId, {
            saleValue: parseFloat(saleValue),
            commissionRate: parseFloat(commissionRate),
            installmentsCount: parseInt(installmentsCount),
            firstDueDate,
            brokerId: brokerId || undefined,
            brokerRate: brokerId ? parseFloat(brokerRate) : undefined
        });

        if (res.success) {
            toast.success('Faturamento de comissão gerado no financeiro com sucesso!');
            loadFinancialData();
        } else {
            toast.error('Erro ao gerar faturamento: ' + res.error);
        }
        setSaving(false);
    };

    // Cálculos em tempo real
    const valVenda = parseFloat(saleValue) || 0;
    const taxaComm = parseFloat(commissionRate) || 0;
    const totalComm = (valVenda * taxaComm) / 100;
    const numParcelas = parseInt(installmentsCount) || 1;
    const valorParcela = totalComm / numParcelas;

    const taxaBroker = parseFloat(brokerRate) || 0;
    const totalBroker = brokerId ? (totalComm * taxaBroker) / 100 : 0;
    const valorParcelaBroker = brokerId ? totalBroker / numParcelas : 0;

    return (
        <div className="space-y-6">
            {/* Grid Principal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Formulário de Cálculo e Emissão */}
                <div className="col-span-1 md:col-span-2 bg-card dark:bg-muted/10 rounded-xl border border-border/40 p-4 space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Gerar Faturamento</h4>
                    
                    <form onSubmit={handleInvoiceSubmit} className="space-y-3.5">
                        <div className="grid grid-cols-2 gap-3">
                            <FormInput
                                label="Valor da Venda (R$)"
                                type="number"
                                value={saleValue}
                                onChange={(e) => setSaleValue(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                            <FormInput
                                label="Comissão (%)"
                                type="number"
                                value={commissionRate}
                                onChange={(e) => setCommissionRate(e.target.value)}
                                placeholder="6.00"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <FormSelect
                                label="Parcelas"
                                value={installmentsCount}
                                onChange={(e) => setInstallmentsCount(e.target.value)}
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
                            />
                        </div>

                        <div className="border-t border-dashed border-border/40 pt-3 grid grid-cols-2 gap-3">
                            <FormSelect
                                label="Repassar para Corretor"
                                value={brokerId}
                                onChange={(e) => setBrokerId(e.target.value)}
                                options={[
                                    { value: '', label: 'Nenhum' },
                                    ...brokers.map(b => ({ value: b.id, label: b.full_name }))
                                ]}
                            />
                            <FormInput
                                label="Percentual do Repasse (%)"
                                type="number"
                                value={brokerRate}
                                disabled={!brokerId}
                                onChange={(e) => setBrokerRate(e.target.value)}
                                placeholder="30.00"
                                step="0.1"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving || valVenda <= 0}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all disabled:opacity-50 mt-4"
                        >
                            {saving ? (
                                <><Loader2 size={14} className="animate-spin" /> Processando...</>
                            ) : (
                                <><DollarSign size={14} /> Faturar Venda no Financeiro</>
                            )}
                        </button>
                    </form>
                </div>

                {/* Resumo da Transação */}
                <div className="col-span-1 bg-card dark:bg-muted/10 rounded-xl border border-border/40 p-4 space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Resumo Financeiro</h4>
                        <div className="space-y-3.5 text-xs">
                        <div className="bg-muted/30 dark:bg-muted/10 rounded-xl p-3.5 border border-border/40 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Comissão Imobiliária</p>
                                <p className="text-base font-black text-foreground mt-0.5">
                                    R$ {totalComm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                                    {numParcelas}x de R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <ArrowUpRight className="text-emerald-500 shrink-0" size={24} />
                        </div>
 
                        {brokerId && (
                            <div className="bg-muted/30 dark:bg-muted/10 rounded-xl p-3.5 border border-border/40 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Repasse Corretor</p>
                                    <p className="text-base font-black text-foreground mt-0.5">
                                        R$ {totalBroker.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                                        {numParcelas}x de R$ {valorParcelaBroker.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <ArrowDownRight className="text-red-500 shrink-0" size={24} />
                            </div>
                        )}
 
                        <div className="pt-2 flex justify-between font-bold text-foreground border-t border-border/40">
                            <span>Margem Imobiliária:</span>
                            <span>R$ {(totalComm - totalBroker).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
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
                                    <th className="py-2.5 px-3">Vencimento</th>
                                    <th className="py-2.5 px-3">Descrição</th>
                                    <th className="py-2.5 px-3">Tipo</th>
                                    <th className="py-2.5 px-3 text-right">Valor</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {financials.map((f) => (
                                    <tr key={f.id} className="hover:bg-muted/30">
                                        <td className="py-2.5 px-3 font-medium text-muted-foreground">
                                            {new Date(f.data_transacao).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="py-2.5 px-3 font-semibold text-foreground">{f.descricao}</td>
                                        <td className="py-2.5 px-3 font-bold">
                                            <span className={f.tipo === 'Receita' ? 'text-emerald-600' : 'text-red-600'}>
                                                {f.tipo}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-black text-foreground">
                                            R$ {Number(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
