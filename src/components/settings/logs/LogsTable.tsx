'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
    Search, 
    Filter, 
    User as UserIcon, 
    Clock, 
    Eye, 
    ChevronLeft, 
    ChevronRight,
    Activity,
    Calendar
} from 'lucide-react';
import { getSystemLogs } from '@/app/_actions/logs';
import { getBrokers } from '@/app/_actions/profile';

interface LogsTableProps {
    tenantId: string;
}

export function LogsTable({ tenantId }: LogsTableProps) {
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
    
    // Carregar corretores/usuários para o filtro
    useEffect(() => {
        async function loadBrokers() {
            const result = await getBrokers(tenantId);
            if (result.success && result.data) {
                setBrokers(result.data);
            }
        }
        loadBrokers();
    }, [tenantId]);

    // Lista de tipos de ações para o filtro
    const actionTypes = [
        { value: 'all', label: 'Filtrar' },
        { value: 'create_lead', label: 'Novo Lead' },
        { value: 'update_lead', label: 'Lead Atualizado' },
        { value: 'delete_lead', label: 'Lead Excluído' },
        { value: 'archive_lead', label: 'Lead Arquivado' },
        { value: 'create_asset', label: 'Novo Imóvel' },
        { value: 'update_asset', label: 'Imóvel Atualizado' },
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
            endDate: endDate || undefined
        });

        if (result.success) {
            setLogs(result.data || []);
            setTotalPages(result.totalPages || 1);
            setTotalCount(result.totalCount || 0);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionType, profileId, startDate, endDate]);

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-foreground">
                        Logs do Sistema
                    </h1>
                    <div className="hidden md:flex items-center h-8 px-3 bg-muted/20 border border-border rounded-full shadow-sm">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                            Total: <span className="text-secondary dark:text-[#FFE600] font-bold mx-0.5">{totalCount}</span> eventos
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    {/* Filtro de Datas (Período) */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                            className="flex items-center justify-center gap-2 bg-card border border-muted-foreground/30 text-muted-foreground px-3 h-9 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium min-w-[120px] shadow-sm"
                        >
                            <Calendar size={18} className="text-muted-foreground" />
                            Período
                        </button>

                        {isDateFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsDateFilterOpen(false)} />
                                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-20 p-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">De</label>
                                            <input 
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                                className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Até</label>
                                            <input 
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                                className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                        {(startDate || endDate) && (
                                            <button 
                                                onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                                                className="w-full text-center text-xs text-red-500 font-bold hover:underline pt-1"
                                            >
                                                Limpar Datas
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Filtro de Colaborador (Usuário) */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsUserFilterOpen(!isUserFilterOpen)}
                            className="flex items-center justify-center gap-2 bg-card border border-muted-foreground/30 text-muted-foreground px-3 h-9 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium min-w-[120px] shadow-sm"
                        >
                            <UserIcon size={18} className="text-muted-foreground" />
                            {profileId === 'all' ? 'Usuários' : brokers.find(b => b.id === profileId)?.full_name || 'Usuário'}
                        </button>

                        {isUserFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsUserFilterOpen(false)} />
                                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={() => {
                                            setProfileId('all');
                                            setPage(1);
                                            setIsUserFilterOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${
                                            profileId === 'all' ? 'text-secondary dark:text-[#FFE600] font-bold bg-secondary/5' : 'text-foreground font-medium'
                                        }`}
                                    >
                                        Todos (Usuários)
                                    </button>
                                    {brokers.map(broker => (
                                        <button
                                            key={broker.id}
                                            onClick={() => {
                                                setProfileId(broker.id);
                                                setPage(1);
                                                setIsUserFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${
                                                profileId === broker.id ? 'text-secondary dark:text-[#FFE600] font-bold bg-secondary/5' : 'text-foreground font-medium'
                                            }`}
                                        >
                                            {broker.full_name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Filtro de Ação (Estilo Dashboard) */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center justify-center gap-2 bg-card border border-muted-foreground/30 text-muted-foreground px-3 h-9 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium min-w-[120px] shadow-sm"
                        >
                            <Filter size={18} className="text-muted-foreground" />
                            {actionTypes.find(t => t.value === actionType)?.label || 'Filtrar'}
                        </button>

                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                    {actionTypes.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => {
                                                setActionType(type.value);
                                                setPage(1);
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${
                                                actionType === type.value ? 'text-secondary dark:text-[#FFE600] font-bold bg-secondary/5' : 'text-foreground font-medium'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider">Ação</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider">Entidade</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider">Data/Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#404F4F] dark:text-gray-300 uppercase tracking-wider text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                                        Nenhum log encontrado com os filtros selecionados.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#404F4F]/10 flex items-center justify-center border border-[#404F4F]/5">
                                                    {log.profiles?.avatar_url ? (
                                                        <img src={log.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-4 h-4 text-[#404F4F]" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">
                                                        {log.profiles?.full_name || 'Sistema'}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">
                                                        #{log.profile_id?.slice(0, 8)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={getActionBadge(log.action)}>
                                                    {getActionLabel(log.action)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-600 uppercase bg-gray-100 px-2 py-0.5 rounded">
                                                    {log.entity_type}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    {log.entity_id?.slice(0, 8)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                title={JSON.stringify(log.details, null, 2)}
                                                className="p-2 hover:bg-[#FFE600]/10 rounded-lg text-muted-foreground hover:text-[#404F4F] transition-all"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 flex items-center justify-between border-t border-gray-100 dark:border-white/10">
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-none">
                            Página {page} de {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-white dark:hover:bg-white/10 disabled:opacity-50 transition-all shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4 text-foreground" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="p-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-white dark:hover:bg-white/10 disabled:opacity-50 transition-all shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4 text-foreground" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
