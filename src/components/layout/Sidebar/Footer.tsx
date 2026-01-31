'use client';

import { LifeBuoy, LogOut } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface FooterProps {
    isCollapsed: boolean;
    onLogout: () => void;
    onClose: () => void;
    onSupportClick?: () => void;
    profile?: any;
}

export function Footer({ isCollapsed, onLogout, onClose, onSupportClick, profile }: FooterProps) {
    return (
        <div className="px-3 py-6 mt-auto border-t border-border/50">
            <button
                onClick={() => {
                    onSupportClick?.();
                    onClose();
                }}
                className={`flex items-center gap-3 px-3 py-2 text-sidebar-foreground/70 hover:text-sidebar-foreground text-base w-full transition-colors rounded-lg ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? "Suporte" : ""}
            >
                <LifeBuoy size={20} className="shrink-0" />
                {!isCollapsed && <span>Suporte</span>}
            </button>
            <button
                onClick={onLogout}
                className={`flex items-center gap-3 px-3 py-2 text-red-500 hover:text-red-400 text-base mt-1 w-full transition-colors rounded-lg ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? "Sair" : ""}
            >
                {isCollapsed ? (
                    <LogOut size={20} className="shrink-0" />
                ) : (
                    <div className="flex items-center gap-3">
                        <UserAvatar 
                            src={profile?.avatar_url} 
                            name={profile?.full_name} 
                            className="h-8 w-8 text-xs font-bold"
                        />
                        <span className="font-medium">Sair</span>
                    </div>
                )}
            </button>
        </div>
    );
}
