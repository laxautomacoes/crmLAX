import { 
    LayoutDashboard, Filter, Users, Home, Calendar, FileText, 
    Settings, StickyNote, Globe, Megaphone,
    Building2, ShieldCheck, History, Coins, CircleDollarSign 
} from 'lucide-react';

export const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', permission: 'dashboard' },
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
    { name: 'Leads', icon: Filter, href: '/leads', roles: ['admin', 'user', 'corretor'], permission: 'leads' },
    { name: 'Clientes', icon: Users, href: '/clients', roles: ['admin', 'user', 'corretor'], permission: 'clients' },
    {
        name: 'Imóveis',
        icon: Home,
        href: '/properties',
        roles: ['admin', 'user', 'corretor'],
        permission: 'properties',
        subItems: [
            { name: 'Listagem', href: '/properties' },
            { name: 'Análise Valor m²', href: '/properties/analysis' },
        ]
    },
    { name: 'Propostas', icon: FileText, href: '/proposals', roles: ['admin', 'user', 'corretor'], permission: 'proposals' },
    { 
        name: 'Marketing', 
        icon: Megaphone, 
        href: '/marketing/studio', 
        permission: 'marketing',
        subItems: [
            { name: 'Estúdio Criação', href: '/marketing/studio' },
            { name: 'Disparador WhatsApp', href: '/marketing/bulk-sender' },
            { name: 'Disparador Email', href: '/marketing/email-bulk' },
            { name: 'Follow-Up', href: '/marketing/follow-up' },
        ]
    },
    {
        name: 'Site',
        icon: Globe,
        href: '/site',
        roles: ['admin', 'superadmin', 'super_admin', 'super administrador'],
        permission: 'site'
    },
    { name: 'Agenda', icon: Calendar, href: '/agenda', roles: ['admin', 'user', 'corretor'], permission: 'calendar' },
    { name: 'Notas', icon: StickyNote, href: '/notes', roles: ['admin', 'user', 'corretor'], permission: 'notes' },
    { name: 'Financeiro', icon: CircleDollarSign, href: '/financeiro', roles: ['admin'], permission: 'financeiro' },
    { name: 'Relatórios', icon: FileText, href: '/reports', permission: 'reports' },
    {
        name: 'Configurações',
        icon: Settings,
        href: '/settings',
        permission: 'settings',
        subItems: [
            { name: 'Meu Perfil', href: '/settings' },
            { name: 'E-mail', href: '/settings/emails', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'] },
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

