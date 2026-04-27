'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Clock,
    MessageSquare,
    Image as ImageIcon,
    Video,
    FileText,
    Save,
    Loader2,
    ArrowDown,
    Info,
    X,
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
    createFollowupSequence,
    updateFollowupSequence,
    getFollowupSequence,
} from '@/app/_actions/followup';

interface FollowUpSequenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingSequence?: any;
    onSaved: () => void;
}

interface StepForm {
    id: string;
    delay_value: number;
    delay_unit: 'minutes' | 'hours' | 'days' | 'weeks';
    message_template: string;
    media_url?: string;
    media_type?: 'image' | 'video' | 'document';
    media_name?: string;
}

const DELAY_UNITS = [
    { value: 'minutes', label: 'Minutos' },
    { value: 'hours', label: 'Horas' },
    { value: 'days', label: 'Dias' },
    { value: 'weeks', label: 'Semanas' },
];

const TRIGGER_TYPES = [
    { value: 'manual', label: 'Manual', description: 'Inscreva leads manualmente' },
    { value: 'stage_change', label: 'Mudança de Estágio', description: 'Quando lead muda de estágio' },
    { value: 'new_lead', label: 'Novo Lead', description: 'Quando um novo lead é criado' },
];

const VARIABLES = [
    { key: '{nome}', label: 'Nome completo' },
    { key: '{primeiro_nome}', label: 'Primeiro nome' },
    { key: '{imovel}', label: 'Imóvel de interesse' },
    { key: '{corretor}', label: 'Nome do corretor' },
];

export default function FollowUpSequenceModal({ isOpen, onClose, editingSequence, onSaved }: FollowUpSequenceModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [triggerType, setTriggerType] = useState<'manual' | 'stage_change' | 'new_lead'>('manual');
    const [exitOnReply, setExitOnReply] = useState(true);
    const [steps, setSteps] = useState<StepForm[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);
    const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const activeStepRef = useRef<string | null>(null);

    useEffect(() => {
        if (editingSequence && isOpen) {
            setIsLoadingEdit(true);
            getFollowupSequence(editingSequence.id).then(result => {
                if (result.success && result.data) {
                    const seq = result.data;
                    setName(seq.name);
                    setDescription(seq.description || '');
                    setTriggerType(seq.trigger_type);
                    setExitOnReply(seq.exit_on_reply);
                    setSteps(
                        (seq.followup_steps || []).map((s: any) => ({
                            id: s.id,
                            delay_value: s.delay_value,
                            delay_unit: s.delay_unit,
                            message_template: s.message_template,
                            media_url: s.media_url || undefined,
                            media_type: s.media_type || undefined,
                            media_name: s.media_url ? s.media_url.split('/').pop() : undefined,
                        }))
                    );
                }
                setIsLoadingEdit(false);
            });
        } else if (isOpen && !editingSequence) {
            setName('');
            setDescription('');
            setTriggerType('manual');
            setExitOnReply(true);
            setSteps([{ id: `step_${Date.now()}`, delay_value: 1, delay_unit: 'hours', message_template: '' }]);
        }
    }, [editingSequence, isOpen]);

    const addStep = () => {
        setSteps(prev => [...prev, {
            id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            delay_value: 1, delay_unit: 'days', message_template: '',
        }]);
    };

    const removeStep = (id: string) => {
        if (steps.length <= 1) { toast.error('A sequência precisa de pelo menos 1 etapa.'); return; }
        setSteps(prev => prev.filter(s => s.id !== id));
    };

    const updateStep = (id: string, field: keyof StepForm, value: any) => {
        setSteps(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
    };

    const insertVariable = (stepId: string, variable: string) => {
        setSteps(prev => prev.map(s => s.id !== stepId ? s : { ...s, message_template: s.message_template + variable }));
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newSteps.length) return;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        setSteps(newSteps);
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const stepId = activeStepRef.current;
        if (!file || !stepId) return;

        setUploadingStepId(stepId);
        try {
            const supabase = createClient();
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `followup-media/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('crm-attachments').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('crm-attachments').getPublicUrl(filePath);

            let type: 'image' | 'video' | 'document' = 'document';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';

            updateStep(stepId, 'media_url', publicUrl);
            updateStep(stepId, 'media_type', type);
            updateStep(stepId, 'media_name', file.name);
            toast.success('Mídia anexada!');
        } catch (error: any) {
            toast.error('Erro no upload: ' + error.message);
        } finally {
            setUploadingStepId(null);
            if (mediaInputRef.current) mediaInputRef.current.value = '';
        }
    };

    const removeMedia = (stepId: string) => {
        updateStep(stepId, 'media_url', undefined);
        updateStep(stepId, 'media_type', undefined);
        updateStep(stepId, 'media_name', undefined);
    };

    const triggerMediaSelect = (stepId: string) => {
        activeStepRef.current = stepId;
        mediaInputRef.current?.click();
    };

    const handleSave = async () => {
        if (!name.trim()) { toast.error('Informe o nome da sequência.'); return; }
        const emptySteps = steps.filter(s => !s.message_template.trim());
        if (emptySteps.length > 0) { toast.error('Todas as etapas precisam ter uma mensagem.'); return; }

        setIsSaving(true);
        try {
            const payload = {
                name: name.trim(),
                description: description.trim() || undefined,
                trigger_type: triggerType,
                exit_on_reply: exitOnReply,
                steps: steps.map((s, i) => ({
                    order_index: i, delay_value: s.delay_value, delay_unit: s.delay_unit,
                    message_template: s.message_template,
                    media_url: s.media_url, media_type: s.media_type,
                })),
            };

            const result = editingSequence
                ? await updateFollowupSequence(editingSequence.id, payload)
                : await createFollowupSequence(payload);

            if (result.success) {
                toast.success(editingSequence ? 'Sequência atualizada!' : 'Sequência criada!');
                onSaved(); onClose();
            } else { toast.error(result.error || 'Erro ao salvar.'); }
        } catch { toast.error('Erro ao salvar sequência.'); }
        finally { setIsSaving(false); }
    };

    const getDelayPreview = (step: StepForm, index: number) => {
        const unitLabels: Record<string, string[]> = {
            minutes: ['minuto', 'minutos'], hours: ['hora', 'horas'],
            days: ['dia', 'dias'], weeks: ['semana', 'semanas'],
        };
        const labels = unitLabels[step.delay_unit] || [step.delay_unit, step.delay_unit];
        const label = step.delay_value === 1 ? labels[0] : labels[1];
        return index === 0 ? `Enviar após ${step.delay_value} ${label} da inscrição` : `Aguardar ${step.delay_value} ${label} após etapa anterior`;
    };

    const getMediaIcon = (type?: string) => {
        switch (type) {
            case 'image': return <ImageIcon className="h-4 w-4 text-green-600" />;
            case 'video': return <Video className="h-4 w-4 text-blue-600" />;
            default: return <FileText className="h-4 w-4 text-orange-600" />;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingSequence ? 'Editar Sequência' : 'Nova Sequência de Follow-Up'} size="xl">
            {/* Input de arquivo oculto */}
            <input type="file" ref={mediaInputRef} className="hidden" onChange={handleMediaUpload}
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx" />

            {isLoadingEdit ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-[#404F4F]/30" />
                    <p className="text-sm text-muted-foreground mt-3">Carregando...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Informações Básicas */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-[#404F4F] mb-1.5">Nome da Sequência *</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)}
                                placeholder="Ex: Boas-vindas, Reaquecimento, Pós-visita..."
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-icon/20 focus:border-accent-icon transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#404F4F] mb-1.5">Descrição (opcional)</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                                placeholder="Breve descrição da finalidade da sequência..."
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-icon/20 focus:border-accent-icon transition-all" />
                        </div>
                    </div>

                    {/* Configurações */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Tipo de Gatilho</label>
                            <select value={triggerType} onChange={e => setTriggerType(e.target.value as any)}
                                className="w-full h-10 px-3 text-xs font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#404F4F]/40 focus:ring-2 focus:ring-ring/50">
                                {TRIGGER_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                            </select>
                            <p className="text-[10px] text-muted-foreground mt-1">{TRIGGER_TYPES.find(t => t.value === triggerType)?.description}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Saída Automática</label>
                            <label className="flex items-center gap-3 h-10 px-4 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-all">
                                <input type="checkbox" checked={exitOnReply} onChange={e => setExitOnReply(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-[#404F4F] focus:ring-[#404F4F]" />
                                <span className="text-xs font-bold text-[#404F4F]">Remover lead ao responder</span>
                            </label>
                            <p className="text-[10px] text-muted-foreground mt-1">Lead passa para atendimento humano ao responder.</p>
                        </div>
                    </div>

                    {/* Builder de Etapas */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-[#404F4F] flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-[#404F4F]/40" />
                                Etapas da Sequência
                            </h3>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                {steps.length} {steps.length === 1 ? 'etapa' : 'etapas'}
                            </span>
                        </div>

                        {/* Variáveis disponíveis */}
                        <div className="flex flex-wrap items-center gap-1.5 bg-blue-50/50 rounded-xl px-3 py-2">
                            <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mr-1">Variáveis:</span>
                            {VARIABLES.map(v => (
                                <span key={v.key} className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-bold" title={v.label}>{v.key}</span>
                            ))}
                        </div>

                        {/* Lista de Etapas */}
                        <div className="space-y-3">
                            {steps.map((step, index) => (
                                <div key={step.id} className="relative">
                                    {index > 0 && (
                                        <div className="flex items-center justify-center py-1">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <div className="w-px h-3 bg-border" />
                                                <ArrowDown className="h-3 w-3" />
                                                <div className="w-px h-3 bg-border" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-gray-50 rounded-2xl border border-border/50 p-4 space-y-3 hover:border-[#404F4F]/20 transition-all">
                                        {/* Header da etapa */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-[#404F4F] text-white flex items-center justify-center text-[10px] font-black">{index + 1}</div>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{getDelayPreview(step, index)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {index > 0 && <button onClick={() => moveStep(index, 'up')} className="p-1 rounded-md text-muted-foreground hover:bg-white transition-all text-xs" title="Mover para cima">↑</button>}
                                                {index < steps.length - 1 && <button onClick={() => moveStep(index, 'down')} className="p-1 rounded-md text-muted-foreground hover:bg-white transition-all text-xs" title="Mover para baixo">↓</button>}
                                                <button onClick={() => removeStep(step.id)} className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all" title="Remover etapa"><Trash2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </div>

                                        {/* Delay */}
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-xs text-muted-foreground shrink-0">Aguardar:</span>
                                            <input type="number" min={1} value={step.delay_value}
                                                onChange={e => updateStep(step.id, 'delay_value', Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-16 h-9 px-2 rounded-lg border border-gray-200 bg-white text-sm text-center focus:outline-none focus:border-[#404F4F]/40 focus:ring-2 focus:ring-ring/50" />
                                            <select value={step.delay_unit} onChange={e => updateStep(step.id, 'delay_unit', e.target.value)}
                                                className="h-9 px-2 rounded-lg border border-gray-200 bg-white text-xs font-bold focus:outline-none focus:border-[#404F4F]/40 focus:ring-2 focus:ring-ring/50">
                                                {DELAY_UNITS.map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}
                                            </select>
                                        </div>

                                        {/* Mensagem */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10px] font-bold text-[#404F4F] uppercase tracking-wider">Mensagem</label>
                                                <div className="flex gap-1">
                                                    {VARIABLES.map(v => (
                                                        <button key={v.key} onClick={() => insertVariable(step.id, v.key)}
                                                            className="px-1.5 py-0.5 rounded-md bg-white border border-border text-[9px] font-bold text-muted-foreground hover:text-[#404F4F] hover:border-[#404F4F]/30 transition-all"
                                                            title={`Inserir ${v.label}`}>{v.key}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <textarea value={step.message_template}
                                                onChange={e => updateStep(step.id, 'message_template', e.target.value)}
                                                placeholder={`Ex: Olá {primeiro_nome}, tudo bem? Passando para saber se tem alguma dúvida sobre o ${index === 0 ? 'imóvel que conversamos.' : 'nosso último contato.'}`}
                                                rows={3}
                                                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-icon/20 focus:border-accent-icon transition-all" />
                                            <p className="text-[9px] text-muted-foreground mt-0.5 text-right">{step.message_template.length} caracteres</p>
                                        </div>

                                        {/* Mídia/Documento */}
                                        <div>
                                            <label className="text-[10px] font-bold text-[#404F4F] uppercase tracking-wider mb-1.5 block">Mídia ou Documento (opcional)</label>
                                            {step.media_url ? (
                                                <div className="relative group">
                                                    {step.media_type === 'image' ? (
                                                        <div className="relative h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                                            <img src={step.media_url} alt="Preview" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <p className="text-white text-[10px] font-bold">{step.media_name}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3 p-3 bg-[#404F4F]/5 rounded-xl border border-dashed border-[#404F4F]/20">
                                                            <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center border border-[#404F4F]/10">
                                                                {getMediaIcon(step.media_type)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-[#404F4F] truncate">{step.media_name}</p>
                                                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{step.media_type === 'video' ? 'Vídeo' : 'Documento'}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button onClick={() => removeMedia(step.id)}
                                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all hover:scale-110 z-10">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => triggerMediaSelect(step.id)} disabled={uploadingStepId === step.id}
                                                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-accent-icon hover:bg-accent-icon/5 transition-all text-gray-500 hover:text-[#404F4F]">
                                                    {uploadingStepId === step.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-[#404F4F]" />
                                                    ) : (
                                                        <>
                                                            <ImageIcon className="h-4 w-4" />
                                                            <span className="text-[10px] font-bold">Adicionar Foto, Vídeo ou PDF</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={addStep}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground text-xs font-bold hover:border-[#404F4F]/30 hover:text-[#404F4F] transition-all">
                            <Plus className="h-4 w-4" /> Adicionar Etapa
                        </button>
                    </div>

                    {/* Botões */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
                        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-gray-50 transition-all">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFE600] text-[#404F4F] text-sm font-bold hover:bg-[#FFE600]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {editingSequence ? 'Salvar Alterações' : 'Criar Sequência'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
