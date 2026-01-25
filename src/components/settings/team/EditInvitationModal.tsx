'use client';

import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { updateInvitation, deleteInvitation } from '@/app/_actions/invitations';
import { Loader2, Trash2, Calendar, ShieldCheck, User, Mail, Phone } from 'lucide-react';
import { InvitationPermissions } from './InvitationPermissions';

interface EditInvitationModalProps {
    isOpen: boolean;
    onClose: () => void;
    invitation: any;
    onUpdate: () => void;
}

export function EditInvitationModal({ isOpen, onClose, invitation, onUpdate }: EditInvitationModalProps) {
    const [name, setName] = useState(invitation?.name || '');
    const [email, setEmail] = useState(invitation?.email || '');
    const [phone, setPhone] = useState(invitation?.phone || '');
    const [role, setRole] = useState<'admin' | 'user'>(invitation?.role || 'user');
    const [permissions, setPermissions] = useState(invitation?.permissions || { dashboard: true, leads: true, clients: true, properties: true, calendar: true, reports: true, settings: false });
    const [expiresAt, setExpiresAt] = useState(invitation?.expires_at ? new Date(invitation.expires_at).toISOString().split('T')[0] : '');
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
        const { error } = await updateInvitation(invitation.id, { name, email, phone, role, permissions, expires_at: new Date(expiresAt).toISOString() });
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Convite" size="md">
            <div className="space-y-5">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Dados</label>
                    <div className="space-y-2">
                        <div className="relative"><User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm outline-none" placeholder="Nome" /></div>
                        <div className="relative"><Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm outline-none" placeholder="Email" /></div>
                        <div className="relative"><Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm outline-none" placeholder="WhatsApp" /></div>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex gap-1"><ShieldCheck className="w-3 h-3" /> Acesso</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => handleRoleChange('admin')} className={`py-2 rounded-lg text-sm font-bold border ${role === 'admin' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>Admin</button>
                        <button type="button" onClick={() => handleRoleChange('user')} className={`py-2 rounded-lg text-sm font-bold border ${role === 'user' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>Usuário</button>
                    </div>
                    <InvitationPermissions role={role} permissions={permissions} onToggle={togglePermission} />
                </div>

                <div className="space-y-1.5"><label className="text-sm font-bold flex gap-2 ml-1"><Calendar className="w-4 h-4" /> Expira em</label><input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm outline-none" /></div>

                <div className="flex gap-3 pt-4 border-t border-border">
                    <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex justify-center items-center gap-2 transition-colors">{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Excluir</button>
                    <button onClick={handleSave} disabled={loading} className="flex-[2] py-3 bg-secondary hover:opacity-90 text-secondary-foreground font-bold rounded-lg flex justify-center items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</button>
                </div>
            </div>
        </Modal>
    );
}
