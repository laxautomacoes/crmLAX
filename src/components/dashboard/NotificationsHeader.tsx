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
        <div className="flex items-center justify-between p-5 sticky top-0 z-10 bg-transparent">
            <div className="flex items-center">
                <button
                    onClick={onToggleSelectAll}
                    className="flex items-center gap-4 text-sm text-foreground hover:opacity-80 font-bold bg-transparent p-0 border-none outline-none ring-0 focus:outline-none focus:ring-0"
                >
                    <div className="shrink-0 flex items-center justify-center w-[20px] h-[20px]">
                        {selectedCount === totalCount && totalCount > 0 ? (
                            <CheckSquare size={20} className="text-secondary" />
                        ) : (
                            <Square size={20} className="text-muted-foreground/30" />
                        )}
                    </div>
                    Selecionar todos
                </button>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                    Tudo <span className="text-foreground font-bold ml-1">{totalCount}</span>
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-bold whitespace-nowrap">
                    Não lidas <span className="ml-1">{unreadCount}</span>
                </span>
            </div>
        </div>
    );
}

