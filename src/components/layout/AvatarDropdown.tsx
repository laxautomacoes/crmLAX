'use client';

import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Bell, Settings, LogOut, User, Users, Headphones } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { MenuItem } from './AvatarDropdown/MenuItem';
import { DropdownHeader } from './AvatarDropdown/DropdownHeader';
import { useTheme } from 'next-themes';
import { saveAccount, removeAccount } from '@/lib/utils/multi-account';
import { SwitchAccountModal } from './AvatarDropdown/SwitchAccountModal';
import { recordAccessLog } from '@/app/_actions/auth-logs';
import { SupportModal } from '@/components/shared/SupportModal';
import { useProfile } from './ProfileContext';

export function AvatarDropdown({ unreadCount = 0 }: { unreadCount?: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    // Usar contexto centralizado em vez de chamar getProfile()
    const { profile: ctxProfile } = useProfile();
    const profile = ctxProfile;
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();
    const { theme, setTheme } = useTheme();

    const handleLogout = async () => {
        await recordAccessLog('logout').catch(console.error);
        if (profile?.email) {
            removeAccount(profile.email);
        }
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    useEffect(() => {
        // Sync multi-account quando o perfil estiver disponível
        const syncAccount = async () => {
            if (!profile) return;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    saveAccount({
                        email: session.user.email!,
                        name: profile.full_name || session.user.email!,
                        avatar_url: profile.avatar_url || null,
                        role: profile.role || null,
                        tenant_id: profile.tenant_id || null,
                        session: session
                    });
                }
            } catch (err) {
                console.error('[AvatarDropdown] Erro ao sincronizar conta:', err);
            }
        };

        syncAccount();

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [profile?.id]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30 rounded-full"
            >
                <UserAvatar
                    src={profile?.avatar_url}
                    name={profile?.full_name}
                    className="h-8 w-8 text-sm"
                />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-card md:hidden"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-background rounded-2xl shadow-xl border border-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <DropdownHeader profile={profile} />
                    <div className="flex flex-col bg-background">
                        <MenuItem
                            icon={theme === 'dark' ? Sun : Moon}
                            label={theme === 'dark' ? "Modo Claro" : "Modo Escuro"}
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        />
                        <div className="md:hidden">
                            <MenuItem icon={Bell} label="Notificações" href="/notifications" />
                        </div>
                        <MenuItem icon={User} label="Configurações" href="/settings" />
                        <MenuItem 
                            icon={Headphones} 
                            label="Suporte" 
                            onClick={() => {
                                setIsOpen(false);
                                setIsSupportModalOpen(true);
                            }} 
                        />
                        <MenuItem 
                            icon={Users} 
                            label="Trocar Conta" 
                            onClick={() => {
                                setIsOpen(false);
                                setIsModalOpen(true);
                            }} 
                        />
                        <MenuItem icon={LogOut} label="Sair" isRed onClick={handleLogout} />
                    </div>
                </div>
            )}

            <SwitchAccountModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                currentEmail={profile?.email}
            />

            <SupportModal 
                isOpen={isSupportModalOpen} 
                onClose={() => setIsSupportModalOpen(false)} 
            />
        </div>
    );
}
