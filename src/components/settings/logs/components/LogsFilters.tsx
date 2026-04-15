'use client';

import { Download, Calendar, User as UserIcon, Filter } from 'lucide-react';

interface LogsFiltersProps {
    totalCount: number;
    exportToCSV: () => void;
    loading: boolean;
    logs: any[];
    isDateFilterOpen: boolean;
    setIsDateFilterOpen: (open: boolean) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    setPage: (page: number) => void;
    isUserFilterOpen: boolean;
    setIsUserFilterOpen: (open: boolean) => void;
    profileId: string;
    setProfileId: (id: string) => void;
    brokers: any[];
    isFilterOpen: boolean;
    setIsFilterOpen: (open: boolean) => void;
    actionType: string;
    setActionType: (type: string) => void;
    actionTypes: any[];
}

export function LogsFilters({
    totalCount, exportToCSV, loading, logs,
    isDateFilterOpen, setIsDateFilterOpen, startDate, setStartDate, endDate, setEndDate, setPage,
    isUserFilterOpen, setIsUserFilterOpen, profileId, setProfileId, brokers,
    isFilterOpen, setIsFilterOpen, actionType, setActionType, actionTypes
}: LogsFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="hidden md:flex items-center h-9 px-3 bg-muted/20 border border-border rounded-lg shadow-sm">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Total: <span className="text-secondary dark:text-[#FFE600] font-bold mx-0.5">{totalCount}</span> eventos
                </span>
            </div>

            <button onClick={exportToCSV} disabled={logs.length === 0 || loading}
                className="flex items-center justify-center gap-2 bg-card border border-muted-foreground/30 text-muted-foreground px-3 h-9 rounded-lg hover:bg-muted/50 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
            >
                <Download size={18} /> Exportar CSV
            </button>

            {/* Filtro de Datas */}
            <div className="relative">
                <button onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                    className="flex items-center justify-center gap-2 bg-card border border-muted-foreground/30 text-muted-foreground px-3 h-9 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium shadow-sm"
                >
                    <Calendar size={18} /> Período
                </button>
                {isDateFilterOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsDateFilterOpen(false)} />
                        <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-20 p-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="space-y-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">De</label>
                                    <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Até</label>
                                    <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Filtro de Usuário */}
            <div className="relative">
                <button onClick={() => setIsUserFilterOpen(!isUserFilterOpen)}
                    className="flex items-center justify-center gap-2 bg-card border border-muted-foreground/30 text-muted-foreground px-3 h-9 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium shadow-sm"
                >
                    <UserIcon size={18} /> {profileId === 'all' ? 'Usuários' : brokers.find(b => b.id === profileId)?.full_name || 'Usuário'}
                </button>
                {isUserFilterOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsUserFilterOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            <button onClick={() => { setProfileId('all'); setPage(1); setIsUserFilterOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${profileId === 'all' ? 'text-secondary dark:text-[#FFE600] font-bold bg-secondary/5' : 'text-foreground font-medium'}`}
                            > Todos (Usuários) </button>
                            {brokers.map(broker => (
                                <button key={broker.id} onClick={() => { setProfileId(broker.id); setPage(1); setIsUserFilterOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${profileId === broker.id ? 'text-secondary dark:text-[#FFE600] font-bold bg-secondary/5' : 'text-foreground font-medium'}`}
                                > {broker.full_name} </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Filtro de Ação */}
            <div className="relative">
                <button onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="flex items-center justify-center gap-2 bg-card border border-muted-foreground/30 text-muted-foreground px-3 h-9 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium shadow-sm"
                >
                    <Filter size={18} /> {actionTypes.find(t => t.value === actionType)?.label || 'Filtrar'}
                </button>
                {isFilterOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                            {actionTypes.map(type => (
                                <button key={type.value} onClick={() => { setActionType(type.value); setPage(1); setIsFilterOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${actionType === type.value ? 'text-secondary dark:text-[#FFE600] font-bold bg-secondary/5' : 'text-foreground font-medium'}`}
                                > {type.label} </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
