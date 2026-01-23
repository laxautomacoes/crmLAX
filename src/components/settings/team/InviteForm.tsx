'use client';

import { useState } from 'react';
import { UserPlus, Mail, Loader2 } from 'lucide-react';
import { createInvitation } from '@/app/_actions/invitations';
import { MessageBanner } from '@/components/shared/MessageBanner';

interface InviteFormProps {
    onInviteCreated: () => void;
}

export function InviteForm({ onInviteCreated }: InviteFormProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'admin' | 'user'>('user');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { success, invitation, error } = await createInvitation(email, role);

        if (error) {
            setMessage({ type: 'error', text: error });
        } else {
            setMessage({ type: 'success', text: 'Convite gerado com sucesso!' });
            setEmail('');
            onInviteCreated();
        }
        setLoading(false);
    };

    return (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-6 h-full flex flex-col">
            <div className="flex items-center gap-3 text-foreground">
                <div className="p-2 bg-secondary/10 rounded-xl">
                    <UserPlus className="w-5 h-5 text-secondary" />
                </div>
                <h3 className="font-bold">Novo Convite</h3>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 flex-1 flex flex-col">
                {message && <MessageBanner type={message.type} text={message.text} />}

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
                    <label className="text-sm font-bold text-foreground ml-1">Papel (Role)</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setRole('user')}
                            className={`py-3 rounded-lg text-sm font-bold border transition-all ${role === 'user' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                        >
                            Usuário
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('admin')}
                            className={`py-3 rounded-lg text-sm font-bold border transition-all ${role === 'admin' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                        >
                            Admin
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                        {role === 'admin' ? 'Pode gerenciar equipe, estoque e configurações.' : 'Pode gerenciar leads e interações.'}
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-auto py-4 bg-secondary hover:opacity-90 text-secondary-foreground font-bold rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar Link de Convite'}
                </button>
            </form>
        </div>
    );
}

