import { 
    LayoutDashboard, Filter, Users, Home, Calendar, FileText, 
    Rocket, Settings, StickyNote, Globe, ShieldAlert, Megaphone,
    Building2, ShieldCheck, BrainCircuit, History 
} from 'lucide-react';

export const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { 
        name: 'Empresas', 
        icon: Building2, 
        href: '/superadmin/tenants',
        roles: ['superadmin', 'super_admin', 'super administrador']
    },
    { 
        name: 'Planos e Limites', 
        icon: ShieldCheck, 
        href: '/superadmin/plans',
        roles: ['superadmin', 'super_admin', 'super administrador']
    },
    { 
        name: 'Uso de IA', 
        icon: BrainCircuit, 
        href: '/superadmin/ai',
        roles: ['superadmin', 'super_admin', 'super administrador']
    },
    { 
        name: 'Logs Globais', 
        icon: History, 
        href: '/superadmin/logs',
        roles: ['superadmin', 'super_admin', 'super administrador']
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
        name: 'Site',
        icon: Globe,
        href: '/site',
        roles: ['admin', 'superadmin', 'super_admin', 'super administrador']
    },
    { name: 'Agenda', icon: Calendar, href: '/agenda', roles: ['admin', 'user', 'corretor'] },
    { name: 'Notas', icon: StickyNote, href: '/notes', roles: ['admin', 'user', 'corretor'] },
    { name: 'Relatórios', icon: FileText, href: '/reports' },
    { name: 'Marketing', icon: Megaphone, href: '/marketing' },
    { name: 'Roadmap', icon: Rocket, href: '/roadmap', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'] },
    {
        name: 'Configurações',
        icon: Settings,
        href: '/settings',
        subItems: [
            { name: 'Meu Perfil', href: '/settings' },
            { name: 'Equipe', href: '/settings/team', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'] },
            { name: 'Notificações', href: '/notifications' },
            { name: 'Disparador em Massa', href: '/tools/whatsapp-bulk', roles: ['admin', 'user', 'corretor'] },
            { name: 'Integrações', href: '/settings/integrations' },
            { name: 'Domínio', href: '/settings/domain', roles: ['admin', 'superadmin', 'super_admin', 'super administrador'] },
            { name: 'Logs do Sistema', href: '/settings/logs', roles: ['admin'] },
            { name: 'IAs', href: '/settings/ias', roles: ['admin'] },
            { name: 'Assinatura', href: '/settings/subscription', roles: ['admin'] }
        ]
    },
];
