'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { X, Headphones, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { menuItems } from './Sidebar/menuItems';
import { Logo } from '@/components/shared/Logo';
import { NavItem } from './Sidebar/NavItem';
import { recordAccessLog } from '@/app/_actions/auth-logs';
import { SupportModal } from '@/components/shared/SupportModal';
import { useProfile } from './ProfileContext';

interface SidebarProps {
    isOpen: boolean; onClose: () => void; isCollapsed: boolean; toggleCollapse: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();
    // Usar contexto centralizado em vez de queries independentes
    const { profile: ctxProfile, tenant: ctxTenant, loading: ctxLoading } = useProfile();
    const userRole = ctxProfile?.role || null;
    const userProfile = ctxProfile;
    const tenantSlug = ctxTenant?.slug || null;
    const branding = ctxTenant?.branding || null;
    const brandingLoading = ctxLoading;

    // Calcular siteUrl baseado nos dados do contexto
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [siteUrl, setSiteUrl] = useState<string>('#');
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

    useEffect(() => {
        if (ctxProfile && ctxTenant) {
            const isSuperAdmin = ['superadmin', 'super_admin', 'super administrador'].includes(ctxProfile.role?.toLowerCase() || '');
            if (isSuperAdmin) {
                setSiteUrl('/conheca');
            } else if (ctxTenant.custom_domain && ctxTenant.custom_domain_verified) {
                setSiteUrl(`https://${ctxTenant.custom_domain}`);
            } else if (ctxTenant.slug) {
                setSiteUrl(`/site/${ctxTenant.slug}`);
            }
        }
    }, [ctxProfile, ctxTenant]);

    useEffect(() => {
        const activeItem = menuItems.find(item =>
            item.subItems?.some(sub => sub.href === pathname ||
                (sub.href.includes('?') && pathname === sub.href.split('?')[0] && searchParams.toString().includes(sub.href.split('?')[1])))
        );
        if (activeItem && !expandedItems.includes(activeItem.name))
            setExpandedItems(prev => [...prev, activeItem.name]);
    }, [pathname, searchParams]);

    // Filtragem de itens do menu baseada em roles, permissões e injeção de slug
    const filteredMenuItems = menuItems
        .filter(item => {
            // Se o item tem roles definidos, verificar se o usuário tem a role necessária
            if ((item as any).roles) {
                const hasRole = (item as any).roles.includes(userRole?.toLowerCase());
                if (!hasRole) return false;
            }

            // Se o item tem uma permissão específica
            if ((item as any).permission) {
                const permissions = userProfile?.permissions || {};
                // Se a permissão estiver como false, esconder o item
                if (permissions[(item as any).permission] === false) return false;
            }

            return true;
        })
        .map(item => {
            const newItem = { ...item };

            // Redireciona o dashboard para superadmin
            if (newItem.name === 'Dashboard') {
                const isSuperAdmin = ['superadmin', 'super_admin', 'super administrador'].includes(userRole?.toLowerCase() || '');
                if (isSuperAdmin) {
                    newItem.href = '/superadmin/dashboard';
                }
            }

            // Redireciona os relatórios para superadmin
            if (newItem.name === 'Relatórios') {
                const isSuperAdmin = ['superadmin', 'super_admin', 'super administrador'].includes(userRole?.toLowerCase() || '');
                if (isSuperAdmin) {
                    newItem.href = '/superadmin/reports';
                }
            }

            if (newItem.subItems) {
                newItem.subItems = newItem.subItems
                    .filter(sub => {
                        if ((sub as any).roles) {
                            const hasRole = (sub as any).roles.includes(userRole?.toLowerCase());
                            if (!hasRole) return false;
                        }

                        // Verificação de permissão para sub-itens
                        if ((sub as any).permission) {
                            const permissions = userProfile?.permissions || {};
                            if (permissions[(sub as any).permission] === false) return false;
                        }

                        return true;
                    })
                    .map(sub => {
                        // Se for o link do site, injetar o slug real ou domínio customizado
                        if (sub.name === 'Site') {
                            return {
                                ...sub,
                                href: siteUrl,
                                isExternal: true
                            };
                        }
                        return sub;
                    });
            }
            return newItem;
        });

    // No mobile, sempre mostrar os títulos (isCollapsed só vale para desktop)
    const effectiveCollapsed = isOpen ? false : isCollapsed;

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
            <div className={`sidebar fixed inset-y-0 left-0 z-50 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col transition-all duration-300 md:translate-x-0 md:static ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}>
                <div className="h-16 px-6 flex items-center relative justify-center border-b border-border/10 flex-none">
                    <div className="flex items-center justify-center">
                        {effectiveCollapsed ? (
                            branding?.logo_icon ? (
                                <img src={branding.logo_icon} alt="Icon" className="h-8 w-auto" />
                            ) : (
                                <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center text-secondary-foreground font-bold">L</div>
                            )
                        ) : (
                            <Logo
                                size="md"
                                src={branding?.logo_header || branding?.logo_full}
                                height={branding?.logo_header_height || (branding?.logo_header ? 40 : branding?.logo_height || 40)}
                                loading={brandingLoading}
                            />
                        )}
                    </div>
                    <button onClick={onClose} className="md:hidden absolute right-4"><X size={24} /></button>
                </div>

                <nav className="flex-1 px-3 pt-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {filteredMenuItems.map(item => (
                        <NavItem
                            key={item.name} item={item} pathname={pathname} searchParams={searchParams}
                            isCollapsed={effectiveCollapsed} isExpanded={expandedItems.includes(item.name)}
                            onToggleExpand={(name) => setExpandedItems(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name])}
                            onClose={onClose}
                        />
                    ))}
                </nav>

                <div className="p-3 space-y-1">
                    <button
                        onClick={() => setIsSupportModalOpen(true)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-base font-medium text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground ${effectiveCollapsed ? 'justify-center' : ''}`}
                        title={effectiveCollapsed ? "Suporte" : ""}
                    >
                        <Headphones size={18} strokeWidth={1} className="shrink-0" />
                        {!effectiveCollapsed && <span className="flex-1 text-left whitespace-nowrap overflow-hidden transition-opacity duration-300">Suporte</span>}
                    </button>

                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/login');
                            router.refresh();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-base font-medium text-rose-500/90 hover:bg-rose-500/10 hover:text-rose-500 ${effectiveCollapsed ? 'justify-center' : ''}`}
                        title={effectiveCollapsed ? "Sair" : ""}
                    >
                        <LogOut size={18} strokeWidth={1} className="shrink-0" />
                        {!effectiveCollapsed && <span className="flex-1 text-left whitespace-nowrap overflow-hidden transition-opacity duration-300">Sair</span>}
                    </button>
                </div>
            </div>
            
            <SupportModal 
                isOpen={isSupportModalOpen} 
                onClose={() => setIsSupportModalOpen(false)} 
            />
        </>
    );
}
