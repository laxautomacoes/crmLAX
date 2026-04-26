'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Play,
    Pause,
    Trash2,
    Edit3,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    BarChart3,
    MessageSquare,
    Search,
    Loader2,
    RefreshCw,
    Zap,
    ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    getFollowupSequences,
    toggleFollowupSequence,
    deleteFollowupSequence,
    validateFollowupPlanLimits,
} from '@/app/_actions/followup';
import FollowUpSequenceModal from './FollowUpSequenceModal';
import FollowUpEnrollModal from './FollowUpEnrollModal';
import FollowUpLogsModal from './FollowUpLogsModal';

interface FollowUpDashboardProps {
    tenantId: string;
    profileId: string;
    isAdmin: boolean;
    userRole: string;
}

export default function FollowUpDashboard({ tenantId, profileId, isAdmin, userRole }: FollowUpDashboardProps) {
    const [sequences, setSequences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [search, setSearch] = useState('');

    // Modais
    const [isSequenceModalOpen, setIsSequenceModalOpen] = useState(false);
    const [editingSequence, setEditingSequence] = useState<any>(null);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [enrollSequenceId, setEnrollSequenceId] = useState<string | null>(null);
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
    const [logsSequenceId, setLogsSequenceId] = useState<string | null>(null);
    const [logsSequenceName, setLogsSequenceName] = useState('');

    const fetchSequences = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getFollowupSequences();
            if (result.success) {
                setSequences(result.data || []);
            } else {
                toast.error(result.error || 'Erro ao carregar sequências.');
            }
        } catch {
            toast.error('Erro ao carregar sequências.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchSequences(); }, [fetchSequences]);

    const handleToggle = async (id: string, currentStatus: boolean) => {
        if (!currentStatus) {
            const limits = await validateFollowupPlanLimits();
            if (!limits.allowed) {
                toast.error(limits.error);
                return;
            }
        }

        const result = await toggleFollowupSequence(id, !currentStatus);
        if (result.success) {
            toast.success(currentStatus ? 'Sequência pausada.' : 'Sequência ativada!');
            fetchSequences();
        } else {
            toast.error(result.error || 'Erro ao alterar status.');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Excluir a sequência "${name}"? Todas as inscrições e logs serão removidos.`)) return;

        const result = await deleteFollowupSequence(id);
        if (result.success) {
            toast.success('Sequência excluída.');
            fetchSequences();
        } else {
            toast.error(result.error || 'Erro ao excluir.');
        }
    };

    const handleEdit = (sequence: any) => {
        setEditingSequence(sequence);
        setIsSequenceModalOpen(true);
    };

    const handleNewSequence = async () => {
        const limits = await validateFollowupPlanLimits();
        if (!limits.allowed) {
            toast.error(limits.error);
            return;
        }
        setEditingSequence(null);
        setIsSequenceModalOpen(true);
    };

    const handleEnroll = (sequenceId: string) => {
        setEnrollSequenceId(sequenceId);
        setIsEnrollModalOpen(true);
    };

    const handleViewLogs = (sequenceId: string, sequenceName: string) => {
        setLogsSequenceId(sequenceId);
        setLogsSequenceName(sequenceName);
        setIsLogsModalOpen(true);
    };

    const getDelayLabel = (value: number, unit: string) => {
        const units: Record<string, string[]> = {
            minutes: ['minuto', 'minutos'],
            hours: ['hora', 'horas'],
            days: ['dia', 'dias'],
            weeks: ['semana', 'semanas'],
        };
        const labels = units[unit] || [unit, unit];
        return `${value} ${value === 1 ? labels[0] : labels[1]}`;
    };

    const getTriggerLabel = (type: string) => {
        switch (type) {
            case 'manual': return 'Manual';
            case 'stage_change': return 'Mudança de Estágio';
            case 'new_lead': return 'Novo Lead';
            default: return type;
        }
    };

    // Filtragem
    const filtered = sequences
        .filter(s => {
            if (filter === 'active') return s.is_active;
            if (filter === 'inactive') return !s.is_active;
            return true;
        })
        .filter(s =>
            search === '' ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.description || '').toLowerCase().includes(search.toLowerCase())
        );

    // Métricas
    const totalActive = sequences.filter(s => s.is_active).length;
    const totalEnrolled = sequences.reduce((sum, s) => sum + (s.active_enrolled || 0), 0);
    const totalCompleted = sequences.reduce((sum, s) => sum + (s.completed_enrolled || 0), 0);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-border/50 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-green-50">
                            <Zap className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ativas</span>
                    </div>
                    <p className="text-2xl font-black text-[#404F4F]">{totalActive}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">sequências em execução</p>
                </div>
                <div className="bg-white rounded-2xl border border-border/50 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-blue-50">
                            <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Leads Ativos</span>
                    </div>
                    <p className="text-2xl font-black text-[#404F4F]">{totalEnrolled}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">recebendo follow-up</p>
                </div>
                <div className="bg-white rounded-2xl border border-border/50 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-purple-50">
                            <CheckCircle2 className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Concluídos</span>
                    </div>
                    <p className="text-2xl font-black text-[#404F4F]">{totalCompleted}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">sequências finalizadas</p>
                </div>
            </div>

            {/* Barra de Ações */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar sequências..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-icon/20 focus:border-accent-icon transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {(['all', 'active', 'inactive'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                filter === f
                                    ? 'bg-[#404F4F] text-white shadow-sm'
                                    : 'bg-white border border-border text-muted-foreground hover:bg-gray-50'
                            }`}
                        >
                            {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Inativas'}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleNewSequence}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#404F4F] text-white rounded-xl text-sm font-bold hover:bg-[#2d3939] transition-all shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Nova Sequência
                </button>
            </div>

            {/* Lista de Sequências */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-[#404F4F]/30" />
                    <p className="text-sm text-muted-foreground mt-3">Carregando sequências...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-border/50">
                    <div className="p-4 rounded-2xl bg-[#404F4F]/5 mb-4">
                        <MessageSquare className="h-8 w-8 text-[#404F4F]/30" />
                    </div>
                    <p className="text-[#404F4F] font-bold text-base mb-1">
                        {search ? 'Nenhuma sequência encontrada' : 'Nenhuma sequência criada'}
                    </p>
                    <p className="text-muted-foreground text-sm mb-6">
                        {search ? 'Tente outro termo de busca.' : 'Crie sua primeira sequência de follow-up.'}
                    </p>
                    {!search && (
                        <button
                            onClick={handleNewSequence}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#404F4F] text-white rounded-xl text-sm font-bold hover:bg-[#2d3939] transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Criar Primeira Sequência
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.map(seq => (
                        <div
                            key={seq.id}
                            className={`group bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${
                                seq.is_active ? 'border-green-200/60' : 'border-border/50'
                            }`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${seq.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                        <h3 className="font-bold text-[#404F4F] text-sm truncate">{seq.name}</h3>
                                    </div>
                                    {seq.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1 ml-4">{seq.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-3">
                                    <button
                                        onClick={() => handleToggle(seq.id, seq.is_active)}
                                        title={seq.is_active ? 'Pausar' : 'Ativar'}
                                        className={`p-1.5 rounded-lg transition-all ${
                                            seq.is_active
                                                ? 'text-green-600 hover:bg-green-50'
                                                : 'text-muted-foreground hover:bg-gray-100'
                                        }`}
                                    >
                                        {seq.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(seq)}
                                        title="Editar"
                                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 transition-all"
                                    >
                                        <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(seq.id, seq.name)}
                                        title="Excluir"
                                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Métricas inline */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                                    <p className="text-xs font-black text-[#404F4F]">{seq.total_steps || 0}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Etapas</p>
                                </div>
                                <div className="bg-blue-50/50 rounded-xl px-3 py-2 text-center">
                                    <p className="text-xs font-black text-blue-700">{seq.active_enrolled || 0}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Ativos</p>
                                </div>
                                <div className="bg-purple-50/50 rounded-xl px-3 py-2 text-center">
                                    <p className="text-xs font-black text-purple-700">{seq.completed_enrolled || 0}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Concluídos</p>
                                </div>
                            </div>

                            {/* Meta info */}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Gatilho: {getTriggerLabel(seq.trigger_type)}
                                </span>
                                {seq.exit_on_reply && (
                                    <span className="flex items-center gap-1 text-green-600">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Sai ao responder
                                    </span>
                                )}
                            </div>

                            {/* Ações */}
                            <div className="flex items-center gap-2 pt-3 border-t border-border/30">
                                <button
                                    onClick={() => handleEnroll(seq.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#404F4F] text-white text-xs font-bold hover:bg-[#2d3939] transition-all"
                                >
                                    <Users className="h-3.5 w-3.5" />
                                    Inscrever Leads
                                </button>
                                <button
                                    onClick={() => handleViewLogs(seq.id, seq.name)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-border text-[#404F4F] text-xs font-bold hover:bg-gray-50 transition-all"
                                >
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    Histórico
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modais */}
            <FollowUpSequenceModal
                isOpen={isSequenceModalOpen}
                onClose={() => {
                    setIsSequenceModalOpen(false);
                    setEditingSequence(null);
                }}
                editingSequence={editingSequence}
                onSaved={fetchSequences}
            />

            {enrollSequenceId && (
                <FollowUpEnrollModal
                    isOpen={isEnrollModalOpen}
                    onClose={() => {
                        setIsEnrollModalOpen(false);
                        setEnrollSequenceId(null);
                    }}
                    sequenceId={enrollSequenceId}
                    onEnrolled={fetchSequences}
                />
            )}

            {logsSequenceId && (
                <FollowUpLogsModal
                    isOpen={isLogsModalOpen}
                    onClose={() => {
                        setIsLogsModalOpen(false);
                        setLogsSequenceId(null);
                    }}
                    sequenceId={logsSequenceId}
                    sequenceName={logsSequenceName}
                />
            )}
        </div>
    );
}
