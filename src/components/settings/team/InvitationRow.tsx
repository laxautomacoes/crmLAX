'use client';

import { CheckCircle, XCircle, Clock, Copy } from 'lucide-react';

interface InvitationRowProps {
    invitation: any;
    onCopyLink: (token: string) => void;
}

export function InvitationRow({ invitation, onCopyLink }: InvitationRowProps) {
    const isExpired = new Date(invitation.expires_at) < new Date();
    const isUsed = !!invitation.used_at;
    const canCopy = !isUsed && !isExpired;

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4">
                <div className="text-sm font-bold text-[#404F4F]">{invitation.email}</div>
                <div className="text-[10px] text-gray-400">{new Date(invitation.created_at).toLocaleDateString()}</div>
            </td>
            <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${invitation.role === 'admin' ? 'bg-[#FFE600] text-[#404F4F]' : 'bg-gray-100 text-gray-500'}`}>
                    {invitation.role}
                </span>
            </td>
            <td className="px-6 py-4">
                {isUsed ? (
                    <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs">
                        <CheckCircle className="w-3.5 h-3.5" /> Aceito
                    </div>
                ) : isExpired ? (
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
                {new Date(invitation.expires_at).toLocaleDateString()}
            </td>
            <td className="px-6 py-4 text-right">
                {canCopy && (
                    <button
                        onClick={() => onCopyLink(invitation.token)}
                        className="p-2 hover:bg-[#FFE600]/10 text-gray-400 hover:text-[#404F4F] rounded-xl transition-all"
                        title="Copiar Link"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                )}
            </td>
        </tr>
    );
}

