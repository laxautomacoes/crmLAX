'use client'

import { History } from 'lucide-react';

interface UsageRecord {
    id: string;
    created_at: string;
    model: string;
    total_tokens: number;
    feature_context: string;
    tenants?: { name: string } | null;
}

interface Props {
    records: UsageRecord[];
    isSuperadmin: boolean;
}

export function AIUsageTable({ records, isSuperadmin }: Props) {
    const formatDate = (dateStr: string) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateStr));
    };

    const getContextLabel = (context: string) => {
        const labels: Record<string, string> = {
            'lead_analysis': 'Analytic',
            'property_copy': 'Copywriter',
            'lead_matching': 'Matching',
            'market_analysis': 'Market Insight'
        };
        return labels[context] || context;
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-indigo-500 rounded-full" />
                    <h3 className="text-lg font-semibold text-slate-900 font-outfit">Logs de Atividade</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">ÚLTIMAS 50 OPERAÇÕES</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/30">
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Timestamp</th>
                            {isSuperadmin && (
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Origem (Tenant)</th>
                            )}
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Modelo</th>
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Contexto</th>
                            <th className="px-8 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Tokens</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {records.map((record) => (
                            <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">
                                    {formatDate(record.created_at)}
                                </td>
                                {isSuperadmin && (
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-900">
                                                {record.tenants?.name || 'Sistema'}
                                            </span>
                                        </div>
                                    </td>
                                )}
                                <td className="px-8 py-5">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${
                                        record.model.toLowerCase().includes('gpt') 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                    }`}>
                                        {record.model}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-sm text-slate-500 font-medium">
                                        {getContextLabel(record.feature_context)}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <span className="text-sm tabular-nums font-bold text-slate-900">
                                        {record.total_tokens?.toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {records.length === 0 && (
                <div className="p-20 text-center space-y-2">
                    <p className="text-slate-900 font-semibold uppercase tracking-widest text-[10px]">Silêncio Neural</p>
                    <p className="text-slate-400 text-sm">Nenhuma atividade de IA registrada no momento.</p>
                </div>
            )}
        </div>
    );
}
