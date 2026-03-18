'use client';

import { CheckSquare, Square } from 'lucide-react';

interface NotificationsHeaderProps {
    totalCount: number;
    unreadCount: number;
    selectedCount: number;
    onToggleSelectAll: () => void;
}

export function NotificationsHeader({
    totalCount,
    unreadCount,
    selectedCount,
    onToggleSelectAll
}: NotificationsHeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 px-6 sticky top-0 z-10 bg-card border-b border-border/50">
            <div className="flex items-center">
                <button
                    onClick={onToggleSelectAll}
                    className="flex items-center gap-3 text-sm text-foreground/80 hover:text-foreground transition-colors font-semibold bg-transparent p-0 border-none outline-none ring-0 focus:outline-none focus:ring-0 group"
                >
                    <div className="shrink-0 flex items-center justify-center w-[20px] h-[20px]">
                        {selectedCount === totalCount && totalCount > 0 ? (
                            <CheckSquare size={18} className="text-secondary" />
                        ) : (
                            <Square size={18} className="text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
                        )}
                    </div>
                    <span className="tracking-tight">Selecionar todos</span>
                </button>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex flex-col items-end mr-2 pr-2 border-r border-border/50">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50">Total</span>
                    <span className="text-xs font-bold text-foreground leading-none">{totalCount}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-500/50">Não lidas</span>
                    <span className="text-xs font-bold text-red-500 leading-none">{unreadCount}</span>
                </div>
            </div>
        </div>
    );
}

