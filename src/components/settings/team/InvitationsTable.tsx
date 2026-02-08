'use client';

import { useState, useMemo } from 'react';
import { Shield, Loader2, Search } from 'lucide-react';
import { InvitationRow } from './InvitationRow';
import { EditInvitationModal } from './EditInvitationModal';

interface InvitationsTableProps {
    invitations: any[];
    fetching: boolean;
    onRefresh: () => void;
}

export function InvitationsTable({ invitations, fetching, onRefresh }: InvitationsTableProps) {
    const [editingInvitation, setEditingInvitation] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInvitations = useMemo(() => {
        if (!searchTerm.trim()) return invitations;
        
        const term = searchTerm.toLowerCase().trim();
        return invitations.filter(inv => 
            (inv.name?.toLowerCase().includes(term)) || 
            (inv.email?.toLowerCase().includes(term))
        );
    }, [invitations, searchTerm]);

    const copyInviteLink = (token: string) => {
        const url = `${window.location.origin}/register?token=${token}`;
        navigator.clipboard.writeText(url);
        alert('Link copiado para a área de transferência!');
    };

    const handleEdit = (invitation: any) => {
        setEditingInvitation(invitation);
        setIsEditOpen(true);
    };

    return (
        <>
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="p-6 flex items-center justify-between h-[89px]">
                    <div className="flex items-center gap-3 text-foreground">
                        <h3 className="font-bold">Colaboradores Ativos</h3>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar colaborador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-muted/50 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                <th className="px-6 py-4 text-left">COLABORADOR</th>
                                <th className="px-6 py-4">Criado em</th>
                                <th className="px-6 py-4">Nível Acesso</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {fetching ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Carregando convites...
                                    </td>
                                </tr>
                            ) : filteredInvitations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        {searchTerm ? 'Nenhum colaborador encontrado para esta busca.' : 'Nenhum convite pendente.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredInvitations.map((inv) => (
                                    <InvitationRow
                                        key={inv.id}
                                        invitation={inv}
                                        onCopyLink={copyInviteLink}
                                        onEdit={handleEdit}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <EditInvitationModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                invitation={editingInvitation}
                onUpdate={onRefresh}
            />
        </>
    );
}

