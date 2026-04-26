'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    BarChart3,
    Clock,
    User,
    MessageSquare,
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { toast } from 'sonner';
import {
    getFollowupLogs,
    getEnrollmentsBySequence,
    cancelEnrollment,
} from '@/app/_actions/followup';

interface FollowUpLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sequenceId: string;
    sequenceName: string;
}

export default function FollowUpLogsModal({ isOpen, onClose, sequenceId, sequenceName }: FollowUpLogsModalProps) {
    const [activeTab, setActiveTab] = useState<'logs' | 'enrolled'>('logs');
    const [logs, setLogs] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [logsResult, enrollResult] = await Promise.all([
                getFollowupLogs(sequenceId),
                getEnrollmentsBySequence(sequenceId),
            ]);

            if (logsResult.success) setLogs(logsResult.data || []);
            if (enrollResult.success) setEnrollments(enrollResult.data || []);
        } catch {
            toast.error('Erro ao carregar dados.');
        } finally {
            setIsLoading(false);
        }
    }, [sequenceId]);

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, fetchData]);

    const handleCancelEnrollment = async (enrollmentId: string) => {
        if (!confirm('Cancelar inscrição deste lead?')) return;
        const result = await cancelEnrollment(enrollmentId);
        if (result.success) {
            toast.success('Inscrição cancelada.');
            fetchData();
        } else {
            toast.error(result.error || 'Erro ao cancelar.');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
            case 'failed': return <XCircle className="h-3.5 w-3.5 text-red-600" />;
            case 'skipped': return <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />;
            default: return null;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'sent': return 'Enviado';
            case 'failed': return 'Falhou';
            case 'skipped': return 'Pulado';
            case 'active': return 'Ativo';
            case 'completed': return 'Concluído';
            case 'paused': return 'Pausado';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    };

    const getEnrollmentStatusStyle = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-50 text-green-700';
            case 'completed': return 'bg-purple-50 text-purple-700';
            case 'paused': return 'bg-yellow-50 text-yellow-700';
            case 'cancelled': return 'bg-red-50 text-red-700';
            default: return 'bg-gray-50 text-gray-700';
        }
    };

    const getCancelReasonLabel = (reason: string | null) => {
        switch (reason) {
            case 'manual': return 'Cancelamento manual';
            case 'reply_received': return 'Lead respondeu';
            case 'stage_changed': return 'Mudou de estágio';
            default: return '';
        }
    };

    // Métricas
    const totalSent = logs.filter(l => l.status === 'sent').length;
    const totalFailed = logs.filter(l => l.status === 'failed').length;
    const successRate = logs.length > 0 ? Math.round((totalSent / logs.length) * 100) : 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Histórico — ${sequenceName}`}
            size="xl"
        >
            <div className="space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50/50 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-lg font-black text-green-700">{totalSent}</p>
                        <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider">Enviados</p>
                    </div>
                    <div className="bg-red-50/50 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-lg font-black text-red-700">{totalFailed}</p>
                        <p className="text-[9px] text-red-600 font-bold uppercase tracking-wider">Falhas</p>
                    </div>
                    <div className="bg-blue-50/50 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-lg font-black text-blue-700">{successRate}%</p>
                        <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Taxa de Sucesso</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {(['logs', 'enrolled'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === tab
                                    ? 'bg-white text-[#404F4F] shadow-sm'
                                    : 'text-muted-foreground hover:text-[#404F4F]'
                            }`}
                        >
                            {tab === 'logs' ? (
                                <span className="flex items-center justify-center gap-1.5">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    Logs de Envio ({logs.length})
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-1.5">
                                    <User className="h-3.5 w-3.5" />
                                    Leads Inscritos ({enrollments.length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Conteúdo */}
                <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-[#404F4F]/30" />
                            <p className="text-xs text-muted-foreground mt-2">Carregando...</p>
                        </div>
                    ) : activeTab === 'logs' ? (
                        logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground mt-2">Nenhum envio registrado.</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {logs.map((log: any) => (
                                    <div
                                        key={log.id}
                                        className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-border/30"
                                    >
                                        {getStatusIcon(log.status)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-[#404F4F] truncate">
                                                    {(log as any).followup_enrollments?.leads?.contacts?.name || 'Lead'}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground">
                                                    Etapa {((log as any).followup_steps?.order_index || 0) + 1}
                                                </span>
                                            </div>
                                            {log.error_message && (
                                                <p className="text-[10px] text-red-500 truncate">{log.error_message}</p>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {formatDate(log.sent_at)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        enrollments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <User className="h-6 w-6 text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground mt-2">Nenhum lead inscrito.</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {enrollments.map((enrollment: any) => (
                                    <div
                                        key={enrollment.id}
                                        className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-border/30"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-[#404F4F] truncate">
                                                    {enrollment.leads?.contacts?.name || 'Lead'}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${getEnrollmentStatusStyle(enrollment.status)}`}>
                                                    {getStatusLabel(enrollment.status)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-muted-foreground">
                                                    Etapa {enrollment.current_step_index + 1}
                                                </span>
                                                {enrollment.cancelled_reason && (
                                                    <span className="text-[10px] text-red-500">
                                                        • {getCancelReasonLabel(enrollment.cancelled_reason)}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground">
                                                    • Inscrito em {formatDate(enrollment.enrolled_at)}
                                                </span>
                                            </div>
                                        </div>
                                        {enrollment.status === 'active' && (
                                            <button
                                                onClick={() => handleCancelEnrollment(enrollment.id)}
                                                className="px-2 py-1 rounded-lg text-[9px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all shrink-0"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </Modal>
    );
}
