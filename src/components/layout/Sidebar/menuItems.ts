import { LayoutDashboard, Filter, Users, Home, Calendar, FileText, Rocket, Settings, StickyNote } from 'lucide-react';

export const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Leads', icon: Filter, href: '/leads' },
    { name: 'Clientes', icon: Users, href: '/clients' },
    {
        name: 'Imóveis',
        icon: Home,
        href: '/properties',
        subItems: [
            { name: 'Listagem', href: '/properties' },
            { name: 'Site', href: '/site-link' } // Link temporário que será tratado no Sidebar
        ]
    },
    { name: 'Agenda', icon: Calendar, href: '/agenda' },
    { name: 'Notas', icon: StickyNote, href: '/notes' },
    { name: 'Relatórios', icon: FileText, href: '/reports' },
    { name: 'Roadmap', icon: Rocket, href: '/roadmap', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'] },
    {
        name: 'Configurações',
        icon: Settings,
        href: '/settings',
        subItems: [
            { name: 'Meu Perfil', href: '/settings' },
            { name: 'Equipe', href: '/settings/team', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'] },
            { name: 'Notificações', href: '/notifications' },
            { name: 'Disparador em Massa', href: '/tools/whatsapp-bulk' },
            { name: 'Integrações', href: '/settings/integrations' },
            { name: 'Assinatura', href: '/settings/subscription', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'] }
        ]
    },
];
