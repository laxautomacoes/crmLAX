'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { LayoutDashboard, Filter, Users, Package, FileText, Rocket, Settings, LogOut, LifeBuoy, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Funil / Pipeline', icon: Filter, href: '/dashboard/funnel' },
    { name: 'Clientes', icon: Users, href: '/dashboard/clients' },
    { name: 'Produtos', icon: Package, href: '/dashboard/products' },
    { name: 'Relatórios', icon: FileText, href: '/dashboard/reports' },
    { name: 'Roadmap', icon: Rocket, href: '/dashboard/roadmap' },
    {
        name: 'Configurações',
        icon: Settings,
        href: '/dashboard/settings',
        subItems: [
            { name: 'Meu Perfil', href: '/dashboard/settings' },
            { name: 'Notificações', href: '/dashboard/settings?tab=notifications' }
        ]
    },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed, toggleCollapse }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    // Auto-expand if child is active
    useEffect(() => {
        const activeItem = menuItems.find(item =>
            item.subItems?.some(sub =>
                sub.href === pathname ||
                (sub.href.includes('?') && pathname === sub.href.split('?')[0] && searchParams.toString().includes(sub.href.split('?')[1]))
            )
        );
        if (activeItem && !expandedItems.includes(activeItem.name)) {
            setExpandedItems(prev => [...prev, activeItem.name]);
        }
    }, [pathname, searchParams]);

    const toggleExpand = (name: string) => {
        setExpandedItems(prev =>
            prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <div className={`
        fixed inset-y-0 left-0 z-50 bg-[#404F4F] text-white flex flex-col transition-all duration-300 ease-in-out 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:inset-auto md:flex
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        w-64
      `}>
                <div className={`p-6 flex items-center relative ${isCollapsed ? 'justify-center' : 'justify-center'}`}>
                    {!isCollapsed ? (
                        <h1 className="text-2xl font-bold text-[#FFE600] whitespace-nowrap overflow-hidden transition-all duration-300">CRM LAX</h1>
                    ) : (
                        <h1 className="text-xl font-bold text-[#FFE600]">L</h1>
                    )}

                    <button onClick={onClose} className="md:hidden text-gray-300 hover:text-white absolute right-4">
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Navigation */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const isExpanded = expandedItems.includes(item.name);
                        const hasSubItems = !!item.subItems;

                        // Check if main item is active or any subitem is active
                        // Correctly checking if any child is active to highlight parent if valid
                        const isChildActive = item.subItems?.some(sub =>
                            sub.href === pathname ||
                            (sub.href.includes('?') && pathname === sub.href.split('?')[0] && searchParams.toString().includes(sub.href.split('?')[1]))
                        );

                        const isActive = pathname === item.href || isChildActive;

                        return (
                            <div key={item.name}>
                                {hasSubItems ? (
                                    <button
                                        onClick={() => !isCollapsed && toggleExpand(item.name)}
                                        title={isCollapsed ? item.name : ''}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-sm font-medium
                                    ${isActive
                                                ? 'text-[#FFE600]' // Parent active color (yellow if child active)
                                                : 'text-gray-300 hover:bg-[#4A5A5A] hover:text-white'
                                            }
                                    ${isCollapsed ? 'justify-center' : ''}
                                    `}
                                    >
                                        <item.icon size={20} className="shrink-0" />
                                        {!isCollapsed && (
                                            <>
                                                <span className="whitespace-nowrap overflow-hidden flex-1 text-left">{item.name}</span>
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <Link
                                        href={item.href}
                                        title={isCollapsed ? item.name : ''}
                                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-sm font-medium
                                    ${isActive
                                                ? 'bg-[#556767] text-white'
                                                : 'text-gray-300 hover:bg-[#4A5A5A] hover:text-white'
                                            }
                                    ${isCollapsed ? 'justify-center' : ''}
                                    `}
                                    >
                                        <item.icon size={20} className="shrink-0" />
                                        {!isCollapsed && <span className="whitespace-nowrap overflow-hidden transition-opacity duration-300">{item.name}</span>}
                                    </Link>
                                )}

                                {/* Subitems */}
                                {!isCollapsed && hasSubItems && isExpanded && (
                                    <div className="ml-9 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        {item.subItems!.map((sub) => {
                                            // Determine if this sub-item is active
                                            // logic: 
                                            // 1. If link has query params (e.g. ?tab=notifications), strict match on tab param
                                            // 2. If link is clean (e.g. /settings), ensure NO tab param is present (default tab)
                                            const isParamLink = sub.href.includes('?');
                                            let isActive = false;

                                            if (isParamLink) {
                                                const [path, params] = sub.href.split('?');
                                                const targetTab = new URLSearchParams(params).get('tab');
                                                isActive = pathname === path && searchParams.get('tab') === targetTab;
                                            } else {
                                                // For standard links, we want to match exact path.
                                                // Crucially for settings: 'Meu Perfil' (/settings) should NOT be active if ?tab=notifications is present.
                                                // So we check if searchParams has 'tab' when the path matches /dashboard/settings
                                                if (sub.href === '/dashboard/settings') {
                                                    isActive = pathname === sub.href && !searchParams.has('tab');
                                                } else {
                                                    isActive = pathname === sub.href;
                                                }
                                            }

                                            return (
                                                <Link
                                                    key={sub.name}
                                                    href={sub.href}
                                                    className={`block px-3 py-2 text-sm rounded-lg transition-colors
                                                      ${isActive
                                                            ? 'text-[#FFE600] font-medium'
                                                            : 'text-gray-400 hover:text-white'
                                                        }
                                                    `}
                                                >
                                                    {sub.name}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Fixed Footer */}
                <div className="p-6 mt-auto">
                    <button className={`flex items-center gap-3 text-gray-300 hover:text-white text-sm w-full transition-colors ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? "Suporte" : ""}>
                        <LifeBuoy size={20} className="shrink-0" />
                        {!isCollapsed && <span>Suporte</span>}
                    </button>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 text-red-400 hover:text-red-300 text-sm mt-4 w-full transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? "Sair" : ""}
                    >
                        <LogOut size={20} className="shrink-0" />
                        {!isCollapsed && <span>Sair</span>}
                    </button>
                </div>
            </div>
        </>
    );
}
