'use client';

import { useState, Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-background overflow-hidden">
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
                    <Suspense fallback={<div className="p-8">Carregando...</div>}>
                        {children}
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
