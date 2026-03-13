'use client';

import { useState, Suspense, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { WelcomePopup } from '@/components/shared/WelcomePopup';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });
    }, []);

    return (
        <div className="flex h-screen bg-background overflow-hidden text-foreground">
            {user && <WelcomePopup user={user} />}
            <Suspense fallback={null}>
                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    isCollapsed={sidebarCollapsed}
                    toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </Suspense>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Header
                    onMenuClick={() => setSidebarOpen(true)}
                    isSidebarCollapsed={sidebarCollapsed}
                    toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                />

                <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
                    <Suspense fallback={
                        <div className="flex h-[60vh] items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    }>
                        {children}
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
