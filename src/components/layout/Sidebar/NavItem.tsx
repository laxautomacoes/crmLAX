'use client';

import Link from 'next/link';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface NavItemProps {
    item: any;
    pathname: string;
    searchParams: any;
    isCollapsed: boolean;
    isExpanded: boolean;
    onToggleExpand: (name: string) => void;
    onClose: () => void;
}

export function NavItem({ item, pathname, searchParams, isCollapsed, isExpanded, onToggleExpand, onClose }: NavItemProps) {
    const isChildActive = item.subItems?.some((sub: any) =>
        sub.href === pathname ||
        (sub.href.includes('?') && pathname === sub.href.split('?')[0] && searchParams.toString().includes(sub.href.split('?')[1]))
    );
    const isActive = pathname === item.href || isChildActive;

    if (item.subItems) {
        return (
            <div>
                <button
                    onClick={() => !isCollapsed && onToggleExpand(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-base font-medium ${isActive ? 'text-secondary' : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground'} ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.name : ''}
                >
                    <item.icon size={20} className="shrink-0" />
                    {!isCollapsed && (
                        <>
                            <span className="flex-1 text-left">{item.name}</span>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </>
                    )}
                </button>
                {!isCollapsed && isExpanded && (
                    <div className="ml-9 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {item.subItems.map((sub: any) => {
                            const isParamLink = sub.href.includes('?');
                            let subActive = false;
                            if (isParamLink) {
                                const [path, params] = sub.href.split('?');
                                const targetTab = new URLSearchParams(params).get('tab');
                                subActive = pathname === path && searchParams.get('tab') === targetTab;
                            } else {
                                subActive = sub.href === '/settings' ? (pathname === sub.href && !searchParams.has('tab')) : pathname === sub.href;
                            }
                            return (
                                <Link
                                    key={sub.name}
                                    href={sub.href}
                                    target={sub.isExternal ? "_blank" : undefined}
                                    rel={sub.isExternal ? "noopener noreferrer" : undefined}
                                    onClick={onClose}
                                    className={`block px-3 py-2 text-base rounded-lg transition-colors ${subActive ? 'text-secondary font-medium' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground'}`}
                                >
                                    {sub.name}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-base font-medium ${isActive ? 'bg-white/10 text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground'} ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? item.name : ''}
        >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap overflow-hidden transition-opacity duration-300">{item.name}</span>}
        </Link>
    );
}
