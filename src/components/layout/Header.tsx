'use client';

import { Bell, Sun, Moon, Menu, ChevronLeft, ChevronRight, CloudDownload, RefreshCw, WifiOff } from 'lucide-react';
import { AvatarDropdown } from './AvatarDropdown';
import { Modal } from '@/components/shared/Modal';
import { NotificationsList } from '@/components/dashboard/NotificationsList';
import { Notification } from '@/components/dashboard/NotificationItem';
import { getNotifications } from '@/app/_actions/notifications';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { getProfile, updateLastSeen } from '@/app/_actions/profile';
import { Logo } from '@/components/shared/Logo';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { ServiceQueueToggle } from './ServiceQueueToggle';

function SyncButton() {
    const { isOnline, isSyncing, syncData, syncProgress, lastSync } = useOfflineSync();

    // Check if synced in the last hour (3600000 ms)
    const isSyncedRecently = lastSync && (Date.now() - lastSync < 3600000);

    if (!isOnline) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20" title="Modo Offline">
                <WifiOff size={14} />
                <span>Offline</span>
            </div>
        )
    }

    return (
        <button
            onClick={syncData}
            disabled={isSyncing}
            style={{ 
                backgroundColor: isSyncedRecently && !isSyncing ? '#3EBC79' : 'var(--secondary)',
                borderColor: isSyncedRecently && !isSyncing ? '#3EBC79' : 'var(--secondary)',
                color: isSyncedRecently && !isSyncing ? '#FFFFFF' : 'var(--secondary-foreground)'
            }}
            className={`
                flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-xs font-bold border shadow-sm active:scale-[0.98]
                ${!isSyncedRecently || isSyncing ? 'hover:opacity-90' : 'hover:brightness-110'}
            `}
            title={lastSync ? `Última sincronização: ${new Date(lastSync).toLocaleTimeString()}` : "Sincronizar dados para offline"}
        >
            {isSyncing ? (
                <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sincronizando {syncProgress}%</span>
                </>
            ) : (
                <>
                    {/* Icon changes? Maybe check mark if synced? Keeping CloudDownload for now or Check if synced */}
                    {isSyncedRecently ? <CloudDownload size={14} /> : <CloudDownload size={14} />}
                    <span>
                        {isSyncedRecently ? 'Sincronizado' : 'Sincronizar'}
                    </span>
                </>
            )}
        </button>
    )
}


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

    const [profile, setProfile] = useState<any>(null);
    const [branding, setBranding] = useState<{ logo_full?: string; logo_header?: string; logo_icon?: string; logo_height?: number; logo_header_height?: number } | null>(null);
    const [companyName, setCompanyName] = useState<string>('');
    const [brandingLoading, setBrandingLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const fetchNotifications = async () => {
        const { notifications: data } = await getNotifications();
        if (data) setNotifications(data as any);
    };

    useEffect(() => {
        fetchNotifications();

        // Configurar Realtime para novas notificações
        const setupRealtime = async () => {
            const { createClient: createBrowserClient } = await import('@/lib/supabase/client');
            const supabase = createBrowserClient();
            
            const channel = supabase
                .channel('realtime_notifications')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: profile?.id ? `user_id=eq.${profile.id}` : undefined
                    },
                    (payload: any) => {
                        console.log('Realtime notification change:', payload);
                        if (payload.eventType === 'INSERT') {
                            setNotifications(prev => [payload.new as Notification, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            setNotifications(prev => prev.map(n => n.id === (payload.new as any).id ? (payload.new as Notification) : n));
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
                const { createClient: createBrowserClient } = require('@/lib/supabase/client');
                const supabase = createBrowserClient();
                supabase.removeChannel(channel);
            });
        };
    }, [profile?.id]);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        const handleBrandingUpdate = (event: any) => {
            if (event.detail) {
                const timestamp = Date.now();
                const updatedBranding = { ...event.detail };
                if (updatedBranding.logo_full) updatedBranding.logo_full = `${updatedBranding.logo_full}?t=${timestamp}`;
                setBranding(updatedBranding);
            }
        };

        const handleProfileUpdate = (event: any) => {
            if (event.detail) {
                setProfile((prev: any) => ({ ...prev, ...event.detail }));
            }
        };

        window.addEventListener('branding-updated', handleBrandingUpdate);
        window.addEventListener('profile-updated', handleProfileUpdate);
        return () => {
            window.removeEventListener('branding-updated', handleBrandingUpdate);
            window.removeEventListener('profile-updated', handleProfileUpdate);
        };
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
                            .select('name, branding')
                            .eq('id', profileData.tenant_id)
                            .maybeSingle();

                        if (tenant) {
                            if (tenant.branding) setBranding(tenant.branding as any);
                            if (tenant.name) setCompanyName(tenant.name);
                        }
                    }
                }
            } finally {
                setBrandingLoading(false);
            }
        }
        loadData();
    }, []);

    // Heartbeat para status online
    useEffect(() => {
        if (profile?.id) {
            // Atualizar status ao montar
            updateLastSeen();
            
            // Intervalo de 2 minutos
            const interval = setInterval(() => {
                updateLastSeen();
            }, 120000);
            
            return () => clearInterval(interval);
        }
    }, [profile?.id]);

    return (
        <>
            <header className="h-auto md:h-16 bg-card border-b border-border flex flex-col md:flex-row sticky top-0 z-40 transition-all">
                {/* Primeira Linha (Mobile & Desktop) */}
                <div className="h-16 flex items-center justify-between px-6 w-full flex-none">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={onMenuClick}
                            className="md:hidden text-foreground/70 hover:text-foreground transition-colors"
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
                                Bem-vindo, {profile?.full_name || companyName || 'Usuário'}
                            </h2>
                            <span className="text-xs text-foreground/70">{formattedDate}</span>
                        </div>

                        {/* Mobile Centered Logo */}
                        <div className="md:hidden flex-1 flex justify-center pr-6">
                            <Logo
                                size="md"
                                src={branding?.logo_header || branding?.logo_full}
                                height={branding?.logo_header_height || (branding?.logo_header ? 40 : branding?.logo_height || 40)}
                                loading={brandingLoading}
                            />
                        </div>
                    </div>

                    {/* Desktop - Right Section (Atendimento, Sincronizar, Theme, Bell, Avatar) */}
                    <div className="hidden md:flex items-center gap-6">
                        <ServiceQueueToggle 
                            initialStatus={profile?.is_active_for_service} 
                            tenantId={profile?.tenant_id} 
                            companyName={companyName}
                        />

                        <SyncButton />

                        <div className="flex items-center gap-4">
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
                                <AvatarDropdown unreadCount={unreadCount} />
                            </div>
                        </div>
                    </div>

                    {/* Mobile - Only Avatar Dropdown on Right in First Row */}
                    <div className="md:hidden flex items-center gap-3">
                        <AvatarDropdown unreadCount={unreadCount} />
                    </div>
                </div>

                {/* Segunda Linha (Apenas Mobile) */}
                <div className="md:hidden flex items-center justify-center flex-wrap gap-3 px-4 pb-3 pt-1 w-full">
                    <ServiceQueueToggle 
                        initialStatus={profile?.is_active_for_service} 
                        tenantId={profile?.tenant_id} 
                        companyName={companyName}
                    />
                    <SyncButton />
                </div>
            </header>

            <Modal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                title="Notificações"
                size="lg"
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
