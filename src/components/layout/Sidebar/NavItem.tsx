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
}

export function NavItem({ item, pathname, searchParams, isCollapsed, isExpanded, onToggleExpand }: NavItemProps) {
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
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-sm font-medium ${isActive ? 'text-[#FFE600]' : 'text-gray-300 hover:bg-[#4A5A5A] hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`}
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
                                subActive = sub.href === '/dashboard/settings' ? (pathname === sub.href && !searchParams.has('tab')) : pathname === sub.href;
                            }
                            return (
                                <Link key={sub.name} href={sub.href} className={`block px-3 py-2 text-sm rounded-lg transition-colors ${subActive ? 'text-[#FFE600] font-medium' : 'text-gray-400 hover:text-white'}`}>
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
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-sm font-medium ${isActive ? 'bg-[#556767] text-white' : 'text-gray-300 hover:bg-[#4A5A5A] hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? item.name : ''}
        >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap overflow-hidden transition-opacity duration-300">{item.name}</span>}
        </Link>
    );
}
