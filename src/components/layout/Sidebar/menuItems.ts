import { 
    LayoutDashboard, Filter, Users, Home, Calendar, FileText, 
    Rocket, Settings, StickyNote, Globe, ShieldAlert, Megaphone,
    Building2, ShieldCheck, BrainCircuit, History, Coins 
} from 'lucide-react';

export const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { 
        name: 'Empresas', 
        icon: Building2, 
        href: '/superadmin/tenants',
        roles: ['superadmin', 'super_admin', 'super administrador'],
        permission: 'tenants'
    },
    { 
        name: 'Planos e Limites', 
        icon: ShieldCheck, 
        href: '/superadmin/plans',
        roles: ['superadmin', 'super_admin', 'super administrador'],
        permission: 'plans'
    },
    { 
        name: 'Uso de IA', 
        icon: Coins, 
        href: '/superadmin/ai',
        roles: ['superadmin', 'super_admin', 'super administrador'],
        permission: 'ai_usage'
    },
    { 
        name: 'Logs Globais', 
        icon: History, 
        href: '/superadmin/logs',
        roles: ['superadmin', 'super_admin', 'super administrador'],
        permission: 'global_logs'
    },
    { name: 'Leads', icon: Filter, href: '/leads', roles: ['admin', 'user', 'corretor'] },
    { name: 'Clientes', icon: Users, href: '/clients', roles: ['admin', 'user', 'corretor'] },
    {
        name: 'Imóveis',
        icon: Home,
        href: '/properties',
        roles: ['admin', 'user', 'corretor'],
        subItems: [
            { name: 'Listagem', href: '/properties' },
            { name: 'Análise de m²', href: '/properties/analysis' },
        ]
    },
    { 
        name: 'Marketing', 
        icon: Megaphone, 
        href: '/marketing', 
        permission: 'marketing_global',
        subItems: [
            { name: 'Estúdio de Criação', href: '/marketing/studio' },
            { name: 'Disparador em Massa', href: '/marketing/bulk-sender' },
        ]
    },
    {
        name: 'Site',
        icon: Globe,
        href: '/site',
        roles: ['admin', 'superadmin', 'super_admin', 'super administrador']
    },
    { name: 'Agenda', icon: Calendar, href: '/agenda', roles: ['admin', 'user', 'corretor'] },
    { name: 'Notas', icon: StickyNote, href: '/notes', roles: ['admin', 'user', 'corretor'] },
    { name: 'Relatórios', icon: FileText, href: '/reports' },
    {
        name: 'Configurações',
        icon: Settings,
        href: '/settings',
        subItems: [
            { name: 'Meu Perfil', href: '/settings' },
            { name: 'Equipe', href: '/settings/team', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'], permission: 'team_management' },
            { name: 'Notificações', href: '/notifications' },
            { name: 'Integrações', href: '/settings/integrations' },
            { name: 'Domínio', href: '/settings/domain', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'] },
            { name: 'IAs', href: '/settings/ias', roles: ['admin'] },
            { name: 'Assinatura', href: '/settings/subscription', roles: ['admin'] },
            { name: 'Roadmap', href: '/roadmap', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'], permission: 'roadmap' },
            { name: 'Logs do Sistema', href: '/settings/logs', roles: ['admin'] }
        ]
    },
];
