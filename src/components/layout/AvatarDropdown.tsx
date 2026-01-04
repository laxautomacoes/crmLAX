'use client';

import { useState, useRef, useEffect } from 'react';
import { Moon, Bell, Settings, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProfile } from '@/app/_actions/profile';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { MenuItem } from './AvatarDropdown/MenuItem';
import { DropdownHeader } from './AvatarDropdown/DropdownHeader';

export function AvatarDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    useEffect(() => {
        getProfile().then((data) => {
            if (data.profile) setProfile(data.profile);
        });

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404F4F] rounded-full"
            >
                <UserAvatar
                    src={profile?.avatar_url}
                    name={profile?.full_name}
                    className="h-8 w-8 text-sm"
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <DropdownHeader profile={profile} />
                    <div className="flex flex-col bg-white">
                        <MenuItem icon={Moon} label="Modo Escuro" onClick={() => { }} />
                        <MenuItem icon={Bell} label="Notificações" href="/dashboard/settings?tab=notifications" />
                        <MenuItem icon={User} label="Configurações" href="/dashboard/settings" />
                        <MenuItem icon={LogOut} label="Sair" isRed onClick={handleLogout} />
                    </div>
                </div>
            )}
        </div>
    );
}
