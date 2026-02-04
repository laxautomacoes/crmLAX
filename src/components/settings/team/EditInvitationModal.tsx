'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/shared/Modal';
import { FormInput } from '@/components/shared/forms/FormInput';
import { updateInvitation, deleteInvitation, resendInvitation } from '@/app/_actions/invitations';
import { Loader2, Trash2, Calendar, ShieldCheck, User, Mail, Phone, Send } from 'lucide-react';
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
    const [role, setRole] = useState<'admin' | 'user'>('user');
    const [permissions, setPermissions] = useState({ dashboard: true, leads: true, clients: true, properties: true, calendar: true, reports: true, settings: false });
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (invitation) {
            setName(invitation.name || '');
            setEmail(invitation.email || '');
            setPhone(formatPhone(invitation.phone || ''));
            setRole(invitation.role || 'user');
            setPermissions(invitation.permissions || { dashboard: true, leads: true, clients: true, properties: true, calendar: true, reports: true, settings: false });
        }
    }, [invitation]);

    if (!invitation) return null;

    const handleRoleChange = (newRole: 'admin' | 'user') => {
        setRole(newRole);
        if (newRole === 'admin') setPermissions({ dashboard: true, leads: true, clients: true, properties: true, calendar: true, reports: true, settings: true });
    };

    const togglePermission = (key: string) => {
        if (role === 'admin') return;
        setPermissions((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await updateInvitation(invitation.id, {
            name,
            email,
            phone: cleanPhone(phone),
            role,
            permissions
        });
        if (error) alert('Erro: ' + error);
        else { onUpdate(); onClose(); }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm('Excluir convite?')) return;
        setIsDeleting(true);
        const { error } = await deleteInvitation(invitation.id);
        if (error) { alert('Erro: ' + error); setIsDeleting(false); }
        else { onUpdate(); onClose(); }
    };

    const handleResend = async () => {
        setIsResending(true);
        const { error } = await resendInvitation(invitation.id);
        if (error) alert('Erro: ' + error);
        else alert('Convite reenviado com sucesso!');
        setIsResending(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Colaborador" size="md">
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1 flex gap-1 items-center"><User className="w-3 h-3" /> Dados</label>
                    <div className="space-y-2">
                        <FormInput
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            icon={User}
                            placeholder="Nome"
                        />
                        <FormInput
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={Mail}
                            placeholder="Email"
                        />
                        <FormInput
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                            icon={Phone}
                            placeholder="(00) 00000 0000"
                            maxLength={15}
                        />
                    </div>
                </div>

                <hr className="border-border/50" />

                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1 flex gap-1 items-center"><ShieldCheck className="w-3 h-3" /> Acesso</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => handleRoleChange('admin')} className={`py-2 rounded-lg text-sm font-bold border ${role === 'admin' ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card'}`}>Admin</button>
                        <button type="button" onClick={() => handleRoleChange('user')} className={`py-2 rounded-lg text-sm font-bold border ${role === 'user' ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card'}`}>Usuário</button>
                    </div>
                </div>

                <hr className="border-border/50" />

                <InvitationPermissions role={role} permissions={permissions} onToggle={togglePermission} />

                <hr className="border-border/50" />

                <div className="flex gap-2 pt-1">
                    <button onClick={handleDelete} disabled={isDeleting || isResending || loading} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50 text-xs">
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Excluir
                    </button>
                    <button onClick={handleResend} disabled={isDeleting || isResending || loading} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50 text-xs">
                        {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Reenviar
                    </button>
                    <button onClick={handleSave} disabled={isDeleting || isResending || loading} className="flex-1 py-3 bg-secondary hover:opacity-90 text-secondary-foreground font-bold rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50 text-xs">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
