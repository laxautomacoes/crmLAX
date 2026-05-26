'use client';

import { useState, useEffect } from 'react';
import { getIntegration, saveIntegration, updateIntegrationStatus } from '@/app/_actions/integrations';
import { toast } from 'sonner';
import { PenTool, CheckCircle2, Loader2, Save, MessageSquare } from 'lucide-react';
import { FormInput } from '@/components/shared/forms/FormInput';

export function DocuSignCard() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'active' | 'inactive'>('inactive');
    
    // Credenciais DocuSign
    const [integrationKey, setIntegrationKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [accountId, setAccountId] = useState('');

    // WhatsApp Group JID
    const [groupJid, setGroupJid] = useState('');
    const [savingWa, setSavingWa] = useState(false);

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
        } else {
            toast.error('Erro ao salvar ID do grupo: ' + res.error);
        }
        setSavingWa(false);
    };

    const handleToggleStatus = async () => {
        const nextStatus = status === 'active' ? 'inactive' : 'active';
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
            <div className="bg-card border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[150px]">
                <Loader2 className="w-6 h-6 animate-spin text-secondary" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD 1: DocuSign */}
            <div className="bg-card border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                            <PenTool size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 leading-tight">DocuSign</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Assinatura digital e gestão de contratos eletrônicos.</p>
                        </div>
                    </div>

                    <button
                        onClick={handleToggleStatus}
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            status === 'active' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                        {status === 'active' ? 'Ativo' : 'Inativo'}
                    </button>
                </div>

                <form onSubmit={handleSaveDocuSign} className="space-y-3">
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

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] rounded-lg shadow-sm transition-all"
                        >
                            {saving ? (
                                <><Loader2 size={13} className="animate-spin" /> Salvando...</>
                            ) : (
                                <><Save size={13} /> Salvar Credenciais</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* CARD 2: WhatsApp Notification Group */}
            <div className="bg-card border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">Grupo de Notificações</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Grupo do WhatsApp onde os corretores e gerentes serão notificados.</p>
                    </div>
                </div>

                <form onSubmit={handleSaveWhatsApp} className="space-y-3 flex flex-col justify-between h-[calc(100%-48px)]">
                    <div className="space-y-2">
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
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={savingWa}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] rounded-lg shadow-sm transition-all"
                        >
                            {savingWa ? (
                                <><Loader2 size={13} className="animate-spin" /> Salvando...</>
                            ) : (
                                <><Save size={13} /> Salvar Grupo</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

        </div>
    );
}
