'use client';

import { useState, useEffect } from 'react';
import { getIntegration, saveIntegration, updateIntegrationStatus } from '@/app/_actions/integrations';
import { toast } from 'sonner';
import { PenTool, CheckCircle2, Loader2, Save, MessageSquare, ChevronDown, ShieldCheck } from 'lucide-react';
import { FormInput } from '@/components/shared/forms/FormInput';
import { Switch } from '@/components/ui/Switch';
import { motion, AnimatePresence } from 'framer-motion';

export function DocuSignCard() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'active' | 'inactive'>('inactive');
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Credenciais DocuSign
    const [integrationKey, setIntegrationKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [accountId, setAccountId] = useState('');

    // WhatsApp Group JID
    const [groupJid, setGroupJid] = useState('');
    const [savingWa, setSavingWa] = useState(false);
    const [waExpanded, setWaExpanded] = useState(false);

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
                <div className="bg-card rounded-2xl border border-border p-6 flex items-center justify-center min-h-[72px]">
                    <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                </div>
                <div className="bg-card rounded-2xl border border-border p-6 flex items-center justify-center min-h-[72px]">
                    <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                </div>
            </div>
        );
    }

    return (
        <>
            {/* CARD 1: DocuSign — Padrão GatewayCard */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden transition-all hover:bg-muted/5">
                <div 
                    className="px-6 py-4 border-b border-border bg-muted/30 cursor-pointer select-none"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                <PenTool size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-foreground">DocuSign</h3>
                                    <span className={`flex h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-xl">
                                    Assinatura digital e gestão de contratos eletrônicos.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleToggleStatus(status !== 'active')}>
                                <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${status === 'active' ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>
                                    {status === 'active' ? 'Ativo' : 'Desativado'}
                                </span>
                                <Switch 
                                    checked={status === 'active'} 
                                    onChange={handleToggleStatus}
                                    className="scale-75"
                                />
                            </div>

                            <div className="h-6 w-px bg-border hidden sm:block" />

                            <button 
                                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ChevronDown size={20} />
                                </motion.div>
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <form onSubmit={handleSaveDocuSign} className="p-6 space-y-4 border-t border-border/50">
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

                                <div className="flex items-center gap-2 justify-between pt-2 border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-emerald-500 opacity-60" />
                                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Credenciais criptografadas</span>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all"
                                    >
                                        {saving ? (
                                            <><Loader2 size={13} className="animate-spin" /> Salvando...</>
                                        ) : (
                                            <><Save size={13} /> Salvar Credenciais</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* CARD 2: Grupo de Notificações — Padrão GatewayCard */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden transition-all hover:bg-muted/5">
                <div 
                    className="px-6 py-4 border-b border-border bg-muted/30 cursor-pointer select-none"
                    onClick={() => setWaExpanded(!waExpanded)}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-foreground">Grupo de Notificações</h3>
                                    <span className={`flex h-1.5 w-1.5 rounded-full ${groupJid ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-xl">
                                    Grupo do WhatsApp onde os corretores e gerentes serão notificados.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${groupJid ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>
                                {groupJid ? 'Configurado' : 'Pendente'}
                            </span>

                            <div className="h-6 w-px bg-border hidden sm:block" />

                            <button 
                                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                                onClick={(e) => { e.stopPropagation(); setWaExpanded(!waExpanded); }}
                            >
                                <motion.div
                                    animate={{ rotate: waExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ChevronDown size={20} />
                                </motion.div>
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {waExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <form onSubmit={handleSaveWhatsApp} className="p-6 space-y-4 border-t border-border/50">
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

                                <div className="flex justify-end pt-2 border-t border-border/50">
                                    <button
                                        type="submit"
                                        disabled={savingWa}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all"
                                    >
                                        {savingWa ? (
                                            <><Loader2 size={13} className="animate-spin" /> Salvando...</>
                                        ) : (
                                            <><Save size={13} /> Salvar Grupo</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
