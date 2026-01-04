'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { markAsRead, deleteNotifications } from '@/app/_actions/notifications';
import { NotificationsHeader } from './NotificationsHeader';
import { NotificationsBulkActions } from './NotificationsBulkActions';
import { NotificationItem, Notification } from './NotificationItem';

interface NotificationsListProps {
    notifications: Notification[];
    onRefresh: () => void;
}

export function NotificationsList({ notifications, onRefresh }: NotificationsListProps) {
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
        <div className="flex flex-col h-full bg-card">
            <NotificationsHeader
                totalCount={notifications.length}
                unreadCount={unreadCount}
                selectedCount={selectedIds.length}
                onToggleSelectAll={toggleSelectAll}
            />

            <NotificationsBulkActions
                selectedCount={selectedIds.length}
                isProcessing={isProcessing}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                        <Bell size={48} className="mb-4 opacity-10 text-[#404F4F]" />
                        <p className="font-bold text-[#404F4F]">Nenhuma notificação</p>
                        <p className="text-sm">Sua caixa de entrada está limpa.</p>
                    </div>
                ) : (
                    <div>
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                isSelected={selectedIds.includes(notification.id)}
                                onToggleSelect={toggleSelect}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
