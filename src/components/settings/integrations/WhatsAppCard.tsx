import { useState, useEffect, useCallback, useRef } from 'react';
import { WhatsAppIcon } from '@/components/icons/BrandIcons';
import { 
    QrCode, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    RefreshCw, 
    Power,
    Trash2,
    Send,
    Phone,
    Wifi,
    WifiOff
} from 'lucide-react';
import { 
    setupWhatsAppInstance, 
    getWhatsAppInstance, 
    getQrCode, 
    refreshInstanceStatus, 
    disconnectWhatsApp,
    deleteWhatsAppInstance,
    sendTestMessage
} from '@/app/_actions/whatsapp';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/Switch';
import { getIntegration, updateIntegrationStatus } from '@/app/_actions/integrations';
import { Modal } from '@/components/shared/Modal';

/** Formata telefone para exibição: 5548999887766 → (48) 99988-7766 */
function formatPhoneDisplay(phone: string | null | undefined): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    // Remove DDI 55 se presente
    const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
    if (local.length === 11) {
        return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    if (local.length === 10) {
        return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    return phone;
}

export function WhatsAppCard() {
    const [instance, setInstance] = useState<any>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [liveStatus, setLiveStatus] = useState<'checking' | 'connected' | 'disconnected' | null>(null);
    const [qrError, setQrError] = useState<string | null>(null);
    const [showQr, setShowQr] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const { data: integData } = await getIntegration('whatsapp');
        setIsActive(integData?.status === 'active');

        const { data } = await getWhatsAppInstance();
        if (data) {
            // Verificar status real na Evolution API (não confiar no banco)
            const { status, connectedPhone, error } = await refreshInstanceStatus();
            if (error) {
                data.status = 'disconnected';
                data.connected_phone = null;
            } else {
                data.status = status || data.status;
                data.connected_phone = connectedPhone || data.connected_phone;
            }
            setInstance(data);
            // NÃO buscar QR code automaticamente — usuário decide quando reconectar
        } else {
            setInstance(null);
        }
        setLoading(false);
    };

    // Verificação em tempo real ao abrir o modal
    const checkLiveStatus = useCallback(async () => {
        if (!instance) return;
        setLiveStatus('checking');
        const { status, connectedPhone, error } = await refreshInstanceStatus();
        if (error) {
            setLiveStatus('disconnected');
            setInstance((prev: any) => prev ? { ...prev, status: 'disconnected', connected_phone: null } : prev);
        } else {
            setLiveStatus(status === 'connected' ? 'connected' : 'disconnected');
            // Atualizar instância local com dados novos
            setInstance((prev: any) => prev ? { 
                ...prev, 
                status, 
                connected_phone: connectedPhone || prev.connected_phone 
            } : prev);
            if (status !== 'connected') {
                setInstance((prev: any) => prev ? { ...prev, status: 'disconnected' } : prev);
            }
        }
    }, [instance]);

    // Auto-verificar ao abrir o modal
    useEffect(() => {
        if (isModalOpen && instance && !loading) {
            checkLiveStatus();
        }
    }, [isModalOpen]);

    // Polling automático: verificar conexão a cada 5s quando QR code está visível
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        const shouldPoll = instance && instance.status === 'disconnected' && isModalOpen && !loading;
        if (shouldPoll) {
            pollingRef.current = setInterval(async () => {
                const { status, connectedPhone, error } = await refreshInstanceStatus();
                if (!error && status === 'connected') {
                    // Conexão detectada! Atualizar UI
                    setInstance((prev: any) => prev ? {
                        ...prev,
                        status: 'connected',
                        connected_phone: connectedPhone || prev.connected_phone
                    } : prev);
                    setLiveStatus('connected');
                    setQrCode(null);
                    toast.success('WhatsApp conectado com sucesso!');
                }
            }, 5000);
        }
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [instance?.status, isModalOpen, loading]);

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
        setQrCode(null);
        setQrError(null);
        const result = await getQrCode();
        if (result.data?.base64) {
            setQrCode(result.data.base64);
            setQrError(null);
        } else if ((result as any).connected) {
            // A instância já está conectada, atualizar status
            setInstance((prev: any) => prev ? { ...prev, status: 'connected' } : prev);
        } else if (result.error) {
            setQrError(result.error);
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
            setShowQr(true);
            await fetchQrCode(data.instance_name);
        }
        setRefreshing(false);
    };

    const handleDisconnect = async () => {
        if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
        setRefreshing(true);
        await disconnectWhatsApp();
        setInstance((prev: any) => prev ? { ...prev, status: 'disconnected', connected_phone: null } : prev);
        setQrCode(null);
        setShowQr(false);
        setLiveStatus('disconnected');
        toast.success('WhatsApp desconectado com sucesso.');
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
            setLiveStatus(null);
            toast.success('Instância excluída com sucesso');
        }
        setRefreshing(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setLiveStatus('checking');
        const { status, connectedPhone, error } = await refreshInstanceStatus();
        if (error) {
            toast.error('Instância desconectada ou não encontrada no servidor.');
            setLiveStatus('disconnected');
            // Atualizar para mostrar tela de QR code
            setInstance((prev: any) => prev ? { ...prev, status: 'disconnected', connected_phone: null } : prev);
            if (instance?.instance_name) await fetchQrCode(instance.instance_name);
        } else if (status === 'connected') {
            toast.success('WhatsApp conectado!');
            setLiveStatus('connected');
            setInstance((prev: any) => prev ? { 
                ...prev, 
                status: 'connected',
                connected_phone: connectedPhone || prev.connected_phone
            } : prev);
        } else {
            setLiveStatus('disconnected');
            setInstance((prev: any) => prev ? { ...prev, status: 'disconnected' } : prev);
            await fetchQrCode(instance.instance_name);
        }
        setRefreshing(false);
    };

    const handleSendTest = async () => {
        setIsTesting(true);
        const { success, error } = await sendTestMessage();
        if (error) {
            toast.error('Falha no teste', { description: error });
        } else {
            toast.success('Mensagem de teste enviada!', {
                description: 'Verifique seu WhatsApp — você deve receber a mensagem agora.'
            });
        }
        setIsTesting(false);
    };

    if (loading) {
        return (
            <div className="bg-card rounded-xl border border-border p-8 flex flex-col items-center justify-center min-h-[108px]">
                <Loader2 className="w-6 h-6 animate-spin text-secondary mb-2" />
                <p className="text-xs text-muted-foreground">Carregando integração...</p>
            </div>
        );
    }

    // Helper para texto do subtitle no header
    const isConnected = instance?.status === 'connected';
    const headerSubtitle = () => {
        if (isConnected && instance?.connected_phone) {
            return `Conectado · ${formatPhoneDisplay(instance.connected_phone)}`;
        }
        if (isConnected) return 'Conectado e pronto para uso';
        return 'Nenhuma instância configurada';
    };

    return (
        <>
            <div 
                className="bg-card rounded-xl border border-border overflow-hidden transition-all hover:bg-muted/5 cursor-pointer select-none"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="px-6 py-6 bg-muted/30">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="p-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366]">
                                <WhatsAppIcon size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-foreground">WhatsApp</h3>
                                    <span className={`flex h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                </div>
                                <p className="text-xs text-muted-foreground max-w-xl line-clamp-1">
                                    {headerSubtitle()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="lg"
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#25D366]/10 text-[#25D366]">
                            <WhatsAppIcon size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground">Configurar WhatsApp</h3>
                            <p className="text-xs text-muted-foreground">Gerencie sua instância de conexão e disparos.</p>
                        </div>
                    </div>
                }
            >
                <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-4">
                    <div>
                        <span className="text-xs font-bold text-foreground">Status da Integração</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Ative ou desative o WhatsApp.</p>
                    </div>
                    <Switch 
                        checked={isActive} 
                        onChange={handleToggleStatus}
                        disabled={isUpdatingStatus}
                    />
                </div>

                <div className="flex flex-col items-center justify-center py-4">
                    {!instance ? (
                        <div className="text-center space-y-6 max-w-sm w-full">
                            <div className="p-6 rounded-xl bg-muted/50 border border-dashed border-border inline-block w-full">
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
                        <div className="w-full space-y-4">
                            <div className="flex flex-col gap-4">
                                {/* Número conectado */}
                                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/20 rounded-xl border border-border w-full">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Phone size={16} className="text-[#25D366] shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Número Conectado</p>
                                            <p className="text-sm font-bold text-foreground">{instance.connected_phone ? formatPhoneDisplay(instance.connected_phone) : '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {liveStatus === 'connected' && (
                                            <>
                                                <Wifi size={14} className="text-emerald-500" />
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase">Online</span>
                                            </>
                                        )}
                                        {liveStatus === 'disconnected' && (
                                            <>
                                                <WifiOff size={14} className="text-red-500" />
                                                <span className="text-[10px] font-bold text-red-500 uppercase">Offline</span>
                                            </>
                                        )}
                                        {liveStatus === 'checking' && (
                                            <Loader2 size={14} className="text-muted-foreground animate-spin" />
                                        )}
                                    </div>
                                </div>

                                {/* Botões empilhados verticalmente */}
                                <div className="flex flex-col gap-2 w-full">
                                    <button
                                        onClick={handleSendTest}
                                        disabled={isTesting || !instance.connected_phone}
                                        className="w-full px-4 py-2.5 bg-[#25D366] text-white rounded-lg font-bold hover:bg-[#20BA5A] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs"
                                    >
                                        {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        Enviar Teste
                                    </button>
                                    <button
                                        onClick={handleRefresh}
                                        disabled={refreshing}
                                        className="w-full px-4 py-2.5 bg-card border border-border text-foreground rounded-lg font-bold hover:bg-muted transition-all flex items-center justify-center gap-2 active:scale-95 text-xs"
                                    >
                                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                                        Verificar Status
                                    </button>
                                    <button
                                        onClick={handleDisconnect}
                                        disabled={refreshing}
                                        className="w-full px-4 py-2.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-lg font-bold hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 text-xs"
                                    >
                                        <Power size={14} />
                                        Desconectar
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={refreshing}
                                        className="w-full px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 text-xs"
                                    >
                                        <Trash2 size={14} />
                                        Excluir Instância
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : showQr ? (
                        <div className="flex flex-col items-center gap-6 w-full text-center">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366] to-[#20BA5A] rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                <div className="relative p-4 bg-white rounded-xl border border-border shadow-xl">
                                    {qrCode ? (
                                        <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto" />
                                    ) : qrError ? (
                                        <div className="w-48 h-48 flex flex-col items-center justify-center gap-3 p-4">
                                            <WifiOff size={32} className="text-red-400" />
                                            <p className="text-xs text-center text-red-500 font-medium leading-tight">
                                                Servidor indisponível
                                            </p>
                                            <button
                                                onClick={() => instance && fetchQrCode(instance.instance_name)}
                                                className="text-xs px-3 py-1.5 bg-secondary/10 text-secondary rounded-md font-bold hover:bg-secondary/20 transition-colors"
                                            >
                                                Tentar novamente
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-48 h-48 flex items-center justify-center mx-auto">
                                            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 w-full">
                                <div className="flex items-center justify-center gap-2 text-orange-500">
                                    <AlertCircle size={18} />
                                    <span className="font-bold uppercase text-xs tracking-wider">Aguardando Conexão</span>
                                </div>
                                <h4 className="text-base font-bold text-foreground">Escaneie o QR Code</h4>
                                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside text-left px-2">
                                    <li>Abra o WhatsApp no celular</li>
                                    <li>Toque em <b>Dispositivos Conectados</b></li>
                                    <li>Toque em <b>Conectar dispositivo</b></li>
                                    <li>Aponte o celular para o QR Code acima</li>
                                </ol>
                                <div className="pt-2 flex flex-col gap-2 w-full">
                                    <button
                                        onClick={handleRefresh}
                                        disabled={refreshing}
                                        className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 text-xs"
                                    >
                                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                                        Já escaneei
                                    </button>
                                    <button
                                        onClick={() => { setShowQr(false); setQrCode(null); }}
                                        className="w-full py-2 text-muted-foreground hover:text-red-500 transition-colors text-xs font-medium"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Estado desconectado — botão para reconectar */
                        <div className="text-center space-y-6 max-w-sm w-full">
                            <div className="p-6 rounded-xl bg-orange-500/5 border border-orange-500/20 inline-flex flex-col items-center gap-3 w-full">
                                <WifiOff size={40} className="text-orange-400" />
                                <div>
                                    <h4 className="text-base font-bold text-foreground">Desconectado</h4>
                                    <p className="text-xs text-muted-foreground mt-1">A sessão do WhatsApp não está ativa.</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    setShowQr(true);
                                    if (instance) await fetchQrCode(instance.instance_name);
                                }}
                                disabled={refreshing}
                                className="w-full py-3 bg-[#25D366] text-white rounded-lg font-bold hover:bg-[#20BA5A] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 active:scale-[0.98]"
                            >
                                <Power size={20} />
                                Reconectar WhatsApp
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={refreshing}
                                className="text-xs text-muted-foreground hover:text-red-500 transition-colors font-medium w-full block text-center"
                            >
                                <span className="flex items-center justify-center gap-1.5"><Trash2 size={14} /> Excluir instância</span>
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}
