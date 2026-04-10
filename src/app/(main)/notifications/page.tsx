'use client';

import { NotificationsTab } from '@/components/notifications/NotificationsContent';
import { PageHeader } from '@/components/shared/PageHeader';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <PageHeader title="Notificações" />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <NotificationsTab />
            </div>
        </div>
    );
}
