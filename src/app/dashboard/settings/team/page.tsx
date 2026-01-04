'use client';

import { useState, useEffect } from 'react';
import { createInvitation, listInvitations } from '@/app/_actions/invitations';
import { UserPlus, Mail, Shield, Clock, CheckCircle, XCircle, Copy, Share2, Loader2 } from 'lucide-react';

export default function TeamSettingsPage() {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'admin' | 'user'>('user');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const loadInvitations = async () => {
        const { invitations, error } = await listInvitations();
        if (!error) setInvitations(invitations || []);
        setFetching(false);
    };

    useEffect(() => {
        loadInvitations();
    }, []);

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
            loadInvitations();
        }
        setLoading(false);
    };

    const copyInviteLink = (token: string) => {
        const url = `${window.location.origin}/register?token=${token}`;
        navigator.clipboard.writeText(url);
        alert('Link copiado para a área de transferência!');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-[#404F4F]">Gestão da Equipe</h2>
                <p className="text-gray-500">Convide novos membros para colaborar no CRM LAX</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invite Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 h-full flex flex-col">
                        <div className="flex items-center gap-3 text-[#404F4F]">
                            <div className="p-2 bg-[#FFE600]/10 rounded-xl">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold">Novo Convite</h3>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-4 flex-1 flex flex-col">
                            {message && (
                                <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-800 ml-1">Email do Colaborador</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#FFE600]/50 outline-none transition-all font-medium"
                                        placeholder="exemplo@email.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-800 ml-1">Papel (Role)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRole('user')}
                                        className={`py-3 rounded-lg text-sm font-bold border transition-all ${role === 'user' ? 'bg-[#404F4F] text-white border-[#404F4F]' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        Usuário
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('admin')}
                                        className={`py-3 rounded-lg text-sm font-bold border transition-all ${role === 'admin' ? 'bg-[#404F4F] text-white border-[#404F4F]' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        Admin
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">
                                    {role === 'admin' ? 'Pode gerenciar equipe, estoque e configurações.' : 'Pode gerenciar leads e interações.'}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-auto py-4 bg-[#FFE600] hover:bg-[#F2DB00] text-[#404F4F] font-bold rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar Link de Convite'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Invitations List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[#404F4F]">
                                <div className="p-2 bg-[#404F4F]/5 rounded-xl">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold">Convites Ativos</h3>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-4">Usuário</th>
                                        <th className="px-6 py-4">Papel</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Expira em</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {fetching ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                                Carregando convites...
                                            </td>
                                        </tr>
                                    ) : invitations.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                                Nenhum convite pendente.
                                            </td>
                                        </tr>
                                    ) : (
                                        invitations.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-[#404F4F]">{inv.email}</div>
                                                    <div className="text-[10px] text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${inv.role === 'admin' ? 'bg-[#FFE600] text-[#404F4F]' : 'bg-gray-100 text-gray-500'}`}>
                                                        {inv.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {inv.used_at ? (
                                                        <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs">
                                                            <CheckCircle className="w-3.5 h-3.5" /> Aceito
                                                        </div>
                                                    ) : new Date(inv.expires_at) < new Date() ? (
                                                        <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs">
                                                            <XCircle className="w-3.5 h-3.5" /> Expirado
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs">
                                                            <Clock className="w-3.5 h-3.5" /> Pendente
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-500">
                                                    {new Date(inv.expires_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {!inv.used_at && new Date(inv.expires_at) >= new Date() && (
                                                        <button
                                                            onClick={() => copyInviteLink(inv.token)}
                                                            className="p-2 hover:bg-[#FFE600]/10 text-gray-400 hover:text-[#404F4F] rounded-xl transition-all"
                                                            title="Copiar Link"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
