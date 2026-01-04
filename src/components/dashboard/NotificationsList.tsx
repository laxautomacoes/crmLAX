'use client';

import { useState } from 'react';
import { Trash2, CheckCircle, Square, CheckSquare, Bell } from 'lucide-react';

export interface Notification {
    id: number;
    title: string;
    message: string;
    date: string;
    read: boolean;
}

interface NotificationsListProps {
    notifications: Notification[];
    setNotifications: (notifications: Notification[]) => void;
}

export function NotificationsList({ notifications, setNotifications }: NotificationsListProps) {
    // Removed local state initialization
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    const deleteSelected = () => {
        setNotifications(notifications.filter(n => !selectedIds.includes(n.id)));
        setSelectedIds([]);
    };

    const markAsRead = () => {
        setNotifications(notifications.map(n =>
            selectedIds.includes(n.id) ? { ...n, read: true } : n
        ));
        setSelectedIds([]);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="flex flex-col h-full bg-card md:bg-transparent rounded-lg md:rounded-none">
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between p-4 border-b border-border gap-4 bg-card sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium"
                    >
                        {selectedIds.length === notifications.length && notifications.length > 0 ? (
                            <CheckSquare size={18} className="text-[#00B087]" />
                        ) : (
                            <Square size={18} />
                        )}
                        Selecionar todos
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium">
                            Tudo <span className="text-foreground ml-1">{notifications.length}</span>
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-600 font-medium whitespace-nowrap">
                            Não lidas <span className="text-red-600 ml-1">{unreadCount}</span>
                        </span>
                    </div>
                </div>
            </div>

            {(selectedIds.length > 0) && (
                <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-end gap-2 animate-in fade-in slide-in-from-top-1">
                    <button
                        onClick={markAsRead}
                        className="px-3 py-1.5 text-xs font-medium text-[#00B087] bg-[#00B087]/10 hover:bg-[#00B087]/20 rounded-md transition-colors flex items-center gap-1"
                    >
                        <CheckCircle size={14} />
                        Marcar como lida
                    </button>
                    <button
                        onClick={deleteSelected}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center gap-1"
                    >
                        <Trash2 size={14} />
                        Excluir
                    </button>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar md:min-h-[400px]">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                        <Bell size={48} className="mb-4 opacity-20" />
                        <p className="font-medium text-foreground">Nenhuma notificação</p>
                        <p className="text-sm">Sua caixa de entrada está vazia.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors group ${!notification.read ? 'bg-blue-500/5' : ''
                                    }`}
                            >
                                <button
                                    onClick={() => toggleSelect(notification.id)}
                                    className="text-muted-foreground hover:text-foreground mt-1 shrink-0"
                                >
                                    {selectedIds.includes(notification.id) ? (
                                        <CheckSquare size={18} className="text-[#00B087]" />
                                    ) : (
                                        <Square size={18} />
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
                                        <h4 className={`text-sm ${!notification.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                            {notification.title}
                                        </h4>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap sm:ml-2">{notification.date}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                                </div>

                                {!notification.read && (
                                    <div className="h-2 w-2 rounded-full bg-red-500 shrink-0 mt-2"></div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
