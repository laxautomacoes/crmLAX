'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { menuItems } from './Sidebar/menuItems';
import { Logo } from '@/components/shared/Logo';
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
    const [userRole, setUserRole] = useState<string | null>(null);
    const [tenantSlug, setTenantSlug] = useState<string | null>(null);
    const [branding, setBranding] = useState<{ logo_full?: string; logo_icon?: string; logo_height?: number } | null>(null);
    const [brandingLoading, setBrandingLoading] = useState(true);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    useEffect(() => {
        async function fetchData() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Buscar Role
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role, tenant_id')
                        .eq('id', user.id)
                        .maybeSingle();

                    setUserRole(profile?.role || 'user');

                    // Buscar Slug e Branding do Tenant
                    if (profile?.tenant_id) {
                        const { data: tenant } = await supabase
                            .from('tenants')
                            .select('slug, branding')
                            .eq('id', profile.tenant_id)
                            .maybeSingle();

                        if (tenant?.slug) {
                            setTenantSlug(tenant.slug);
                        }
                        if (tenant?.branding) {
                            setBranding(tenant.branding as any);
                        }
                    }
                }
            } finally {
                setBrandingLoading(false);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        const activeItem = menuItems.find(item =>
            item.subItems?.some(sub => sub.href === pathname ||
                (sub.href.includes('?') && pathname === sub.href.split('?')[0] && searchParams.toString().includes(sub.href.split('?')[1])))
        );
        if (activeItem && !expandedItems.includes(activeItem.name))
            setExpandedItems(prev => [...prev, activeItem.name]);
    }, [pathname, searchParams]);

    // Filtragem de itens do menu baseada em roles e injeção de slug
    const filteredMenuItems = menuItems
        .filter(item => {
            if ((item as any).roles) {
                return (item as any).roles.includes(userRole?.toLowerCase());
            }
            return true;
        })
        .map(item => {
            const newItem = { ...item };
            if (newItem.subItems) {
                newItem.subItems = newItem.subItems
                    .filter(sub => {
                        if ((sub as any).roles) {
                            return (sub as any).roles.includes(userRole?.toLowerCase());
                        }
                        return true;
                    })
                    .map(sub => {
                        // Se for o link do site, injetar o slug real
                        if (sub.name === 'Site') {
                            return {
                                ...sub,
                                href: tenantSlug ? `/site/${tenantSlug}` : '#',
                                isExternal: true
                            };
                        }
                        return sub;
                    });
            }
            return newItem;
        });

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
            <div className={`fixed inset-y-0 left-0 z-50 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col transition-all duration-300 md:translate-x-0 md:static ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}>
                <div className="py-4 px-6 flex items-center relative justify-center border-b border-border/50">
                    <div className="flex items-center justify-center">
                        {isCollapsed ? (
                            branding?.logo_icon ? (
                                <img src={branding.logo_icon} alt="Icon" className="h-8 w-auto" />
                            ) : (
                                <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center text-secondary-foreground font-bold">L</div>
                            )
                        ) : (
                            <Logo 
                                size="md" 
                                src={branding?.logo_full} 
                                height={branding?.logo_height} 
                                loading={brandingLoading}
                            />
                        )}
                    </div>
                    <button onClick={onClose} className="md:hidden absolute right-4"><X size={24} /></button>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {filteredMenuItems.map(item => (
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
