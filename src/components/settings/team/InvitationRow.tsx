'use client';

import { CheckCircle, XCircle, Clock, Copy, Edit2, Send, Loader2 } from 'lucide-react';
import { resendInvitation } from '@/app/_actions/invitations';
import { useState } from 'react';

interface InvitationRowProps {
    invitation: any;
    onCopyLink: (token: string) => void;
    onEdit: (invitation: any) => void;
}

export function InvitationRow({ invitation, onCopyLink, onEdit }: InvitationRowProps) {
    const [isResending, setIsResending] = useState(false);
    const isMember = invitation.type === 'member';
    const isUsed = isMember || !!invitation.used_at;
    const canCopy = !isUsed && !isMember;

    const handleResend = async () => {
        if (isMember) return;
        setIsResending(true);
        const { error } = await resendInvitation(invitation.id);
        if (error) alert('Erro: ' + error);
        else alert('Convite reenviado com sucesso!');
        setIsResending(false);
    };

    return (
        <tr className="hover:bg-muted/50 transition-colors">
            <td className="px-6 py-4 text-left">
                <div className="text-sm font-bold text-foreground truncate max-w-[200px]">{invitation.name || 'Sem nome'}</div>
                <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{invitation.email}</div>
            </td>
            <td className="px-6 py-4 text-center">
                <div className="text-xs text-muted-foreground">{new Date(invitation.created_at).toLocaleDateString()}</div>
            </td>
            <td className="px-6 py-4 text-center">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${invitation.role === 'admin' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {invitation.role === 'user' ? 'Colaborador' : invitation.role}
                </span>
            </td>
            <td className="px-6 py-4 text-center">
                <div className="flex justify-center">
                    {isUsed ? (
                        <div className="text-green-600 font-bold text-xs">
                            Aceito
                        </div>
                    ) : (
                        <div className="px-2 py-1 bg-yellow-400/20 text-yellow-700 rounded-lg font-bold text-xs">
                            Pendente
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onEdit(invitation)}
                        className="p-2 hover:bg-secondary/10 text-muted-foreground hover:text-secondary rounded-xl transition-all"
                        title="Editar Convite"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {canCopy && (
                        <>
                            <button
                                onClick={handleResend}
                                disabled={isResending}
                                className="p-2 hover:bg-secondary/10 text-muted-foreground hover:text-blue-600 rounded-xl transition-all disabled:opacity-50"
                                title="Reenviar Convite"
                            >
                                {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => onCopyLink(invitation.token)}
                                className="p-2 hover:bg-secondary/10 text-muted-foreground hover:text-secondary rounded-xl transition-all"
                                title="Copiar Link"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}

