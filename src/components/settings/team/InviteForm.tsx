'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Mail, Loader2, Phone } from 'lucide-react';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox';
import { createInvitation } from '@/app/_actions/invitations';
import { getProfile } from '@/app/_actions/profile';
import { toast } from 'sonner';

interface InviteFormProps {
    onInviteCreated: () => void;
    isModalMode?: boolean;
}

export function InviteForm({ onInviteCreated, isModalMode = false }: InviteFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'admin' | 'user'>('user');
    const [loading, setLoading] = useState(false);
    const [isSystemContext, setIsSystemContext] = useState(false);

    // Initial permissions state
    const [permissions, setPermissions] = useState<Record<string, boolean>>({
        dashboard: true,
        leads: true,
        clients: true,
        properties: true,
        calendar: true,
        reports: true,
        settings: true
    });

    useEffect(() => {
        async function checkContext() {
            const { profile } = await getProfile();
            if (profile?.tenants?.is_system && profile?.role === 'superadmin') {
                setIsSystemContext(true);
                // Default superadmin permissions
                setPermissions({
                    tenants: true,
                    plans: true,
                    ai_usage: true,
                    global_logs: true,
                    marketing_global: true,
                    roadmap: true,
                    team_management: true
                });
            }
        }
        checkContext();
    }, []);

    const formatPhone = (value: string) => {
        if (!value) return '';
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1 $2');
        }
        return value;
    };

    const cleanPhone = (value: string) => value.replace(/\D/g, '');

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { success, invitation, error, warning } = await createInvitation(email, role, name, permissions, cleanPhone(phone));

        if (error) {
            toast.error(error);
        } else if (warning) {
            toast.error(warning); // Usando error para destacar o aviso de falha no envio
            setEmail('');
            setName('');
            setPhone('');
            onInviteCreated();
        } else {
            toast.success('Convite enviado com sucesso!');
            setEmail('');
            setName('');
            setPhone('');
            setPermissions({
                dashboard: true,
                leads: true,
                clients: true,
                properties: true,
                calendar: true,
                reports: true,
                settings: true
            });
            onInviteCreated();
        }
        setLoading(false);
    };

    const handleRoleChange = (newRole: 'admin' | 'user') => {
        setRole(newRole);
        if (newRole === 'admin') {
            // Full access by default for these roles
            if (isSystemContext) {
                setPermissions({
                    tenants: true,
                    plans: true,
                    ai_usage: true,
                    global_logs: true,
                    marketing_global: true,
                    roadmap: true,
                    team_management: true
                });
            } else {
                setPermissions({
                    dashboard: true,
                    leads: true,
                    clients: true,
                    properties: true,
                    calendar: true,
                    reports: true,
                    settings: true
                });
            }
        }
    };

    const togglePermission = (key: string) => {
        if (role === 'admin') return; 
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const standardLabels: Record<string, string> = {
        dashboard: 'Dashboard',
        leads: 'Leads',
        clients: 'Clientes',
        properties: 'Properties',
        calendar: 'Agenda',
        reports: 'Relatórios',
        settings: 'Configurações'
    };

    const superAdminLabels: Record<string, string> = {
        tenants: 'Empresas',
        plans: 'Planos e Limites',
        ai_usage: 'Uso de IA',
        global_logs: 'Logs Globais',
        marketing_global: 'Marketing Global',
        roadmap: 'Roadmap',
        team_management: 'Gestão da Equipe'
    };

    const labels = isSystemContext ? superAdminLabels : standardLabels;

    return (
        <div className={isModalMode ? "w-full" : "bg-card rounded-2xl shadow-sm border border-border overflow-hidden h-full flex flex-col"}>
            {!isModalMode && (
                <div className="p-6 flex items-center h-[89px]">
                    <h3 className="font-bold text-foreground">Dados Colaborador</h3>
                </div>
            )}

            <form onSubmit={handleInvite} className={`p-6 ${!isModalMode ? 'pt-0' : ''} space-y-4 flex-1 flex flex-col`}>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground ml-1">Nome</label>
                    <FormInput
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        icon={UserPlus}
                        placeholder="Nome Completo"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground ml-1">Email</label>
                    <FormInput
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={Mail}
                        placeholder="exemplo@email.com"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground ml-1">Telefone | WhatsApp</label>
                    <FormInput
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        icon={Phone}
                        placeholder="(00) 00000 0000"
                        maxLength={15}
                    />
                </div>

                <div className="w-full border-t border-border/50 my-2" />

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground ml-1">Nível Acesso</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => handleRoleChange('admin')}
                            className={`py-3 rounded-lg text-sm font-bold border transition-all ${role === 'admin' ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                        >
                            Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRoleChange('user')}
                            className={`py-3 rounded-lg text-sm font-bold border transition-all ${role === 'user' ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                        >
                            {isSystemContext ? 'Suporte' : 'Colaborador'}
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                        {role === 'admin' ? 'Acesso total ao painel administrativo.' : 'Acesso restrito conforme permissões abaixo.'}
                    </p>
                </div>

                <div className="w-full border-t border-border/50 my-2" />

                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground ml-1">Permissões {isSystemContext ? 'Funcionais' : ''}</label>
                    <div className="grid grid-cols-2 gap-2 bg-input/50 p-3 rounded-xl border border-border/50">
                        {Object.entries(labels).map(([key, label]) => (
                            <FormCheckbox
                                key={key}
                                label={label}
                                checked={permissions[key] || false}
                                onChange={() => togglePermission(key)}
                                disabled={role === 'admin'}
                                className={role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}
                            />
                        ))}
                    </div>
                </div>


                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-auto py-3 bg-secondary hover:opacity-90 text-secondary-foreground font-bold rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar Convite'}
                </button>
            </form>
        </div>
    );
}

