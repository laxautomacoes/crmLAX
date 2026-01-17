import { LayoutDashboard, Filter, Users, Package, FileText, Rocket, Settings } from 'lucide-react';

export const menuItems = [
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
            { name: 'Time', href: '/dashboard/settings/team' },
            { name: 'Notificações', href: '/dashboard/settings?tab=notifications' }
        ]
    },
];
