'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/shared/Modal';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { updateInvitation, deleteInvitation, resendInvitation } from '@/app/_actions/invitations';
import { deleteTeamMember, toggleArchiveTeamMember, resendMemberAccess, updateTeamMember } from '@/app/_actions/team';
import { Loader2, Trash2, Calendar, ShieldCheck, User, Mail, Phone, Send, Archive, MoreVertical } from 'lucide-react';
import { InvitationPermissions } from './InvitationPermissions';

interface EditInvitationModalProps {
    isOpen: boolean;
    onClose: () => void;
    invitation: any;
    onUpdate: () => void;
}

export function EditInvitationModal({ isOpen, onClose, invitation, onUpdate }: EditInvitationModalProps) {
    const formatPhone = (value: string) => {
        if (!value) return '';
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1 $2');
        }
        return value;
    };

    const cleanPhone = (value: string) => value.replace(/\D/g, '');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'superadmin' | 'admin' | 'user' | 'contador' | 'advogado' | 'financeiro' | 'recursos_humanos'>('user');
    const [permissions, setPermissions] = useState({ dashboard: true, leads: true, clients: true, properties: true, proposals: true, marketing: true, site: true, calendar: true, notes: true, financeiro: true, reports: true, settings: true });
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isMember = invitation?.type === 'member';

    useEffect(() => {
        if (invitation) {
            setName(invitation.name || '');
            setEmail(invitation.email || '');
            setPhone(formatPhone(invitation.phone || invitation.whatsapp_number || ''));
            setRole(invitation.role || 'user');
            setPermissions(invitation.permissions || { dashboard: true, leads: true, clients: true, properties: true, proposals: true, marketing: true, site: true, calendar: true, notes: true, financeiro: true, reports: true, settings: true });
        }
    }, [invitation]);

    // Fechar menu de ações ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowActionsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!invitation) return null;

    const handleRoleChange = (newRole: 'superadmin' | 'admin' | 'user' | 'contador' | 'advogado' | 'financeiro' | 'recursos_humanos') => {
        setRole(newRole);
        if (newRole === 'admin') setPermissions({ dashboard: true, leads: true, clients: true, properties: true, proposals: true, marketing: true, site: true, calendar: true, notes: true, financeiro: true, reports: true, settings: true });
    };

    const togglePermission = (key: string) => {
        if (role === 'admin' || invitation.is_archived || loading || isDeleting || isResending || isArchiving) return;
        setPermissions((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setLoading(true);
        const cleanedPhone = cleanPhone(phone);
        
        let res;
        if (invitation.type === 'member') {
            res = await updateTeamMember(invitation.id, {
                name,
                email,
                phone: cleanedPhone,
                role,
                permissions
            });
        } else {
            res = await updateInvitation(invitation.id, {
                name,
                email,
                phone: cleanedPhone,
                role,
                permissions
            });
        }

        if (res.error) alert('Erro: ' + res.error);
        else { onUpdate(); onClose(); }
        setLoading(false);
    };

    const handleDelete = async () => {
        const isMember = invitation.type === 'member';
        const message = isMember 
            ? 'Excluir colaborador? Isso removerá permanentemente o acesso e o perfil do usuário.' 
            : 'Excluir convite?';
            
        if (!confirm(message)) return;
        
        setIsDeleting(true);
        const { error } = await deleteTeamMember({
            id: invitation.id,
            email: invitation.email,
            type: invitation.type
        });
        
        if (error) { 
            alert('Erro: ' + error); 
            setIsDeleting(false); 
        } else { 
            onUpdate(); 
            onClose(); 
        }
    };

    const handleToggleArchive = async () => {
        const message = invitation.is_archived
            ? 'Desarquivar colaborador? O usuário recuperará o acesso ao sistema.'
            : 'Arquivar colaborador? O usuário perderá o acesso e não receberá mais leads.';

        if (!confirm(message)) return;

        setIsArchiving(true);
        const { error } = await toggleArchiveTeamMember(invitation.id, !invitation.is_archived);
        if (error) {
            alert('Erro: ' + error);
        } else {
            onUpdate();
            onClose();
        }
        setIsArchiving(false);
    };

    const handleResend = async () => {
        setIsResending(true);
        if (isMember) {
            const { error } = await resendMemberAccess(invitation.email);
            if (error) alert('Erro: ' + error);
            else alert('E-mail de recuperação de acesso enviado com sucesso!');
        } else {
            const { error } = await resendInvitation(invitation.id);
            if (error) alert('Erro: ' + error);
            else alert('Convite reenviado com sucesso!');
        }
        setIsResending(false);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={
                <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                    Editar Colaborador
                </h3>
            }
            extraHeaderContent={
                <div className="flex items-center gap-2" ref={menuRef}>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                            className="p-2 bg-muted text-foreground rounded-md shadow-sm hover:bg-muted/80 transition-colors flex items-center justify-center"
                            title="Ações"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {showActionsMenu && (
                            <div className="absolute right-0 top-10 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                                <div className="py-1">
                                    <button
                                        onClick={() => { setShowActionsMenu(false); handleResend(); }}
                                        disabled={isResending || isDeleting || isArchiving || loading}
                                        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Send className="w-4 h-4 text-blue-500" /> {isMember ? 'Reenviar Acesso' : 'Reenviar Convite'}
                                    </button>
                                    {isMember && (
                                        <button
                                            onClick={() => { setShowActionsMenu(false); handleToggleArchive(); }}
                                            disabled={isResending || isDeleting || isArchiving || loading}
                                            className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <Archive className="w-4 h-4 text-amber-500" /> {invitation.is_archived ? 'Desarquivar' : 'Arquivar'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setShowActionsMenu(false); handleDelete(); }}
                                        disabled={isResending || isDeleting || isArchiving || loading}
                                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" /> Excluir
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isDeleting || isResending || loading || isArchiving || invitation.is_archived}
                        className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md font-bold shadow-sm active:scale-[0.99] transition-all text-xs whitespace-nowrap hover:opacity-90 disabled:opacity-50 min-w-[120px] text-center flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                    </button>
                </div>
            }
            size="lg"
        >
            <div className="space-y-8">
                <div className="space-y-2">
                    <h3 className="block text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Dados</h3>
                    <div className="space-y-2">
                        <FormInput
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            icon={User}
                            iconSize={15}
                            roundedClassName="rounded-md"
                            placeholder="Nome"
                            disabled={invitation.is_archived || loading || isDeleting || isResending || isArchiving}
                        />
                        <FormInput
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={Mail}
                            iconSize={15}
                            roundedClassName="rounded-md"
                            placeholder="Email"
                            disabled={invitation.is_archived || loading || isDeleting || isResending || isArchiving}
                        />
                        <FormInput
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                            icon={Phone}
                            iconSize={15}
                            roundedClassName="rounded-md"
                            placeholder="(00) 00000 0000"
                            maxLength={15}
                            disabled={invitation.is_archived || loading || isDeleting || isResending || isArchiving}
                        />
                    </div>
                </div>

                <div className="space-y-2 pt-8 border-t border-border/50">
                    <h3 className="block text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Acesso</h3>
                    <FormSelect
                        value={role}
                        onChange={(e) => handleRoleChange(e.target.value as any)}
                        disabled={invitation.is_archived || loading || isDeleting || isResending || isArchiving}
                        roundedClassName="rounded-md"
                        options={[
                            { value: 'user', label: 'Colaborador' },
                            { value: 'admin', label: 'Admin' },
                            { value: 'contador', label: 'Contador' },
                            { value: 'advogado', label: 'Advogado' },
                            { value: 'financeiro', label: 'Financeiro' },
                            { value: 'recursos_humanos', label: 'Recursos Humanos' }
                        ]}
                    />
                </div>

                <div className="pt-8 border-t border-border/50">
                    <InvitationPermissions role={role} permissions={permissions} onToggle={togglePermission} />
                </div>
            </div>
        </Modal>
    );
}
