import { LayoutDashboard, Filter, Users, Package, FileText, Rocket, Settings } from 'lucide-react';

export const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Leads', icon: Filter, href: '/leads' },
    { name: 'Clientes', icon: Users, href: '/clients' },
    { name: 'Produtos', icon: Package, href: '/products' },
    { name: 'Relatórios', icon: FileText, href: '/reports' },
    { name: 'Roadmap', icon: Rocket, href: '/roadmap', roles: ['admin', 'superadmin'] },
    {
        name: 'Configurações',
        icon: Settings,
        href: '/settings',
        subItems: [
            { name: 'Meu Perfil', href: '/settings' },
            { name: 'Equipe', href: '/settings/team', roles: ['admin', 'superadmin'] },
            { name: 'Notificações', href: '/settings?tab=notifications' }
        ]
    },
];
