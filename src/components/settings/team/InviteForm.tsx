'use client';

import { useState } from 'react';
import { UserPlus, Mail, Loader2, Phone } from 'lucide-react';
import { createInvitation } from '@/app/_actions/invitations';
import { MessageBanner } from '@/components/shared/MessageBanner';

interface InviteFormProps {
    onInviteCreated: () => void;
}

export function InviteForm({ onInviteCreated }: InviteFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'admin' | 'user'>('user');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initial permissions state
    const [permissions, setPermissions] = useState({
        dashboard: true,
        leads: true,
        clients: true,
        properties: true,
        calendar: true,
        reports: true,
        settings: false
    });

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { success, invitation, error } = await createInvitation(email, role, name, permissions, phone);

        if (error) {
            setMessage({ type: 'error', text: error });
        } else {
            setMessage({ type: 'success', text: 'Convite gerado com sucesso!' });
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
                settings: false
            });
            onInviteCreated();
        }
        setLoading(false);
    };

    const handleRoleChange = (newRole: 'admin' | 'user') => {
        setRole(newRole);
        if (newRole === 'admin') {
            // Admin has all permissions by default
            setPermissions({
                dashboard: true,
                leads: true,
                clients: true,
                properties: true,
                calendar: true,
                reports: true,
                settings: true
            });
        } else {
            // Reset to default user permissions
            setPermissions({
                dashboard: true,
                leads: true,
                clients: true,
                properties: true,
                calendar: true,
                reports: true,
                settings: false
            });
        }
    };

    const togglePermission = (key: keyof typeof permissions) => {
        if (role === 'admin') return; // Admins cannot have permissions removed in this UI
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const permissionLabels: Record<keyof typeof permissions, string> = {
        dashboard: 'Dashboard',
        leads: 'Leads',
        clients: 'Clientes',
        properties: 'Imóveis',
        calendar: 'Agenda',
        reports: 'Relatórios',
        settings: 'Configurações'
    };

    return (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-6 h-full flex flex-col">
            <div className="flex items-center gap-3 text-foreground">
                <h3 className="font-bold">Novo Convite</h3>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 flex-1 flex flex-col">
                {message && <MessageBanner type={message.type} text={message.text} />}

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground ml-1">Nome do Colaborador</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <UserPlus className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all font-medium"
                            placeholder="Nome Completo"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground ml-1">Email do Colaborador</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all font-medium"
                            placeholder="exemplo@email.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground ml-1">Telefone / WhatsApp</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-secondary/50 outline-none transition-all font-medium"
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground ml-1">Nível de Acesso</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => handleRoleChange('admin')}
                            className={`py-3 rounded-lg text-sm font-bold border transition-all ${role === 'admin' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                        >
                            Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRoleChange('user')}
                            className={`py-3 rounded-lg text-sm font-bold border transition-all ${role === 'user' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                        >
                            Usuário
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                        {role === 'admin' ? 'Acesso total ao sistema.' : 'Acesso restrito conforme permissões abaixo.'}
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground ml-1">Permissões de Acesso</label>
                    <div className="grid grid-cols-2 gap-2 bg-input/50 p-3 rounded-xl border border-border/50">
                        {Object.entries(permissionLabels).map(([key, label]) => (
                            <label key={key} className={`flex items-center gap-2 text-sm p-1.5 rounded-lg transition-colors cursor-pointer ${role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`}>
                                <input
                                    type="checkbox"
                                    checked={permissions[key as keyof typeof permissions]}
                                    onChange={() => togglePermission(key as keyof typeof permissions)}
                                    disabled={role === 'admin'}
                                    className="rounded border-gray-300 text-secondary focus:ring-secondary"
                                />
                                <span className="font-medium text-muted-foreground">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>


                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-auto py-3 bg-secondary hover:opacity-90 text-secondary-foreground font-bold rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar Link de Convite'}
                </button>
            </form>
        </div>
    );
}

