'use client';

import { LifeBuoy, LogOut } from 'lucide-react';

interface FooterProps {
    isCollapsed: boolean;
    onLogout: () => void;
}

export function Footer({ isCollapsed, onLogout }: FooterProps) {
    return (
        <div className="px-3 py-6 mt-auto">
            <button
                className={`flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white text-base w-full transition-colors rounded-lg ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? "Suporte" : ""}
            >
                <LifeBuoy size={20} className="shrink-0" />
                {!isCollapsed && <span>Suporte</span>}
            </button>
            <button
                onClick={onLogout}
                className={`flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 text-base mt-1 w-full transition-colors rounded-lg ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? "Sair" : ""}
            >
                <LogOut size={20} className="shrink-0" />
                {!isCollapsed && <span>Sair</span>}
            </button>
        </div>
    );
}
