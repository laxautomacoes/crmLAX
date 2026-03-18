'use client';

import { CheckCircle, Trash2 } from 'lucide-react';

interface NotificationsBulkActionsProps {
    selectedCount: number;
    isProcessing: boolean;
    onMarkAsRead: () => void;
    onDelete: () => void;
}

export function NotificationsBulkActions({
    selectedCount,
    isProcessing,
    onMarkAsRead,
    onDelete
}: NotificationsBulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="px-6 py-3 bg-muted/20 border-b border-border flex items-center justify-start gap-2 animate-in fade-in slide-in-from-top-1">
            <button
                onClick={onMarkAsRead}
                disabled={isProcessing}
                className="px-4 py-2 text-[11px] font-bold text-secondary bg-background hover:bg-secondary/5 border border-secondary/20 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
                <CheckCircle size={14} />
                Marcar selecionadas como lidas
            </button>
            <button
                onClick={onDelete}
                disabled={isProcessing}
                className="px-4 py-2 text-[11px] font-bold text-red-500 hover:bg-red-500/5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
                <Trash2 size={14} />
                Excluir permanentemente
            </button>
        </div>
    );
}

