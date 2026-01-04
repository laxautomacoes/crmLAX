'use client';

import { useState } from 'react';
import { Trash2, CheckCircle, Square, CheckSquare, Bell, X } from 'lucide-react';
import { markAsRead, deleteNotifications } from '@/app/_actions/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Notification {
    id: string;
    title: string;
    message: string;
    created_at: string;
    read: boolean;
    type?: string;
}

interface NotificationsListProps {
    notifications: Notification[];
    onRefresh: () => void;
}

export function NotificationsList({ notifications, onRefresh }: NotificationsListProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length && notifications.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    const handleDelete = async () => {
        if (selectedIds.length === 0) return;
        setIsProcessing(true);
        try {
            const result = await deleteNotifications(selectedIds);
            if (result.success) {
                setSelectedIds([]);
                onRefresh();
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMarkAsRead = async () => {
        if (selectedIds.length === 0) return;
        setIsProcessing(true);
        try {
            const result = await markAsRead(selectedIds);
            if (result.success) {
                setSelectedIds([]);
                onRefresh();
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const formatRelativeDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const distance = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
            // Capitalize first letter and handle some specific translations if needed
            return distance.charAt(0).toUpperCase() + distance.slice(1);
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Header Actions */}
            <div className="flex items-center justify-between p-5 sticky top-0 z-10 bg-transparent">
                <div className="flex items-center">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-4 text-sm text-[#404F4F] hover:opacity-80 font-bold bg-transparent p-0 border-none outline-none ring-0 focus:outline-none focus:ring-0"
                    >
                        <div className="shrink-0 flex items-center justify-center w-[20px] h-[20px]">
                            {selectedIds.length === notifications.length && notifications.length > 0 ? (
                                <CheckSquare size={20} className="text-[#00B087]" />
                            ) : (
                                <Square size={20} className="text-gray-300" />
                            )}
                        </div>
                        Selecionar todos
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        Tudo <span className="text-[#404F4F] font-bold ml-1">{notifications.length}</span>
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-bold whitespace-nowrap">
                        Não lidas <span className="ml-1">{unreadCount}</span>
                    </span>
                </div>
            </div>

            {/* Bulk Actions Bar (Floating if selected) */}
            {selectedIds.length > 0 && (
                <div className="px-4 py-2 bg-[#F9FAFB] border-b border-gray-100 flex items-center justify-end gap-2 animate-in fade-in slide-in-from-top-1">
                    <button
                        onClick={handleMarkAsRead}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-bold text-[#00B087] hover:bg-[#00B087]/5 rounded-lg transition-all flex items-center gap-1.5"
                    >
                        <CheckCircle size={14} />
                        Marcar como lida
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1.5"
                    >
                        <Trash2 size={14} />
                        Excluir permanentemente
                    </button>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                        <Bell size={48} className="mb-4 opacity-10 text-[#404F4F]" />
                        <p className="font-bold text-[#404F4F]">Nenhuma notificação</p>
                        <p className="text-sm">Sua caixa de entrada está limpa.</p>
                    </div>
                ) : (
                    <div className="">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`flex items-start gap-4 p-5 border-b border-gray-50 transition-all hover:bg-[#F9FAFB] ${!notification.read ? 'bg-[#F0F7FF]/30' : ''}`}
                            >
                                <button
                                    onClick={() => toggleSelect(notification.id)}
                                    className="pt-0.5 shrink-0"
                                >
                                    {selectedIds.includes(notification.id) ? (
                                        <CheckSquare size={20} className="text-[#00B087]" />
                                    ) : (
                                        <Square size={20} className="text-gray-300" />
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-0.5">
                                        <h4 className={`text-sm leading-tight ${!notification.read ? 'font-bold text-[#404F4F]' : 'font-semibold text-gray-500'}`}>
                                            {notification.title}
                                        </h4>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
                                                {formatRelativeDate(notification.created_at)}
                                            </span>
                                            {!notification.read && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                                            )}
                                        </div>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${!notification.read ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                                        {notification.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
