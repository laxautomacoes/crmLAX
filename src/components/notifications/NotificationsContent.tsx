'use client';

import { useState, useEffect } from 'react';
import { NotificationsList } from '@/components/dashboard/NotificationsList';
import { getNotifications } from '@/app/_actions/notifications';

export function NotificationsTab() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [userId, setUserId] = useState<string | null>(null);

    const fetchNotifications = async () => {
        setLoading(true);
        const { notifications: data } = await getNotifications();
        if (data) setNotifications(data);
        
        // Obter o ID do usuário para o filtro do Realtime
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
        
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    useEffect(() => {
        if (!userId) return;

        const setupRealtime = async () => {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            
            const channel = supabase
                .channel('tab_notifications')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`
                    },
                    (payload: any) => {
                        if (payload.eventType === 'INSERT') {
                            setNotifications(prev => [payload.new as any, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            setNotifications(prev => prev.map(n => n.id === (payload.new as any).id ? (payload.new as any) : n));
                        } else if (payload.eventType === 'DELETE') {
                            setNotifications(prev => prev.filter(n => n.id !== (payload.old as any).id));
                        }
                    }
                )
                .subscribe();

            return channel;
        };

        const channelPromise = setupRealtime();

        return () => {
            channelPromise.then(channel => {
                const { createClient } = require('@/lib/supabase/client');
                const supabase = createClient();
                supabase.removeChannel(channel);
            });
        };
    }, [userId]);

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

