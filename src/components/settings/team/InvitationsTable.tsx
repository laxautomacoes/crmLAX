'use client';

import { useState, useMemo } from 'react';
import { Shield, Loader2, Search } from 'lucide-react';
import { InvitationRow } from './InvitationRow';
import { EditInvitationModal } from './EditInvitationModal';

interface InvitationsTableProps {
    invitations: any[];
    fetching: boolean;
    onRefresh: () => void;
    searchTerm: string;
}

export function InvitationsTable({ invitations, fetching, onRefresh, searchTerm }: InvitationsTableProps) {
    const [editingInvitation, setEditingInvitation] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

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
            <div className="bg-card rounded-xl border border-muted-foreground/30 overflow-hidden shadow-sm min-h-[calc(100vh-220px)]">
                <div className="overflow-x-auto min-h-[calc(100vh-220px)]">
                    <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-muted/50 border-b border-muted-foreground/30">
                            <tr>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '20%' }}>Colaborador</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '25%' }}>Contato</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '15%' }}>Criado em</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '18%' }}>Nível Acesso</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '12%' }}>Status</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '10%' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-muted-foreground/30">
                            {fetching ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Carregando convites...
                                    </td>
                                </tr>
                            ) : filteredInvitations.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
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
                                        onRefresh={onRefresh}
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

