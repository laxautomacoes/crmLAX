'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User as UserIcon, Clock, Eye } from 'lucide-react';

interface LogsListProps {
    logs: any[];
    loading: boolean;
    getActionBadge: (action: string) => string;
    getActionLabel: (action: string) => string;
}

export function LogsList({ logs, loading, getActionBadge, getActionLabel }: LogsListProps) {
    if (loading) {
        return (
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-4">
                            <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                        </td>
                    </tr>
                ))}
            </tbody>
        );
    }

    if (logs.length === 0) {
        return (
            <tbody>
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                        Nenhum log encontrado com os filtros selecionados.
                    </td>
                </tr>
            </tbody>
        );
    }

    return (
        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
            {logs.map((log) => (
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
            ))}
        </tbody>
    );
}
