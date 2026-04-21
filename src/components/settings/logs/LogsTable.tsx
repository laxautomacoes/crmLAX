'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSystemLogs } from '@/app/_actions/logs';
import { getBrokers } from '@/app/_actions/profile';
import { PageHeader } from '@/components/shared/PageHeader';
import { LogsFilters } from './components/LogsFilters';
import { LogsList } from './components/LogsList';

interface LogsTableProps {
    tenantId: string;
    isGlobal?: boolean;
}

export function LogsTable({ tenantId, isGlobal = false }: LogsTableProps) {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [actionType, setActionType] = useState('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isUserFilterOpen, setIsUserFilterOpen] = useState(false);
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
    const [profileId, setProfileId] = useState('all');
    const [brokers, setBrokers] = useState<any[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    useEffect(() => {
        async function loadBrokers() {
            const result = await getBrokers(tenantId);
            if (result.success && result.data) setBrokers(result.data);
        }
        loadBrokers();
    }, [tenantId]);

    const actionTypes = [
        { value: 'all', label: 'Filtrar' },
        { value: 'create_lead', label: 'Novo Lead' },
        { value: 'update_lead', label: 'Lead Atualizado' },
        { value: 'delete_lead', label: 'Lead Excluído' },
        { value: 'archive_lead', label: 'Lead Arquivado' },
        { value: 'create_property', label: 'Novo Imóvel' },
        { value: 'update_property', label: 'Imóvel Atualizado' },
        { value: 'send_invitation', label: 'Convite Enviado' },
        { value: 'accept_invitation', label: 'Convite Aceito' },
    ];

    const fetchLogs = async () => {
        setLoading(true);
        const result = await getSystemLogs({
            page,
            actionType: actionType === 'all' ? undefined : actionType,
            profileId: profileId === 'all' ? undefined : profileId,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            isGlobal
        });

        if (result.success) {
            setLogs(result.data || []);
            setTotalPages(result.totalPages || 1);
            setTotalCount(result.totalCount || 0);
        }
        setLoading(false);
    };

    useEffect(() => { fetchLogs(); }, [page, actionType, profileId, startDate, endDate]);
    
    const getActionBadge = (action: string) => {
        const base = "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ";
        if (action.startsWith('create')) return base + "bg-green-100 text-green-700";
        if (action.startsWith('update')) return base + "bg-blue-100 text-blue-700";
        if (action.startsWith('delete')) return base + "bg-red-100 text-red-700";
        if (action.startsWith('archive')) return base + "bg-gray-100 text-gray-700";
        return base + "bg-yellow-100 text-yellow-700";
    };

    const getActionLabel = (action: string) => {
        const found = actionTypes.find(t => t.value === action);
        return found ? found.label : action.replace(/_/g, ' ');
    };

    const exportToCSV = () => {
        if (logs.length === 0) return;
        const headers = ["Usuário", "Ação", "Entidade", "Tipo Entidade", "Data", "Detalhes"];
        const rows = logs.map(log => [
            log.profiles?.full_name || 'Sistema', getActionLabel(log.action),
            log.entity_id || '', log.entity_type,
            format(new Date(log.created_at), "dd/MM/yyyy HH:mm"),
            JSON.stringify(log.details).replace(/"/g, '""')
        ]);
        const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `logs-crmlax-${format(new Date(), "yyyy-MM-dd")}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Logs do Sistema">
                <LogsFilters 
                    totalCount={totalCount} exportToCSV={exportToCSV} loading={loading} logs={logs}
                    isDateFilterOpen={isDateFilterOpen} setIsDateFilterOpen={setIsDateFilterOpen}
                    startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} setPage={setPage}
                    isUserFilterOpen={isUserFilterOpen} setIsUserFilterOpen={setIsUserFilterOpen}
                    profileId={profileId} setProfileId={setProfileId} brokers={brokers}
                    isFilterOpen={isFilterOpen} setIsFilterOpen={setIsFilterOpen}
                    actionType={actionType} setActionType={setActionType} actionTypes={actionTypes}
                />
            </PageHeader>

            <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider">Usuário</th>
                                {isGlobal && (
                                    <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider">Empresa</th>
                                )}
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider">Ação</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider">Entidade</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider">Data/Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <LogsList logs={logs} loading={loading} getActionBadge={getActionBadge} getActionLabel={getActionLabel} isGlobal={isGlobal} />
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 flex items-center justify-between border-t border-gray-100 dark:border-white/10">
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-none">Página {page} de {totalPages}</div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="p-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-white disabled:opacity-50 transition-all shadow-sm">
                                <ChevronLeft className="w-4 h-4 text-foreground" />
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="p-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-white disabled:opacity-50 transition-all shadow-sm">
                                <ChevronRight className="w-4 h-4 text-foreground" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
