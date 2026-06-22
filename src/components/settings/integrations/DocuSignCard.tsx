'use client';

import { useState, useEffect } from 'react';
import { getIntegration, saveIntegration, updateIntegrationStatus } from '@/app/_actions/integrations';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Save, MessageSquare, ShieldCheck } from 'lucide-react';
import { DocuSignIcon } from '@/components/icons/BrandIcons';
import { FormInput } from '@/components/shared/forms/FormInput';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/shared/Modal';

export function DocuSignCard() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'active' | 'inactive'>('inactive');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Credenciais DocuSign
    const [integrationKey, setIntegrationKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [accountId, setAccountId] = useState('');

    // WhatsApp Group JID
    const [groupJid, setGroupJid] = useState('');
    const [savingWa, setSavingWa] = useState(false);
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);

    useEffect(() => {
        async function loadSettings() {
            setLoading(true);
            const [dsRes, waRes] = await Promise.all([
                getIntegration('docusign'),
                getIntegration('whatsapp_notification')
            ]);

            if (dsRes?.data) {
                const creds = dsRes.data.credentials || {};
                setIntegrationKey(creds.integrationKey || '');
                setSecretKey(creds.secretKey || '');
                setAccountId(creds.accountId || '');
                setStatus(dsRes.data.status === 'active' ? 'active' : 'inactive');
            }

            if (waRes?.data) {
                const creds = waRes.data.credentials || {};
                setGroupJid(creds.groupJid || '');
            }
            setLoading(false);
        }
        loadSettings();
    }, []);

    const handleSaveDocuSign = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const res = await saveIntegration('docusign', {
            integrationKey,
            secretKey,
            accountId
        });

        if (res.success) {
            setStatus('active');
            toast.success('Configurações da DocuSign salvas com sucesso!');
            setIsModalOpen(false);
        } else {
            toast.error('Erro ao salvar configurações da DocuSign: ' + res.error);
        }
        setSaving(false);
    };

    const handleSaveWhatsApp = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingWa(true);
        const res = await saveIntegration('whatsapp_notification', {
            groupJid
        });

        if (res.success) {
            toast.success('ID do Grupo de WhatsApp configurado!');
            setIsWaModalOpen(false);
        } else {
            toast.error('Erro ao salvar ID do grupo: ' + res.error);
        }
        setSavingWa(false);
    };

    const handleToggleStatus = async (checked: boolean) => {
        const nextStatus = checked ? 'active' : 'inactive';
        const res = await updateIntegrationStatus('docusign', nextStatus);
        if (res.success) {
            setStatus(nextStatus);
            toast.success(`Integração DocuSign ${nextStatus === 'active' ? 'ativada' : 'desativada'}.`);
        } else {
            toast.error('Erro ao alterar status: ' + res.error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center min-h-[108px]">
                    <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                </div>
                <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center min-h-[108px]">
                    <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                </div>
            </div>
        );
    }

    return (
        <>
            {/* CARD 1: DocuSign */}
            <div 
                className="bg-card rounded-xl border border-border overflow-hidden transition-all hover:bg-muted/5 cursor-pointer select-none"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="p-5 bg-muted/30 flex flex-col gap-3">
                    <div className="flex items-start justify-between mb-1">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 w-fit">
                            <DocuSignIcon size={22} />
                        </div>
                        <span className={`flex h-2.5 w-2.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">DocuSign</h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            Assinatura digital e gestão de contratos eletrônicos.
                        </p>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="md"
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <DocuSignIcon size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground">Configurar DocuSign</h3>
                            <p className="text-xs text-muted-foreground">Credenciais para assinatura digital de contratos.</p>
                        </div>
                    </div>
                }
            >
                <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-2">
                    <div>
                        <span className="text-xs font-bold text-foreground">Status da Integração</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Ative ou desative a DocuSign.</p>
                    </div>
                    <Switch 
                        checked={status === 'active'} 
                        onChange={handleToggleStatus}
                    />
                </div>

                <form onSubmit={handleSaveDocuSign} className="space-y-4 py-2">
                    <FormInput
                        label="Integration Key (Client ID) *"
                        value={integrationKey}
                        onChange={(e) => setIntegrationKey(e.target.value)}
                        placeholder="Ex: 8a4c112b-..."
                        required
                    />
                    <FormInput
                        label="Secret Key *"
                        type="password"
                        value={secretKey}
                        onChange={(e) => setSecretKey(e.target.value)}
                        placeholder="••••••••••••••••"
                        required
                    />
                    <FormInput
                        label="Account ID *"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        placeholder="Ex: 1234567"
                        required
                    />

                    <div className="flex items-center gap-2 justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-500 opacity-60" />
                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Credenciais criptografadas</span>
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#FFE600] text-black hover:bg-[#F2DB00] rounded-lg shadow-sm transition-all"
                        >
                            {saving ? (
                                <><Loader2 size={13} className="animate-spin" /> Salvando...</>
                            ) : (
                                <><Save size={13} /> Salvar Credenciais</>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* CARD 2: Grupo de Notificações */}
            <div 
                className="bg-card rounded-xl border border-border overflow-hidden transition-all hover:bg-muted/5 cursor-pointer select-none"
                onClick={() => setIsWaModalOpen(true)}
            >
                <div className="p-5 bg-muted/30 flex flex-col gap-3">
                    <div className="flex items-start justify-between mb-1">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 w-fit">
                            <MessageSquare size={22} />
                        </div>
                        <span className={`flex h-2.5 w-2.5 rounded-full ${groupJid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">Grupo de Notificações</h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            Grupo do WhatsApp onde os corretores e gerentes serão notificados.
                        </p>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isWaModalOpen}
                onClose={() => setIsWaModalOpen(false)}
                size="md"
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <MessageSquare size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground">Grupo de Notificações</h3>
                            <p className="text-xs text-muted-foreground">Configuração do JID do grupo do WhatsApp.</p>
                        </div>
                    </div>
                }
            >
                <form onSubmit={handleSaveWhatsApp} className="space-y-4 py-2">
                    <FormInput
                        label="ID do Grupo do WhatsApp (JID) *"
                        value={groupJid}
                        onChange={(e) => setGroupJid(e.target.value)}
                        placeholder="Ex: 1203630283726@g.us"
                        required
                    />
                    <p className="text-[9px] text-muted-foreground leading-normal ml-0.5">
                        O ID do grupo (JID) pode ser obtido enviando uma mensagem no grupo ou usando a listagem de chats conectada à Evolution API. Formato esperado: **120363...d@g.us**.
                    </p>

                    <div className="flex justify-end pt-4 border-t border-border/50">
                        <button
                            type="submit"
                            disabled={savingWa}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#FFE600] text-black hover:bg-[#F2DB00] rounded-lg shadow-sm transition-all"
                        >
                            {savingWa ? (
                                <><Loader2 size={13} className="animate-spin" /> Salvando...</>
                            ) : (
                                <><Save size={13} /> Salvar Grupo</>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
