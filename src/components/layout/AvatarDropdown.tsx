'use client';

import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Bell, Settings, LogOut, User, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProfile } from '@/app/_actions/profile';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { MenuItem } from './AvatarDropdown/MenuItem';
import { DropdownHeader } from './AvatarDropdown/DropdownHeader';
import { useTheme } from 'next-themes';
import { saveAccount, removeAccount } from '@/lib/utils/multi-account';
import { SwitchAccountModal } from './AvatarDropdown/SwitchAccountModal';

export function AvatarDropdown({ unreadCount = 0 }: { unreadCount?: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();
    const { theme, setTheme } = useTheme();

    const handleLogout = async () => {
        if (profile?.email) {
            removeAccount(profile.email);
        }
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    useEffect(() => {
        const syncAccount = async () => {
            const { profile: fetchedProfile } = await getProfile();
            if (fetchedProfile) {
                setProfile(fetchedProfile);
                
                // Sync with multi-account list
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    saveAccount({
                        email: session.user.email!,
                        name: fetchedProfile.full_name || session.user.email!,
                        avatar_url: fetchedProfile.avatar_url || null,
                        role: fetchedProfile.role || null,
                        tenant_id: fetchedProfile.tenant_id || null,
                        session: session
                    });
                }
            }
        };

        syncAccount();

        const handleProfileUpdate = (event: any) => {
            if (event.detail) {
                setProfile((prev: any) => ({ ...prev, ...event.detail }));
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
        };

        window.addEventListener('profile-updated', handleProfileUpdate);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-card"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-card rounded-2xl shadow-xl border border-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <DropdownHeader profile={profile} />
                    <div className="flex flex-col bg-card">
                        <MenuItem
                            icon={theme === 'dark' ? Sun : Moon}
                            label={theme === 'dark' ? "Modo Claro" : "Modo Escuro"}
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        />
                        <MenuItem icon={Bell} label="Notificações" href="/notifications" />
                        <MenuItem icon={User} label="Configurações" href="/settings" />
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
                currentEmail={profile?.email || profile?.user?.email}
            />
        </div>
    );
}
