'use client';

import { useState, Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileServiceBar } from '@/components/layout/MobileServiceBar';
import { WelcomePopup } from '@/components/shared/WelcomePopup';
import { ProfileProvider, useProfile } from '@/components/layout/ProfileContext';

function DashboardLayoutInner({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { profile } = useProfile();

    return (
        <div className="flex h-screen bg-background overflow-hidden text-foreground">
            {profile && <WelcomePopup user={{ id: profile.id, email: profile.email } as any} />}
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
                    <MobileServiceBar />
                    <Suspense fallback={
                        <div className="flex h-[60vh] items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    }>
                        {children}
                    </Suspense>
                </main>
            </div>
            {modal}
        </div>
    );
}

export default function DashboardLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <ProfileProvider>
            <DashboardLayoutInner modal={modal}>
                {children}
            </DashboardLayoutInner>
        </ProfileProvider>
    );
}

