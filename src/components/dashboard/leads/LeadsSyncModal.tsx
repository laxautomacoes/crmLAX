'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/shared/Modal';
import { RDStationIcon } from '@/components/icons/BrandIcons';
import { Loader2, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { getRDStationConfig, syncRDStationAction } from '@/app/_actions/rd-station';
import { toast } from 'sonner';

interface LeadsSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSyncSuccess?: () => void;
}

export function LeadsSyncModal({ isOpen, onClose, onSyncSuccess }: LeadsSyncModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [status, setStatus] = useState<'active' | 'inactive'>('inactive');
    const [token, setToken] = useState('');
    const [settings, setSettings] = useState<any>({});

    const loadConfig = async () => {
        try {
            setIsLoading(true);
            const res = await getRDStationConfig();
            if (res.data) {
                setStatus(res.data.status === 'active' ? 'active' : 'inactive');
                setToken(res.data.credentials?.token || '');
                setSettings(res.data.settings || {});
            } else {
                setStatus('inactive');
                setToken('');
                setSettings({});
            }
        } catch (err) {
            console.error('Erro ao carregar configurações do RD Station:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await syncRDStationAction();
            if (res.success) {
                toast.success(`Sincronização concluída! ${res.imported} novos, ${res.updated} atualizados.`);
                await loadConfig();
                if (onSyncSuccess) {
                    onSyncSuccess();
                }
            } else {
                toast.error('Erro na sincronização: ' + res.error);
            }
        } catch (err: any) {
            toast.error('Erro ao sincronizar: ' + (err?.message || 'Falha inesperada'));
        } finally {
            setIsSyncing(false);
        }
    };

    const syncHistory = (() => {
        if (Array.isArray(settings?.sync_history) && settings.sync_history.length > 0) {
            return settings.sync_history;
        }
        if (settings?.last_sync_at) {
            return [
                {
                    date: settings.last_sync_at,
                    imported: settings.last_sync_imported ?? 0,
                    updated: settings.last_sync_updated ?? 0,
                    skipped: settings.last_sync_skipped ?? 0,
                }
            ];
        }
        return [];
    })();

    const lastSyncAt = settings?.last_sync_at
        ? new Date(settings.last_sync_at).toLocaleString('pt-BR')
        : 'Nenhuma sincronização ainda';

    const isReadyToSync = status === 'active' && Boolean(token?.trim());

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#0082FF]/10 text-[#0082FF] shrink-0">
                        <RDStationIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-foreground uppercase tracking-widest">
                            Sincronização RD Station CRM
                        </h3>
                        <p className="text-xs text-muted-foreground leading-snug mt-1">
                            <span className="block">Sincronize contatos e negociações com o seu pipeline de leads.</span>
                        </p>
                    </div>
                </div>
            }
        >
            <div className="space-y-8">
                {/* Seção 1: Sincronização de Negócios */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
                            Sincronização de Negócios
                        </h3>
                        <p className="text-xs text-muted-foreground leading-snug mt-1">
                            <span className="block">Importa novas negociações e atualiza os valores das existentes.</span>
                            <span className="block">Último sync: {lastSyncAt}</span>
                        </p>
                    </div>

                    {!isReadyToSync && !isLoading && (
                        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-foreground">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={16} className="text-amber-500 shrink-0" />
                                <span>A integração com o RD Station CRM precisa estar ativa e com token configurado para sincronizar.</span>
                            </div>
                            <Link
                                href="/settings/integrations"
                                className="text-xs font-bold text-foreground underline hover:text-foreground/80 flex items-center gap-1 shrink-0"
                            >
                                Configurar Integração
                                <ExternalLink size={12} />
                            </Link>
                        </div>
                    )}

                    {/* Métricas do último sync */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-muted/40 rounded-lg border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Importados</span>
                            <p className="text-lg font-black text-foreground mt-0.5">
                                {isLoading ? '-' : (settings?.last_sync_imported ?? 0)}
                            </p>
                        </div>
                        <div className="p-3 bg-muted/40 rounded-lg border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Atualizados</span>
                            <p className="text-lg font-black text-foreground mt-0.5">
                                {isLoading ? '-' : (settings?.last_sync_updated ?? 0)}
                            </p>
                        </div>
                        <div className="p-3 bg-muted/40 rounded-lg border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ignorados</span>
                            <p className="text-lg font-black text-muted-foreground mt-0.5">
                                {isLoading ? '-' : (settings?.last_sync_skipped ?? 0)}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={handleSync}
                            disabled={isSyncing || isLoading || !isReadyToSync}
                            className="h-[34px] min-w-[160px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 rounded-lg hover:bg-[#F2DB00] active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm disabled:opacity-50"
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Sincronizando...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={14} strokeWidth={1.5} />
                                    Sincronizar Agora
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Seção 2: Histórico de Sincronizações */}
                <div className="space-y-4 pt-8 border-t border-border/50">
                    <div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
                            Histórico de Sincronizações
                        </h3>
                        <p className="text-xs text-muted-foreground leading-snug mt-1">
                            <span className="block">Registro detalhado dos últimos sincronismos realizados nesta integração.</span>
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="p-8 rounded-lg bg-muted/20 border border-border flex items-center justify-center">
                            <Loader2 size={20} className="animate-spin text-muted-foreground" />
                        </div>
                    ) : syncHistory.length === 0 ? (
                        <div className="p-4 rounded-lg bg-muted/20 border border-border text-center text-xs text-muted-foreground">
                            Nenhuma sincronização registrada no histórico ainda.
                        </div>
                    ) : (
                        <div className="bg-card rounded-lg border border-muted-foreground/30 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                                    <thead className="bg-gray-200 dark:bg-muted/50 border-b border-muted-foreground/30">
                                        <tr>
                                            <th className="px-4 py-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider">
                                                Data / Hora
                                            </th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider text-center w-24">
                                                Novos
                                            </th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider text-center w-28">
                                                Atualizados
                                            </th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider text-center w-24">
                                                Ignorados
                                            </th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold text-foreground uppercase tracking-wider text-center w-20">
                                                Notas
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-muted-foreground/30">
                                        {syncHistory.map((item: any, index: number) => {
                                            const formattedDate = item.date
                                                ? new Date(item.date).toLocaleString('pt-BR', {
                                                      day: '2-digit',
                                                      month: '2-digit',
                                                      year: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                      second: '2-digit',
                                                  })
                                                : '-';

                                            return (
                                                <tr key={index} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-2.5 text-xs font-medium text-foreground">
                                                        {formattedDate}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center">
                                                        +{item.imported ?? 0}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-xs font-bold text-foreground text-center">
                                                        {item.updated ?? 0}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-xs font-medium text-muted-foreground text-center">
                                                        {item.skipped ?? 0}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-xs font-bold text-foreground text-center">
                                                        {item.notes_synced !== undefined ? item.notes_synced : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
