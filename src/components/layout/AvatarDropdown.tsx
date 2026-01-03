'use client';

import { useState, useRef, useEffect } from 'react';
import { Moon, Bell, Settings, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { getProfile } from '@/app/_actions/profile';

export function AvatarDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        async function loadData() {
            const { profile } = await getProfile();
            if (profile) setProfile(profile);
        }
        loadData();
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper component for menu items
    const MenuItem = ({
        icon: Icon,
        label,
        onClick,
        href,
        isRed = false
    }: {
        icon: any,
        label: string,
        onClick?: () => void,
        href?: string,
        isRed?: boolean
    }) => {
        const content = (
            <div className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${isRed ? 'text-red-500' : 'text-gray-700'}`}>
                <div className={`p-2 rounded-full border ${isRed ? 'border-red-100 bg-red-50' : 'border-gray-200 bg-white'}`}>
                    <Icon size={20} className={isRed ? 'text-red-500' : 'text-gray-700'} />
                </div>
                <span className="font-medium text-sm">{label}</span>
            </div>
        );

        if (href) {
            return (
                <Link href={href} className="block">
                    {content}
                </Link>
            );
        }

        return (
            <button onClick={onClick} className="w-full text-left block">
                {content}
            </button>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 w-8 rounded-full bg-[#404F4F] flex items-center justify-center text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404F4F] relative overflow-hidden"
            >
                {profile?.avatar_url ? (
                    <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span>{profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'LA'}</span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {/* Header */}
                    <div className="flex items-center gap-4 p-5 border-b border-gray-100 bg-white">
                        {/* Avatar/Logo - Considere o ícone "LAX" como o mesmo ícone do avatar */}
                        <div className="h-12 w-12 rounded-full bg-[#404F4F] flex flex-shrink-0 items-center justify-center text-white font-bold text-lg overflow-hidden">
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt="Avatar"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span>{profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'LA'}</span>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-base font-bold text-gray-900 truncate">
                                {profile?.full_name || 'Léo Acosta'}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                                {profile?.email || 'leocrm@lax.com'}
                                {/* Note: email might not be in profile table, usually in auth.users. 
                                    But we don't have email in profiles table based on schema.
                                    Assuming we might want to fetch it or just keep hardcoded for now 
                                    if not in public profile. 
                                    Wait, line 78 says leocrm@lax.com.
                                    I will keep the hardcoded fallback or empty string.
                                */}
                            </p>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="flex flex-col bg-white">
                        <MenuItem icon={Moon} label="Modo Escuro" onClick={() => { }} />
                        <MenuItem icon={Bell} label="Notificações" href="/dashboard/settings?tab=notifications" />
                        <MenuItem icon={User} label="Configurações" href="/dashboard/settings" />
                        <MenuItem icon={LogOut} label="Sair" isRed onClick={() => { }} />
                    </div>
                </div>
            )}
        </div>
    );
}
