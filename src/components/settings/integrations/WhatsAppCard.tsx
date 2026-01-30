'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, QrCode, Loader2, CheckCircle2, AlertCircle, RefreshCw, Power } from 'lucide-react';
import { setupWhatsAppInstance, getWhatsAppInstance, getQrCode, refreshInstanceStatus, disconnectWhatsApp } from '@/app/_actions/whatsapp';
import { toast } from 'sonner';

export function WhatsAppCard() {
    const [instance, setInstance] = useState<any>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const { data } = await getWhatsAppInstance();
        setInstance(data);
        if (data && data.status === 'disconnected') {
            await fetchQrCode(data.instance_name);
        }
        setLoading(false);
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
        if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
        setRefreshing(true);
        const { error } = await disconnectWhatsApp();
        if (error) {
            toast.error('Erro ao desconectar: ' + error);
        } else {
            setInstance(null);
            setQrCode(null);
            toast.success('WhatsApp desconectado com sucesso');
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
            <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-secondary mb-4" />
                <p className="text-muted-foreground">Carregando integração...</p>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-[#25D366]/10 text-[#25D366]">
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">WhatsApp</h3>
                        <p className="text-sm text-muted-foreground">Conecte seu WhatsApp para enviar mensagens e sincronizar conversas.</p>
                    </div>
                </div>
            </div>

            <div className="p-8 flex flex-col items-center justify-center">
                {!instance ? (
                    <div className="text-center space-y-6">
                        <div className="p-6 rounded-2xl bg-muted/50 border border-dashed border-border inline-block">
                            <QrCode size={48} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p className="text-sm text-muted-foreground">Nenhuma instância configurada</p>
                        </div>
                        <button
                            onClick={handleConnect}
                            disabled={refreshing}
                            className="w-full max-w-xs py-3 bg-[#25D366] text-white rounded-lg font-bold hover:bg-[#20BA5A] transition-all flex items-center justify-center gap-2"
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
                            <p className="text-sm text-muted-foreground mt-1">Seu WhatsApp está pronto para uso.</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="px-6 py-2 bg-card border border-border text-foreground rounded-lg font-bold hover:bg-muted transition-all flex items-center gap-2"
                            >
                                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                                Atualizar Status
                            </button>
                            <button
                                onClick={handleDisconnect}
                                disabled={refreshing}
                                className="px-6 py-2 bg-red-500/10 text-red-500 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                            >
                                <Power size={18} />
                                Desconectar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row items-center gap-12 max-w-2xl w-full">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-2 text-orange-500">
                                <AlertCircle size={20} />
                                <span className="font-bold">Aguardando Conexão</span>
                            </div>
                            <h4 className="text-lg font-bold text-foreground">Escaneie o QR Code</h4>
                            <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
                                <li>Abra o WhatsApp no seu celular</li>
                                <li>Toque em Dispositivos Conectados</li>
                                <li>Toque em Conectar um dispositivo</li>
                                <li>Aponte seu celular para esta tela para capturar o QR Code</li>
                            </ol>
                            <div className="pt-4 flex gap-3">
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
                                    className="px-6 py-2 text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366] to-[#20BA5A] rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative p-4 bg-white rounded-2xl border border-border">
                                {qrCode ? (
                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                                ) : (
                                    <div className="w-64 h-64 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
