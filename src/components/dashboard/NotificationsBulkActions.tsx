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
        <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-end gap-2 animate-in fade-in slide-in-from-top-1">
            <button
                onClick={onMarkAsRead}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-all flex items-center gap-1.5"
            >
                <CheckCircle size={14} />
                Marcar como lida
            </button>
            <button
                onClick={onDelete}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-500/5 rounded-lg transition-all flex items-center gap-1.5"
            >
                <Trash2 size={14} />
                Excluir permanentemente
            </button>
        </div>
    );
}

