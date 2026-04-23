'use client';

import { CheckSquare, Square, CheckCircle, Trash2 } from 'lucide-react';

interface NotificationsHeaderProps {
    totalCount: number;
    unreadCount: number;
    selectedCount: number;
    isProcessing?: boolean;
    onToggleSelectAll: () => void;
    onMarkAsRead?: () => void;
    onDelete?: () => void;
}

export function NotificationsHeader({
    totalCount,
    unreadCount,
    selectedCount,
    isProcessing,
    onToggleSelectAll,
    onMarkAsRead,
    onDelete
}: NotificationsHeaderProps) {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 px-4 md:px-6 sticky top-0 z-10 bg-card border-b border-border/50 min-h-14 md:min-h-[72px]">
            {/* Selecionar todos */}
            <button
                onClick={onToggleSelectAll}
                className="flex items-center gap-3 text-sm text-foreground hover:text-foreground transition-colors font-bold bg-transparent p-0 border-none outline-none ring-0 focus:outline-none focus:ring-0 group shrink-0"
            >
                <div className="shrink-0 flex items-center justify-center w-[20px] h-[20px]">
                    {selectedCount === totalCount && totalCount > 0 ? (
                        <CheckSquare size={18} className="text-foreground" />
                    ) : (
                        <Square size={18} className="text-muted-foreground/45 group-hover:text-muted-foreground/60 transition-colors" />
                    )}
                </div>
                <span className="tracking-tight hidden sm:inline whitespace-nowrap">Selecionar todos</span>
                <span className="tracking-tight sm:hidden">Todos</span>
            </button>

            {/* Botões de ação */}
            {selectedCount > 0 && onMarkAsRead && onDelete && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200 shrink-0">
                    <button
                        onClick={onMarkAsRead}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-secondary text-secondary-foreground hover:opacity-90 rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                    >
                        <CheckCircle size={14} />
                        Lidas
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-[#EF4444] text-white hover:bg-[#DC2626] rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                    >
                        <Trash2 size={14} />
                        Excluir
                    </button>
                </div>
            )}

            {/* Contadores - empurrados para a direita */}
            <div className="flex items-center gap-4 ml-auto shrink-0">
                <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/90 whitespace-nowrap">Lidas</span>
                    <span className="text-xs font-bold text-foreground leading-none">{totalCount - unreadCount}</span>
                </div>
                <div className="h-3 w-px bg-border/50" />
                <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-500/90 whitespace-nowrap">Não lidas</span>
                    <span className="text-xs font-bold text-red-500 leading-none">{unreadCount}</span>
                </div>
            </div>
        </div>
    );
}

