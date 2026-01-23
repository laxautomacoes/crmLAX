'use client';

import { Shield, Loader2 } from 'lucide-react';
import { InvitationRow } from './InvitationRow';

interface InvitationsTableProps {
    invitations: any[];
    fetching: boolean;
    onRefresh: () => void;
}

export function InvitationsTable({ invitations, fetching }: InvitationsTableProps) {
    const copyInviteLink = (token: string) => {
        const url = `${window.location.origin}/register?token=${token}`;
        navigator.clipboard.writeText(url);
        alert('Link copiado para a área de transferência!');
    };

    return (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-primary/5 rounded-xl">
                        <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold">Convites Ativos</h3>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-muted/50 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="px-6 py-4">Usuário</th>
                            <th className="px-6 py-4">Papel</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Expira em</th>
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
                        ) : invitations.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                    Nenhum convite pendente.
                                </td>
                            </tr>
                        ) : (
                            invitations.map((inv) => (
                                <InvitationRow
                                    key={inv.id}
                                    invitation={inv}
                                    onCopyLink={copyInviteLink}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

