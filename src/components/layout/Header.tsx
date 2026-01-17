'use client';

import { Bell, Sun, Moon, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { AvatarDropdown } from './AvatarDropdown';
import { Modal } from '@/components/shared/Modal';
import { NotificationsList } from '@/components/dashboard/NotificationsList';
import { Notification } from '@/components/dashboard/NotificationItem';
import { getNotifications } from '@/app/_actions/notifications';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { getProfile } from '@/app/_actions/profile';

interface HeaderProps {
    onMenuClick: () => void;
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
}

export function Header({ onMenuClick, isSidebarCollapsed, toggleSidebar }: HeaderProps) {
    // Simple date format: "Hoje é 02 de Janeiro de 2026"
    const today = new Date();
    const dateString = today.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    // Capitalize month if needed, though default is lowercase in pt-BR. User example showed "Janeira" (typo?) "Janeiro".
    const formattedDate = `Hoje é ${dateString}`;

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const fetchNotifications = async () => {
        const { notifications: data } = await getNotifications();
        if (data) setNotifications(data as any);
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const [profile, setProfile] = useState<any>(null);

    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        getProfile().then((data) => {
            if (data.profile) setProfile(data.profile);
        });
    }, []);

    return (
        <>
            <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-none sticky top-0 z-40">
                <div className="flex items-center gap-4 flex-1">
                    {/* Mobile Menu Button ... */}
                    <button
                        onClick={onMenuClick}
                        className="md:hidden text-[#404F4F]/60 hover:text-[#404F4F] absolute left-4"
                    >
                        <Menu size={24} />
                    </button>

                    {/* Desktop Collapse Button ... */}
                    <button
                        onClick={toggleSidebar}
                        className="hidden md:block text-[#404F4F]/60 hover:text-[#404F4F] transition-colors"
                    >
                        {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>

                    {/* Desktop Welcome & Date ... */}
                    <div className="hidden md:flex flex-col ml-4">
                        <h2 className="text-lg font-semibold text-foreground">
                            Bem-vindo, {profile?.full_name || 'Léo Acosta'}
                        </h2>
                        <span className="text-xs text-[#404F4F]/60">{formattedDate}</span>
                    </div>

                    {/* Mobile Centered Logo ... */}
                    <div className="md:hidden flex-1 flex justify-center">
                        <span className="text-xl font-bold text-[#FFE600] text-shadow-sm ml-6">CRM LAX</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-4">
                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="text-[#404F4F]/60 hover:text-[#404F4F] transition-colors"
                            >
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                        )}
                        <button
                            onClick={() => setIsNotificationsOpen(true)}
                            className="text-[#404F4F]/60 hover:text-[#404F4F] relative"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-card"></span>
                            )}
                        </button>
                        <div className="relative">
                            <AvatarDropdown />
                        </div>
                    </div>

                    {/* Mobile Avatar Dropdown ... */}
                    <div className="md:hidden">
                        <AvatarDropdown />
                    </div>
                </div>
            </header>

            <Modal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                title="Notificações"
            >
                <div className="h-[500px] -m-6">
                    <NotificationsList
                        notifications={notifications}
                        onRefresh={fetchNotifications}
                    />
                </div>
            </Modal>
        </>
    );
}
