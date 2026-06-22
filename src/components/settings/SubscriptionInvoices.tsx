'use client';

import { useEffect, useState } from 'react';
import { getTenantInvoices } from '@/app/_actions/invoice';
import { Loader2, ExternalLink, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Invoice {
    id: string;
    gateway: string;
    gateway_invoice_id: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    paid_at: string | null;
    invoice_url: string | null;
}

export function SubscriptionInvoices() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const { invoices: data, error } = await getTenantInvoices();
                if (data) {
                    setInvoices(data as Invoice[]);
                }
            } catch (error) {
                console.error("Erro ao carregar faturas", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatPaymentMethod = (method: string) => {
        if (!method) return '-';
        if (method.includes('card') || method === 'credit_card') return 'Cartão de Crédito';
        if (method.includes('pix')) return 'Pix';
        if (method.includes('boleto')) return 'Boleto';
        return method;
    };

    const formatStatus = (status: string) => {
        if (status === 'paid') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">Pago</span>;
        if (status === 'pending') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">Pendente</span>;
        if (status === 'failed') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">Falhou</span>;
        return <span className="text-muted-foreground">{status}</span>;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
        );
    }

    if (invoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-xl border border-muted-foreground/30 shadow-sm">
                <FileText className="w-10 h-10 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-foreground">Nenhuma fatura encontrada</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                    Suas próximas faturas pagas aparecerão aqui automaticamente.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto bg-card rounded-xl border border-muted-foreground/30 shadow-sm">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                <thead className="bg-gray-200 dark:bg-muted/50 border-b border-muted-foreground/30">
                    <tr>
                        <th className="px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider text-left">Fatura</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider text-left">Data do Pagamento</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider text-center">Meio de Pagamento</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider text-right">Valor</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider text-center">Status</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-foreground uppercase tracking-wider text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-muted-foreground/30 text-sm">
                    {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-5 text-foreground font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                {invoice.gateway_invoice_id.substring(0, 15)}...
                            </td>
                            <td className="px-4 py-5 text-muted-foreground">
                                {invoice.paid_at ? format(new Date(invoice.paid_at), "dd 'de' MMM, yyyy", { locale: ptBR }) : '-'}
                            </td>
                            <td className="px-4 py-5 text-muted-foreground text-center">
                                {formatPaymentMethod(invoice.payment_method)}
                            </td>
                            <td className="px-4 py-5 text-foreground font-bold text-right">
                                {formatCurrency(invoice.amount)}
                            </td>
                            <td className="px-4 py-5 text-center">
                                {formatStatus(invoice.status)}
                            </td>
                            <td className="px-4 py-5 text-right">
                                {invoice.invoice_url ? (
                                    <a 
                                        href={invoice.invoice_url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                                    >
                                        Recibo <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="px-4 py-3 bg-muted/20 border-t border-muted-foreground/30 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Mostrando {invoices.length} {invoices.length === 1 ? 'fatura' : 'faturas'}</p>
            </div>
        </div>
    );
}
