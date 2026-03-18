'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { markAsRead, deleteNotifications } from '@/app/_actions/notifications';
import { NotificationsHeader } from './NotificationsHeader';
import { NotificationItem, Notification } from './NotificationItem';

interface NotificationsListProps {
    notifications: Notification[];
    onRefresh: () => void;
}

export function NotificationsList({ notifications, onRefresh }: NotificationsListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
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

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="border-b border-border/50 bg-card z-10">
                <NotificationsHeader
                    totalCount={notifications.length}
                    unreadCount={unreadCount}
                    selectedCount={selectedIds.length}
                    isProcessing={isProcessing}
                    onToggleSelectAll={toggleSelectAll}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                />
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 space-y-4">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground animate-in fade-in zoom-in duration-300">
                        <Bell size={48} className="mb-4 opacity-10 text-foreground" />
                        <p className="font-bold text-foreground">Nenhuma notificação</p>
                        <p className="text-sm">Sua caixa de entrada está limpa.</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            isSelected={selectedIds.includes(notification.id)}
                            isExpanded={expandedId === notification.id}
                            onToggleSelect={() => toggleSelect(notification.id)}
                            onToggleExpand={() => setExpandedId(expandedId === notification.id ? null : notification.id)}
                            onRefresh={onRefresh}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
