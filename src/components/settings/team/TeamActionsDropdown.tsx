'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Send, Archive, ArchiveRestore, Copy, Loader2 } from 'lucide-react';
import { toggleArchiveTeamMember, resendMemberAccess } from '@/app/_actions/team';
import { resendInvitation } from '@/app/_actions/invitations';

interface TeamActionsDropdownProps {
    invitation: any;
    onEdit: (invitation: any) => void;
    onCopyLink: (token: string) => void;
    onRefresh: () => void;
}

export function TeamActionsDropdown({ invitation, onEdit, onCopyLink, onRefresh }: TeamActionsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isMember = invitation.type === 'member';
    const isUsed = isMember || !!invitation.used_at;
    const isArchived = !!invitation.is_archived;

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        onEdit(invitation);
    };

    const handleCopyLink = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        onCopyLink(invitation.token);
    };

    const handleResend = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        setIsLoading(true);
        try {
            if (isUsed) {
                const { error } = await resendMemberAccess(invitation.email);
                if (error) alert('Erro: ' + error);
                else alert('Instruções de acesso enviadas com sucesso!');
            } else {
                const { error } = await resendInvitation(invitation.id);
                if (error) alert('Erro: ' + error);
                else alert('Convite reenviado com sucesso!');
            }
        } catch (err: any) {
            alert('Erro ao processar solicitação: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleArchive = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        setIsLoading(true);
        try {
            const { error } = await toggleArchiveTeamMember(invitation.id, !isArchived);
            if (error) alert('Erro: ' + error);
            else {
                alert(isArchived ? 'Colaborador desarquivado com sucesso!' : 'Colaborador arquivado com sucesso!');
                onRefresh();
            }
        } catch (err: any) {
            alert('Erro ao processar arquivamento: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(o => !o); }}
                disabled={isLoading}
                className="p-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors shadow-sm flex items-center justify-center disabled:opacity-50"
                title="Ações"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical size={16} />}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                        onClick={handleEdit}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
                    >
                        <Edit2 size={14} className="text-blue-500" />
                        Editar
                    </button>
                    
                    <button
                        onClick={handleResend}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
                    >
                        <Send size={14} className="text-emerald-500" />
                        Reenviar
                    </button>

                    {isUsed && (
                        <button
                            onClick={handleToggleArchive}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-amber-500/10 transition-colors text-left"
                        >
                            {isArchived ? (
                                <>
                                    <ArchiveRestore size={14} className="text-amber-500" />
                                    Desarquivar
                                </>
                            ) : (
                                <>
                                    <Archive size={14} className="text-amber-500" />
                                    Arquivar
                                </>
                            )}
                        </button>
                    )}

                    {!isUsed && (
                        <button
                            onClick={handleCopyLink}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
                        >
                            <Copy size={14} className="text-blue-500" />
                            Copiar Link
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
