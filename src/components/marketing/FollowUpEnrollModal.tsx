'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Users,
    Loader2,
    CheckCircle2,
    UserPlus,
    Phone,
    Filter,
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { toast } from 'sonner';
import {
    getLeadsForFollowup,
    enrollMultipleLeads,
} from '@/app/_actions/followup';

interface FollowUpEnrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    sequenceId: string;
    onEnrolled: () => void;
}

export default function FollowUpEnrollModal({ isOpen, onClose, sequenceId, onEnrolled }: FollowUpEnrollModalProps) {
    const [leads, setLeads] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [search, setSearch] = useState('');

    const fetchLeads = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getLeadsForFollowup(sequenceId);
            if (result.success) {
                setLeads(result.data || []);
            } else {
                toast.error(result.error || 'Erro ao carregar leads.');
            }
        } catch {
            toast.error('Erro ao carregar leads.');
        } finally {
            setIsLoading(false);
        }
    }, [sequenceId]);

    useEffect(() => {
        if (isOpen) {
            fetchLeads();
            setSelectedIds(new Set());
            setSearch('');
        }
    }, [isOpen, fetchLeads]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const availableLeads = filteredLeads.filter(l => !l.already_enrolled);
        if (selectedIds.size === availableLeads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(availableLeads.map(l => l.id)));
        }
    };

    const handleEnroll = async () => {
        if (selectedIds.size === 0) {
            toast.error('Selecione pelo menos um lead.');
            return;
        }

        setIsEnrolling(true);
        try {
            const result = await enrollMultipleLeads(Array.from(selectedIds), sequenceId);
            if (result.success) {
                toast.success(`${result.enrolled} lead(s) inscrito(s)!${result.skipped ? ` ${result.skipped} já estavam inscritos.` : ''}`);
                onEnrolled();
                onClose();
            } else {
                toast.error(result.error || 'Erro ao inscrever leads.');
            }
        } catch {
            toast.error('Erro ao inscrever leads.');
        } finally {
            setIsEnrolling(false);
        }
    };

    const filteredLeads = leads.filter(l =>
        search === '' ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search)
    );

    const availableCount = filteredLeads.filter(l => !l.already_enrolled).length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Inscrever Leads na Sequência"
            size="lg"
        >
            <div className="space-y-4">
                {/* Busca */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-icon/20 focus:border-accent-icon transition-all"
                    />
                </div>

                {/* Barra de ações */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSelectAll}
                            className="text-xs font-bold text-[#404F4F] hover:underline"
                        >
                            {selectedIds.size === availableCount && availableCount > 0
                                ? 'Desmarcar todos'
                                : 'Selecionar todos'}
                        </button>
                        <span className="text-xs text-muted-foreground">
                            {selectedIds.size} selecionado(s) de {availableCount} disponível(eis)
                        </span>
                    </div>
                </div>

                {/* Lista de Leads */}
                <div className="max-h-[400px] overflow-y-auto no-scrollbar space-y-1.5 rounded-xl border border-border/50 p-2 bg-gray-50/50">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-[#404F4F]/30" />
                            <p className="text-xs text-muted-foreground mt-2">Carregando leads...</p>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Users className="h-6 w-6 text-muted-foreground/30" />
                            <p className="text-xs text-muted-foreground mt-2">Nenhum lead encontrado.</p>
                        </div>
                    ) : (
                        filteredLeads.map(lead => (
                            <div
                                key={lead.id}
                                onClick={() => !lead.already_enrolled && toggleSelect(lead.id)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${lead.already_enrolled
                                        ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                        : selectedIds.has(lead.id)
                                            ? 'bg-[#404F4F]/5 border border-[#404F4F]/20'
                                            : 'bg-white border border-transparent hover:border-border/50 hover:shadow-sm'
                                    }`}
                            >
                                {/* Checkbox */}
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${lead.already_enrolled
                                        ? 'border-gray-300 bg-gray-200'
                                        : selectedIds.has(lead.id)
                                            ? 'border-[#404F4F] bg-[#404F4F]'
                                            : 'border-border'
                                    }`}>
                                    {(selectedIds.has(lead.id) || lead.already_enrolled) && (
                                        <CheckCircle2 className={`h-3 w-3 ${lead.already_enrolled ? 'text-gray-400' : 'text-white'}`} />
                                    )}
                                </div>

                                {/* Info do Lead */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-[#404F4F] truncate">{lead.name}</p>
                                        {lead.stage_name && (
                                            <span
                                                className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: (lead.stage_color || '#6B7280') + '15',
                                                    color: lead.stage_color || '#6B7280',
                                                }}
                                            >
                                                {lead.stage_name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">{lead.phone}</span>
                                    </div>
                                </div>

                                {/* Status */}
                                {lead.already_enrolled && (
                                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase tracking-wider shrink-0">
                                        Já inscrito
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Botão de Inscrição */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/30">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-gray-50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleEnroll}
                        disabled={isEnrolling || selectedIds.size === 0}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFE600] text-[#404F4F] text-sm font-bold hover:bg-[#FFE600]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isEnrolling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <UserPlus className="h-4 w-4" />
                        )}
                        Inscrever {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
