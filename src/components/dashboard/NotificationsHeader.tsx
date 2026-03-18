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
        <div className="flex items-center justify-between p-4 px-6 sticky top-0 z-10 bg-card border-b border-border/50 h-[72px]">
            <div className="flex items-center">
                <button
                    onClick={onToggleSelectAll}
                    className="flex items-center gap-3 text-sm text-foreground hover:text-foreground transition-colors font-bold bg-transparent p-0 border-none outline-none ring-0 focus:outline-none focus:ring-0 group"
                >
                    <div className="shrink-0 flex items-center justify-center w-[20px] h-[20px]">
                        {selectedCount === totalCount && totalCount > 0 ? (
                            <CheckSquare size={18} className="text-foreground" />
                        ) : (
                            <Square size={18} className="text-muted-foreground/45 group-hover:text-muted-foreground/60 transition-colors" />
                        )}
                    </div>
                    <span className="tracking-tight">Selecionar todos</span>
                </button>
            </div>

            <div className="flex items-center gap-4">
                {selectedCount > 0 && onMarkAsRead && onDelete && (
                    <div className="flex items-center gap-2 mr-2 pr-2 border-r border-border/50 animate-in fade-in slide-in-from-right-2 duration-200">
                        <button
                            onClick={onMarkAsRead}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-secondary text-secondary-foreground hover:opacity-90 rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50"
                        >
                            <CheckCircle size={14} />
                            Lidas
                        </button>
                        <button
                            onClick={onDelete}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-red-500 text-white hover:bg-red-600 rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            Excluir
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/90">Total</span>
                    <span className="text-xs font-bold text-foreground leading-none">{totalCount}</span>
                </div>
                <div className="h-3 w-px bg-border/50" />
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-500/90">Não lidas</span>
                    <span className="text-xs font-bold text-red-500 leading-none">{unreadCount}</span>
                </div>
            </div>
        </div>
    );
}

