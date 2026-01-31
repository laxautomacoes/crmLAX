'use client';

import { NotificationsTab } from '@/components/notifications/NotificationsContent';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">
                    Notificações
                </h1>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <NotificationsTab />
            </div>
        </div>
    );
}
