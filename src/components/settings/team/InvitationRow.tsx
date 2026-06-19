'use client';

import { Mail, Phone, MessageSquare, User } from 'lucide-react';
import { TeamActionsDropdown } from './TeamActionsDropdown';

const roleLabels: Record<string, string> = {
    user: 'Colaborador',
    admin: 'Admin',
    contador: 'Contador',
    advogado: 'Advogado',
    financeiro: 'Financeiro',
    recursos_humanos: 'Recursos Humanos',
    superadmin: 'Superadmin'
};

interface InvitationRowProps {
    invitation: any;
    onCopyLink: (token: string) => void;
    onEdit: (invitation: any) => void;
    onRefresh: () => void;
}

export function InvitationRow({ invitation, onCopyLink, onEdit, onRefresh }: InvitationRowProps) {
    const isMember = invitation.type === 'member';
    const isUsed = isMember || !!invitation.used_at;

    const formatPhone = (value: string) => {
        if (!value) return '';
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            if (numbers.length === 11) {
                return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
            }
            if (numbers.length === 10) {
                return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
            }
            return numbers
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1 $2');
        }
        return value;
    };

    return (
        <tr className="hover:bg-muted/50 transition-colors">
            <td className="px-4 py-5 text-center">
                <div className="flex items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground flex-shrink-0 border border-border/10">
                        {invitation.avatar_url ? (
                            <img src={invitation.avatar_url} alt={invitation.name || 'Avatar'} className="w-full h-full object-cover" />
                        ) : (
                            <User size={16} />
                        )}
                    </div>
                    <span className="font-bold text-foreground block truncate max-w-[150px]">{invitation.name || 'Sem nome'}</span>
                </div>
            </td>
            <td className="px-4 py-5">
                <div className="flex flex-col items-center justify-center gap-1 text-sm whitespace-nowrap">
                    {(invitation.phone || invitation.whatsapp_number) && (
                        <div className="flex items-center justify-center gap-1.5">
                            <span className="text-foreground font-medium">{formatPhone(invitation.phone || invitation.whatsapp_number)}</span>
                            <a 
                                href={`https://wa.me/55${(invitation.phone || invitation.whatsapp_number).replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1 bg-emerald-500/10 text-emerald-600 rounded-md hover:bg-emerald-500/20 transition-colors flex items-center justify-center"
                                title="Chamar no WhatsApp"
                            >
                                <MessageSquare size={12} />
                            </a>
                        </div>
                    )}
                    {invitation.email && (
                        <div className="flex items-center justify-center gap-1.5">
                            <span className="text-sm font-medium text-foreground max-w-[180px] truncate">{invitation.email}</span>
                            <a 
                                href={`mailto:${invitation.email}`} 
                                className="p-1 bg-blue-500/10 text-blue-600 rounded-md hover:bg-blue-500/20 transition-colors flex items-center justify-center"
                                title="Enviar E-mail"
                            >
                                <Mail size={12} />
                            </a>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-4 py-5 text-center">
                <span className="text-sm text-foreground font-medium">{new Date(invitation.created_at).toLocaleDateString('pt-BR')}</span>
            </td>
            <td className="px-4 py-5 text-center">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${invitation.role === 'admin' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {roleLabels[invitation.role] || invitation.role}
                </span>
            </td>
            <td className="px-4 py-5 text-center">
                <div className="flex justify-center">
                    {invitation.is_archived ? (
                        <span className="text-red-600 font-bold text-xs">
                            Arquivado
                        </span>
                    ) : isUsed ? (
                        <span className="text-green-600 font-bold text-xs">
                            Ativo
                        </span>
                    ) : (
                        <span className="text-amber-600 font-bold text-xs">
                            Pendente
                        </span>
                    )}
                </div>
            </td>
            <td className="px-4 py-5 text-center">
                <div className="flex justify-center">
                    <TeamActionsDropdown
                        invitation={invitation}
                        onEdit={onEdit}
                        onCopyLink={onCopyLink}
                        onRefresh={onRefresh}
                    />
                </div>
            </td>
        </tr>
    );
}



