'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { menuItems } from './Sidebar/menuItems';
import { NavItem } from './Sidebar/NavItem';
import { Footer } from './Sidebar/Footer';

interface SidebarProps {
    isOpen: boolean; onClose: () => void; isCollapsed: boolean; toggleCollapse: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps) {
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

    useEffect(() => {
        const activeItem = menuItems.find(item =>
            item.subItems?.some(sub => sub.href === pathname ||
                (sub.href.includes('?') && pathname === sub.href.split('?')[0] && searchParams.toString().includes(sub.href.split('?')[1])))
        );
        if (activeItem && !expandedItems.includes(activeItem.name))
            setExpandedItems(prev => [...prev, activeItem.name]);
    }, [pathname, searchParams]);

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
            <div className={`fixed inset-y-0 left-0 z-50 bg-[#404F4F] text-white flex flex-col transition-all duration-300 md:translate-x-0 md:static ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}>
                <div className="p-6 flex items-center relative justify-center">
                    <h1 className={`${isCollapsed ? 'text-xl' : 'text-2xl'} font-bold text-[#FFE600]`}>{isCollapsed ? 'L' : 'CRM LAX'}</h1>
                    <button onClick={onClose} className="md:hidden absolute right-4"><X size={24} /></button>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map(item => (
                        <NavItem
                            key={item.name} item={item} pathname={pathname} searchParams={searchParams}
                            isCollapsed={isCollapsed} isExpanded={expandedItems.includes(item.name)}
                            onToggleExpand={(name) => setExpandedItems(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name])}
                        />
                    ))}
                </nav>

                <Footer isCollapsed={isCollapsed} onLogout={handleLogout} />
            </div>
        </>
    );
}
