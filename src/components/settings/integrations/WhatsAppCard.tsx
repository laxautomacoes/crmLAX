'use client';

import { useState, useEffect } from 'react';
import { 
    MessageCircle, 
    QrCode, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    RefreshCw, 
    Power,
    ChevronDown,
    Trash2
} from 'lucide-react';
import { 
    setupWhatsAppInstance, 
    getWhatsAppInstance, 
    getQrCode, 
    refreshInstanceStatus, 
    disconnectWhatsApp,
    deleteWhatsAppInstance 
} from '@/app/_actions/whatsapp';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/Switch';
import { getIntegration, updateIntegrationStatus } from '@/app/_actions/integrations';
import { motion, AnimatePresence } from 'framer-motion';

export function WhatsAppCard() {
    const [instance, setInstance] = useState<any>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const { data: integData } = await getIntegration('whatsapp');
        setIsActive(integData?.status === 'active');

        const { data } = await getWhatsAppInstance();
        setInstance(data);
        if (data && data.status === 'disconnected') {
            await fetchQrCode(data.instance_name);
        }
        setLoading(false);
    };

    const handleToggleStatus = async (checked: boolean) => {
        setIsUpdatingStatus(true);
        const { error } = await updateIntegrationStatus('whatsapp', checked ? 'active' : 'inactive');
        
        if (error) {
            toast.error('Erro ao atualizar status: ' + error);
        } else {
            setIsActive(checked);
            toast.success(`Integração ${checked ? 'ativada' : 'desativada'} com sucesso!`);
        }
        setIsUpdatingStatus(false);
    };

    const fetchQrCode = async (instanceName: string) => {
        const { data, error } = await getQrCode();
        if (data?.base64) {
            setQrCode(data.base64);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleConnect = async () => {
        setRefreshing(true);
        const { data, error } = await setupWhatsAppInstance();
        if (error) {
            toast.error('Erro na integração', {
                description: typeof error === 'string' ? error : (error as any)?.message || 'Ocorreu um erro desconhecido',
                duration: 5000
            });
        } else {
            setInstance(data);
            await fetchQrCode(data.instance_name);
        }
        setRefreshing(false);
    };

    const handleDisconnect = async () => {
        if (!confirm('Tem certeza que deseja desconectar o WhatsApp? A instância será mantida para reconexão.')) return;
        setRefreshing(true);
        const { error } = await disconnectWhatsApp();
        if (error) {
            toast.error('Erro ao desconectar: ' + error);
        } else {
            setInstance((prev: any) => prev ? { ...prev, status: 'disconnected' } : null);
            setQrCode(null);
            toast.success('WhatsApp desconectado. Escaneie o QR Code para reconectar.');
        }
        setRefreshing(false);
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja EXCLUIR a instância? Esta ação é irreversível e removerá toda a configuração.')) return;
        setRefreshing(true);
        const { error } = await deleteWhatsAppInstance();
        if (error) {
            toast.error('Erro ao excluir instância: ' + error);
        } else {
            setInstance(null);
            setQrCode(null);
            toast.success('Instância excluída com sucesso');
        }
        setRefreshing(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        const { status, error } = await refreshInstanceStatus();
        if (error) {
            toast.error('Erro ao atualizar status');
        } else if (status === 'connected') {
            toast.success('WhatsApp conectado!');
            await loadData();
        } else {
            await fetchQrCode(instance.instance_name);
        }
        setRefreshing(false);
    };

    if (loading) {
        return (
            <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center justify-center min-h-[150px]">
                <Loader2 className="w-8 h-8 animate-spin text-secondary mb-4" />
                <p className="text-muted-foreground">Carregando integração...</p>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden transition-all hover:bg-muted/5">
            <div 
                className="px-6 py-4 border-b border-border bg-muted/30 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="p-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366]">
                            <MessageCircle size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-foreground">WhatsApp</h3>
                                <span className={`flex h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            </div>
                            <p className="text-xs text-muted-foreground max-w-xl line-clamp-1">
                                {isExpanded 
                                    ? 'Conecte seu WhatsApp para enviar mensagens e sincronizar conversas em tempo real.'
                                    : instance?.status === 'connected' ? '✓ Conectado e pronto para uso' : 'Aguardando configuração de conexão'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleToggleStatus(!isActive)}>
                            <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${isActive ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>
                                {isActive ? 'Ativo' : 'Desativado'}
                            </span>
                            <Switch 
                                checked={isActive} 
                                onChange={handleToggleStatus}
                                disabled={isUpdatingStatus}
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
                        <div className="p-8 flex flex-col items-center justify-center border-t border-border/50">
                            {!instance ? (
                                <div className="text-center space-y-6 max-w-sm">
                                    <div className="p-6 rounded-2xl bg-muted/50 border border-dashed border-border inline-block">
                                        <QrCode size={48} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                                        <p className="text-sm text-muted-foreground font-medium">Nenhuma instância configurada</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed px-4">
                                        Para começar, você precisa criar uma instância de conexão segura com o nosso servidor de mensagens.
                                    </p>
                                    <button
                                        onClick={handleConnect}
                                        disabled={refreshing}
                                        className="w-full py-3 bg-[#25D366] text-white rounded-lg font-bold hover:bg-[#20BA5A] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 active:scale-[0.98]"
                                    >
                                        {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power size={20} />}
                                        Configurar Integração
                                    </button>
                                </div>
                            ) : instance.status === 'connected' ? (
                                <div className="text-center space-y-6">
                                    <div className="p-8 rounded-full bg-emerald-500/10 text-emerald-500 inline-flex items-center justify-center">
                                        <CheckCircle2 size={64} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-foreground">Conectado com sucesso!</h4>
                                        <p className="text-sm text-muted-foreground mt-1">Seu WhatsApp está pronto para uso e sincronização.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 justify-center">
                                        <button
                                            onClick={handleRefresh}
                                            disabled={refreshing}
                                            className="px-6 py-2.5 bg-card border border-border text-foreground rounded-lg font-bold hover:bg-muted transition-all flex items-center gap-2 active:scale-95"
                                        >
                                            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                                            Atualizar Status
                                        </button>
                                        <button
                                            onClick={handleDisconnect}
                                            disabled={refreshing}
                                            className="px-6 py-2.5 bg-orange-500/10 text-orange-500 rounded-lg font-bold hover:bg-orange-500 hover:text-white transition-all flex items-center gap-2 active:scale-95"
                                        >
                                            <Power size={18} />
                                            Desconectar
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={refreshing}
                                            className="px-6 py-2.5 bg-red-500/10 text-red-500 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 active:scale-95"
                                        >
                                            <Trash2 size={18} />
                                            Excluir Instância
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row items-center gap-12 max-w-2xl w-full">
                                    <div className="flex-1 space-y-4 text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-2 text-orange-500">
                                            <AlertCircle size={20} />
                                            <span className="font-bold uppercase text-xs tracking-wider">Aguardando Conexão</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-foreground">Escaneie o QR Code</h4>
                                        <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside text-left">
                                            <li>Abra o WhatsApp no seu celular</li>
                                            <li>Toque em <b>Dispositivos Conectados</b></li>
                                            <li>Toque em <b>Conectar um dispositivo</b></li>
                                            <li>Aponte seu celular para esta tela</li>
                                        </ol>
                                        <div className="pt-4 flex gap-3 justify-center md:justify-start">
                                            <button
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-all flex items-center gap-2"
                                            >
                                                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                                                Já escaneei
                                            </button>
                                            <button
                                                onClick={handleDisconnect}
                                                className="px-6 py-2 text-muted-foreground hover:text-red-500 transition-colors text-sm font-medium"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366] to-[#20BA5A] rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                        <div className="relative p-4 bg-white rounded-2xl border border-border shadow-xl">
                                            {qrCode ? (
                                                <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56" />
                                            ) : (
                                                <div className="w-56 h-56 flex items-center justify-center">
                                                    <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
