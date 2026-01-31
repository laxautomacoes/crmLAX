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
import { Logo } from '@/components/shared/Logo';

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
    const [branding, setBranding] = useState<{ logo_full?: string; logo_height?: number } | null>(null);
    const [brandingLoading, setBrandingLoading] = useState(true);

    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const handleBrandingUpdate = (event: any) => {
            if (event.detail) {
                const timestamp = Date.now();
                const updatedBranding = { ...event.detail };
                if (updatedBranding.logo_full) updatedBranding.logo_full = `${updatedBranding.logo_full}?t=${timestamp}`;
                setBranding(updatedBranding);
            }
        };

        window.addEventListener('branding-updated', handleBrandingUpdate);
        return () => window.removeEventListener('branding-updated', handleBrandingUpdate);
    }, []);

    useEffect(() => {
        setMounted(true);
        async function loadData() {
            try {
                const { profile: profileData } = await getProfile();
                if (profileData) {
                    setProfile(profileData);
                    
                    if (profileData.tenant_id) {
                        const { createClient } = await import('@/lib/supabase/client');
                        const supabase = createClient();
                        const { data: tenant } = await supabase
                            .from('tenants')
                            .select('branding')
                            .eq('id', profileData.tenant_id)
                            .maybeSingle();
                        
                        if (tenant?.branding) {
                            setBranding(tenant.branding as any);
                        }
                    }
                }
            } finally {
                setBrandingLoading(false);
            }
        }
        loadData();
    }, []);

    return (
        <>
            <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-none sticky top-0 z-40">
                <div className="flex items-center gap-4 flex-1">
                    {/* Mobile Menu Button ... */}
                    <button
                        onClick={onMenuClick}
                        className="md:hidden text-foreground/70 hover:text-foreground absolute left-4"
                    >
                        <Menu size={24} />
                    </button>

                    {/* Desktop Collapse Button */}
                    <button
                        onClick={toggleSidebar}
                        className="hidden md:block text-foreground/70 hover:text-foreground transition-colors"
                    >
                        {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>

                    {/* Desktop Welcome & Date */}
                    <div className="hidden md:flex flex-col ml-4">
                        <h2 className="text-lg font-semibold text-foreground">
                            Bem-vindo, {profile?.full_name || 'Léo Acosta'}
                        </h2>
                        <span className="text-xs text-foreground/70">{formattedDate}</span>
                    </div>

                    {/* Mobile Centered Logo */}
                    <div className="md:hidden flex-1 flex justify-center">
                        <Logo 
                            size="md" 
                            className="ml-6" 
                            src={branding?.logo_full} 
                            height={branding?.logo_height}
                            loading={brandingLoading}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-4">
                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="text-foreground/70 hover:text-foreground transition-colors"
                            >
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                        )}
                        <button
                            onClick={() => setIsNotificationsOpen(true)}
                            className="text-foreground/70 hover:text-foreground relative"
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
