'use client';

import { useState, useEffect } from 'react';
import { NotificationsList } from '@/components/dashboard/NotificationsList';
import { getNotifications } from '@/app/_actions/notifications';

export function NotificationsTab() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        setLoading(true);
        const { notifications: data } = await getNotifications();
        if (data) setNotifications(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    if (loading) {
        return (
            <div className="bg-card rounded-2xl border border-border shadow-sm min-h-[500px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm min-h-[500px] flex flex-col overflow-hidden">
            <NotificationsList
                notifications={notifications}
                onRefresh={fetchNotifications}
            />
        </div>
    );
}

